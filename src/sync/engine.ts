// The sync engine (phase 09a): push this device's pending changes, pull everyone else's, apply them
// with last write wins (src/core/sync.ts). DOM-free; the UI wires timers and online events.
import type { SyncItem } from '../core/sync';
import type { SyncStore } from '../storage/types';

export interface SyncRequest {
  deviceId: string;
  since: number;
  changes: SyncItem[];
}

export interface SyncResponse {
  items: SyncItem[];
  cursor: number;
  more: boolean;
}

/** Transport to the server (src/sync/http-client.ts in the app, a fake in tests). */
export interface SyncClient {
  sync(request: SyncRequest): Promise<SyncResponse>;
}

export type SyncErrorKind = 'offline' | 'signed-out' | 'unavailable' | 'failed';

export class SyncError extends Error {
  readonly kind: SyncErrorKind;

  constructor(kind: SyncErrorKind, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SyncError';
    this.kind = kind;
  }
}

export type SyncStatus =
  | { state: 'idle' }
  | { state: 'syncing' }
  | { state: 'synced'; at: number }
  | { state: 'offline' }
  | { state: 'signed-out' }
  | { state: 'unavailable' }
  | { state: 'failed' };

export interface SyncEngineOptions {
  onStatus?(status: SyncStatus): void;
  /** Called with the ids of books whose data changed because of another device. */
  onRemoteChanges?(bookIds: Set<string>): void;
  now?(): number;
  /** Changes sent per request (the server accepts up to 500). */
  batchSize?: number;
}

/** Stops a misbehaving server from keeping one sync running forever. */
const MAX_ROUNDS = 50;

export class SyncEngine {
  readonly #store: SyncStore;
  readonly #client: SyncClient;
  readonly #options: SyncEngineOptions;
  #running: Promise<void> | undefined;
  #again = false;
  #timer: ReturnType<typeof setTimeout> | undefined;

  constructor(store: SyncStore, client: SyncClient, options: SyncEngineOptions = {}) {
    this.#store = store;
    this.#client = client;
    this.#options = options;
  }

  /** Syncs now. If a sync is already running, one more runs right after it. */
  syncNow(): Promise<void> {
    if (this.#running) {
      this.#again = true;
      return this.#running;
    }
    this.#running = (async () => {
      do {
        this.#again = false;
        await this.#once();
      } while (this.#again);
    })().finally(() => {
      this.#running = undefined;
    });
    return this.#running;
  }

  /** Syncs after `delayMs` without further calls (debounce for bursts of local edits). */
  schedule(delayMs = 2000): void {
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => void this.syncNow(), delayMs);
  }

  dispose(): void {
    clearTimeout(this.#timer);
  }

  #status(status: SyncStatus): void {
    this.#options.onStatus?.(status);
  }

  async #once(): Promise<void> {
    this.#status({ state: 'syncing' });
    try {
      const deviceId = await this.#store.deviceId();
      const batchSize = this.#options.batchSize ?? 500;
      for (let round = 0; round < MAX_ROUNDS; round++) {
        const pending = await this.#store.pending();
        const batch = pending.slice(0, batchSize);
        const since = await this.#store.cursor();
        const response = await this.#client.sync({ deviceId, since, changes: batch });
        const { applied } = await this.#store.applyRemote(response.items);
        if (applied > 0) {
          this.#options.onRemoteChanges?.(new Set(response.items.map((item) => item.bookId)));
        }
        await this.#store.markSynced(batch);
        await this.#store.setCursor(response.cursor);
        if (!response.more && pending.length <= batchSize) break;
      }
      this.#status({ state: 'synced', at: (this.#options.now ?? Date.now)() });
    } catch (error) {
      if (error instanceof SyncError) {
        if (error.kind === 'failed') console.error('Sync failed', error);
        this.#status({ state: error.kind });
      } else {
        console.error('Sync failed', error);
        this.#status({ state: 'failed' });
      }
    }
  }
}
