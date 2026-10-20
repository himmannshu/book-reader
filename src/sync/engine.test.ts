// @vitest-environment node
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it, vi } from 'vitest';
import type { Bookmark } from '../core/bookmarks';
import type { SyncItem } from '../core/sync';
import { createIndexedDBStores } from '../storage/indexeddb-book-store';
import {
  SyncEngine,
  SyncError,
  type SyncClient,
  type SyncRequest,
  type SyncResponse,
  type SyncStatus,
} from './engine';

/** An in-memory server with the same rules as functions/_lib/store.ts. */
function fakeServer() {
  const rows = new Map<string, SyncItem & { seq: number }>();
  let seq = 0;
  const requests: SyncRequest[] = [];
  const client: SyncClient = {
    async sync(req) {
      requests.push(req);
      for (const change of req.changes) {
        const key = `${change.kind}:${change.id}`;
        const stored = rows.get(key);
        const later =
          !stored ||
          change.updatedAt > stored.updatedAt ||
          (change.updatedAt === stored.updatedAt && change.device > stored.device);
        if (later) rows.set(key, { ...change, seq: ++seq });
      }
      const items = [...rows.values()]
        .filter((row) => row.seq > req.since)
        .sort((a, b) => a.seq - b.seq);
      const cursor = items.at(-1)?.seq ?? req.since;
      const response: SyncResponse = {
        items: items
          .filter((row) => row.device !== req.deviceId)
          .map((row) => ({
            kind: row.kind,
            id: row.id,
            bookId: row.bookId,
            updatedAt: row.updatedAt,
            deleted: row.deleted,
            device: row.device,
            data: row.data,
          })),
        cursor,
        more: false,
      };
      return response;
    },
  };
  return { client, requests };
}

function device(
  server: SyncClient,
  onStatus: (s: SyncStatus) => void = () => {},
  startClock = 1_000,
) {
  let clock = startClock;
  const stores = createIndexedDBStores({
    factory: new IDBFactory(),
    now: () => (clock += 10),
    requestPersistence: async () => true,
  });
  const changed = vi.fn();
  const engine = new SyncEngine(stores.sync, server, {
    onStatus,
    onRemoteChanges: changed,
    now: () => clock,
  });
  return { ...stores, engine, changed };
}

const pdf = new Blob(['%PDF-1.7 same book']);
const mark = (bookId: string, label = 'Page 4'): Bookmark => ({
  id: `${bookId}:3`,
  bookId,
  pageIndex: 3,
  label,
  createdAt: 1,
});

describe('SyncEngine', () => {
  it('moves a bookmark from device A to device B, which has the same book', async () => {
    const { client } = fakeServer();
    const a = device(client);
    const b = device(client);
    const book = await a.books.add(pdf, 'same.pdf');
    await b.books.add(pdf, 'same.pdf');
    await a.bookmarks.put(mark(book.id));

    await a.engine.syncNow();
    await b.engine.syncNow();

    expect(await b.bookmarks.list(book.id)).toEqual([mark(book.id)]);
    expect(b.changed).toHaveBeenCalledWith(new Set([book.id]));
    expect(await a.sync.pending()).toEqual([]);
  });

  it('lists a book added on A as a book without its file on B', async () => {
    const { client } = fakeServer();
    const a = device(client);
    const b = device(client);
    const book = await a.books.add(pdf, 'only-on-a.pdf');
    await a.engine.syncNow();
    await b.engine.syncNow();
    expect(await b.books.list()).toMatchObject([
      { id: book.id, title: 'only-on-a', hasFile: false },
    ]);
  });

  it('a deletion on A reaches B and is not undone by B later', async () => {
    const { client } = fakeServer();
    const a = device(client);
    const b = device(client);
    const book = await a.books.add(pdf, 'x.pdf');
    await b.books.add(pdf, 'x.pdf');
    await a.bookmarks.put(mark(book.id));
    await a.engine.syncNow();
    await b.engine.syncNow();

    await a.bookmarks.remove(mark(book.id).id);
    await a.engine.syncNow();
    await b.engine.syncNow();
    await b.engine.syncNow();
    await a.engine.syncNow();
    expect(await b.bookmarks.list(book.id)).toEqual([]);
    expect(await a.bookmarks.list(book.id)).toEqual([]);
  });

  it('keeps the later of two edits on both devices', async () => {
    const { client } = fakeServer();
    const a = device(client);
    // B's clock runs ahead, so its edit is genuinely later (equal stamps would tie on random ids).
    const b = device(client, () => {}, 1_000_000);
    const book = await a.books.add(pdf, 'x.pdf');
    await b.books.add(pdf, 'x.pdf');
    await a.bookmarks.put(mark(book.id, 'from A'));
    await b.bookmarks.put(mark(book.id, 'from B, later'));
    await a.engine.syncNow();
    await b.engine.syncNow();
    await a.engine.syncNow();
    expect((await a.bookmarks.list(book.id))[0]?.label).toBe('from B, later');
    expect((await b.bookmarks.list(book.id))[0]?.label).toBe('from B, later');
  });

  it('reports offline and keeps changes for later', async () => {
    const statuses: SyncStatus[] = [];
    const client: SyncClient = {
      sync: () => Promise.reject(new SyncError('offline', 'no network')),
    };
    const a = device(client, (s) => statuses.push(s));
    const book = await a.books.add(pdf, 'x.pdf');
    await a.engine.syncNow();
    expect(statuses.at(-1)).toEqual({ state: 'offline' });
    expect((await a.sync.pending()).map((i) => i.id)).toEqual([book.id]);
  });

  it('reports "signed out" and "unavailable" distinctly from a failure', async () => {
    for (const kind of ['signed-out', 'unavailable', 'failed'] as const) {
      const statuses: SyncStatus[] = [];
      const client: SyncClient = { sync: () => Promise.reject(new SyncError(kind, 'x')) };
      const a = device(client, (s) => statuses.push(s));
      await a.engine.syncNow();
      expect(statuses.at(-1)?.state).toBe(kind);
    }
  });

  it('reports synced with the time', async () => {
    const statuses: SyncStatus[] = [];
    const { client } = fakeServer();
    const a = device(client, (s) => statuses.push(s));
    await a.engine.syncNow();
    expect(statuses.map((s) => s.state)).toEqual(['syncing', 'synced']);
  });

  it('runs one sync at a time; a request made meanwhile runs once afterwards', async () => {
    const { client, requests } = fakeServer();
    const a = device(client);
    await Promise.all([a.engine.syncNow(), a.engine.syncNow(), a.engine.syncNow()]);
    expect(requests.length).toBe(2);
  });
});
