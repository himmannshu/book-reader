// The only place the app calls the sync API over the network (lint enforces this).
import { SyncError, type SyncClient, type SyncResponse } from './engine';

export interface HttpSyncClientOptions {
  fetch?: typeof fetch;
  isOnline?: () => boolean;
  url?: string;
}

function isSyncResponse(value: unknown): value is SyncResponse {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return Array.isArray(r.items) && typeof r.cursor === 'number' && typeof r.more === 'boolean';
}

export function httpSyncClient(options: HttpSyncClientOptions = {}): SyncClient {
  const doFetch = options.fetch ?? ((input, init) => fetch(input, init));
  const isOnline = options.isOnline ?? (() => navigator.onLine);
  const url = options.url ?? '/api/sync';

  return {
    async sync(request) {
      if (!isOnline()) throw new SyncError('offline', 'The device is offline');
      let response: Response;
      try {
        response = await doFetch(url, {
          method: 'POST',
          credentials: 'same-origin',
          // Cloudflare Access answers an expired session with a redirect to its login page; seeing
          // it (instead of following it) is how we know to ask the reader to sign in again.
          redirect: 'manual',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(request),
        });
      } catch (error) {
        throw new SyncError('offline', 'The sync server could not be reached', { cause: error });
      }
      if (
        response.type === 'opaqueredirect' ||
        (response.status >= 300 && response.status < 400) ||
        response.status === 401 ||
        response.status === 403
      ) {
        throw new SyncError('signed-out', 'Sign in again to sync');
      }
      if (response.status === 404 || response.status === 405) {
        throw new SyncError('unavailable', 'Sync is not set up on this server');
      }
      if (!response.ok) throw new SyncError('failed', `Sync failed (${response.status})`);
      let body: unknown;
      try {
        body = await response.json();
      } catch (error) {
        throw new SyncError('failed', 'The sync server sent an unreadable reply', { cause: error });
      }
      if (!isSyncResponse(body))
        throw new SyncError('failed', 'The sync server sent an unexpected reply');
      return body;
    },
  };
}
