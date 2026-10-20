import { useEffect, useMemo, useState } from 'react';
import { SyncEngine, type SyncClient, type SyncStatus } from '../sync/engine';
import type { SyncStore } from '../storage/types';

export interface SyncSetup {
  store: SyncStore;
  client: SyncClient;
}

/**
 * Runs the sync engine for the app: on start, when the device comes back online, and when the app
 * becomes visible again. `null` turns sync off (unit tests, browsers without IndexedDB).
 */
export function useSync(setup: SyncSetup | null, onRemoteChanges: (bookIds: Set<string>) => void) {
  const [status, setStatus] = useState<SyncStatus>({ state: 'idle' });
  // Pass a stable `onRemoteChanges` (useCallback); a new one creates a new engine.
  const engine = useMemo(
    () =>
      setup
        ? new SyncEngine(setup.store, setup.client, { onStatus: setStatus, onRemoteChanges })
        : null,
    [setup, onRemoteChanges],
  );

  useEffect(() => {
    if (!engine) return;
    const syncNow = () => void engine.syncNow();
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncNow();
    };
    syncNow();
    window.addEventListener('online', syncNow);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', syncNow);
      document.removeEventListener('visibilitychange', onVisible);
      engine.dispose();
    };
  }, [engine]);

  return { status: engine ? status : ({ state: 'unavailable' } as const), engine };
}
