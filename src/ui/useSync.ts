import { useEffect, useMemo, useState } from 'react';
import { SyncEngine, type SyncClient, type SyncStatus } from '../sync/engine';
import type { FileClient } from '../sync/file-client';
import { Uploader, type UploadStatus } from '../sync/uploader';
import type { BookStore, FileTransferStore, SyncStore } from '../storage/types';

export interface SyncSetup {
  store: SyncStore;
  client: SyncClient;
  /** Book files in the cloud (phase 09b); absent where only the library and annotations sync. */
  files?: {
    store: FileTransferStore;
    books: Pick<BookStore, 'getBytes'>;
    client: FileClient;
  };
}

/**
 * Runs the sync engine for the app: on start, when the device comes back online, and when the app
 * becomes visible again. After each successful sync, uploads book files the cloud doesn't have.
 * `null` turns sync off (unit tests, browsers without IndexedDB).
 */
export function useSync(setup: SyncSetup | null, onRemoteChanges: (bookIds: Set<string>) => void) {
  const [status, setStatus] = useState<SyncStatus>({ state: 'idle' });
  const [uploads, setUploads] = useState<UploadStatus>({ state: 'idle' });
  // Pass a stable `onRemoteChanges` (useCallback); a new one creates a new engine.
  const { engine, uploader } = useMemo(() => {
    if (!setup) return { engine: null, uploader: null };
    const files = setup.files;
    const uploader = files
      ? new Uploader(files.books, files.store, files.client, { onStatus: setUploads })
      : null;
    const engine = new SyncEngine(setup.store, setup.client, {
      onStatus: (next) => {
        setStatus(next);
        // The server now knows every local book, so their files can follow.
        if (next.state === 'synced') void uploader?.run();
      },
      onRemoteChanges,
    });
    return { engine, uploader };
  }, [setup, onRemoteChanges]);

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

  return {
    status: engine ? status : ({ state: 'unavailable' } as const),
    uploads: uploader ? uploads : ({ state: 'idle' } as const),
    engine,
    canDownload: Boolean(setup?.files),
  };
}
