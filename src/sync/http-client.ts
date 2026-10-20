// The only place the app calls the network (lint enforces this): the sync API and, since phase
// 09b, the files API.
import { SyncError, type SyncClient, type SyncResponse } from './engine';
import { FileError, type FileClient } from './file-client';

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
      if (isSignedOut(response)) throw new SyncError('signed-out', 'Sign in again to sync');
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

function isSignedOut(response: Response): boolean {
  return (
    response.type === 'opaqueredirect' ||
    (response.status >= 300 && response.status < 400) ||
    response.status === 401 ||
    response.status === 403
  );
}

/** The `error` code the files API puts in its JSON replies, if any. */
async function errorCode(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    const code = (body as { error?: unknown } | null)?.error;
    return typeof code === 'string' ? code : undefined;
  } catch {
    return undefined;
  }
}

async function fileErrorFor(response: Response): Promise<FileError> {
  if (isSignedOut(response)) return new FileError('signed-out', 'Sign in again to sync');
  const code = await errorCode(response);
  switch (response.status) {
    case 404:
      if (code === 'not-uploaded') return new FileError('not-uploaded', 'Not in the cloud yet');
      if (code === 'no-such-upload') return new FileError('no-such-upload', 'Upload expired');
      return new FileError('unavailable', 'The cloud for books is not set up on this server');
    case 405:
    case 503:
      return new FileError('unavailable', 'The cloud for books is not set up on this server');
    case 409:
      return new FileError('not-synced', 'The book has not synced yet');
    case 410:
      return new FileError('deleted', 'The book was deleted');
    case 507:
      return new FileError('storage-full', 'Cloud storage is full');
    default:
      return new FileError('failed', `Request failed (${response.status})`);
  }
}

export function httpFileClient(options: HttpSyncClientOptions = {}): FileClient {
  const doFetch = options.fetch ?? ((input, init) => fetch(input, init));
  const isOnline = options.isOnline ?? (() => navigator.onLine);
  const base = options.url ?? '/api/files';

  async function send(path: string, init: RequestInit): Promise<Response> {
    if (!isOnline()) throw new FileError('offline', 'The device is offline');
    let response: Response;
    try {
      response = await doFetch(`${base}/${path}`, {
        credentials: 'same-origin',
        redirect: 'manual',
        ...init,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new FileError('offline', 'The cloud could not be reached', { cause: error });
    }
    if (!response.ok) throw await fileErrorFor(response);
    return response;
  }

  async function sendJson(path: string, init: RequestInit): Promise<Record<string, unknown>> {
    const response = await send(path, init);
    try {
      const body: unknown = await response.json();
      if (typeof body === 'object' && body !== null) return body as Record<string, unknown>;
    } catch (error) {
      throw new FileError('failed', 'The cloud sent an unreadable reply', { cause: error });
    }
    throw new FileError('failed', 'The cloud sent an unexpected reply');
  }

  const post = (body: unknown): RequestInit => ({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const uploadPath = (bookId: string, uploadId: string) =>
    `${bookId}/uploads/${encodeURIComponent(uploadId)}`;

  return {
    async startUpload(bookId, size) {
      const body = await sendJson(`${bookId}/uploads`, post({ size }));
      if (body.done === true) return { done: true };
      if (typeof body.uploadId === 'string' && typeof body.partSize === 'number') {
        return { uploadId: body.uploadId, partSize: body.partSize };
      }
      throw new FileError('failed', 'The cloud sent an unexpected reply');
    },

    async uploadPart(bookId, uploadId, partNumber, bytes) {
      const body = await sendJson(`${uploadPath(bookId, uploadId)}/${partNumber}`, {
        method: 'PUT',
        body: bytes as Uint8Array<ArrayBuffer>,
      });
      if (body.partNumber !== partNumber || typeof body.etag !== 'string') {
        throw new FileError('failed', 'The cloud sent an unexpected reply');
      }
      return { partNumber, etag: body.etag };
    },

    async completeUpload(bookId, uploadId, parts) {
      await sendJson(`${uploadPath(bookId, uploadId)}/complete`, post({ parts }));
    },

    async downloadRange(bookId, offset, length, signal) {
      const end = offset + length - 1;
      const response = await send(bookId, {
        method: 'GET',
        headers: { range: `bytes=${offset}-${end}` },
        signal,
      });
      const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.headers.get('content-range') ?? '');
      const bytes = new Uint8Array(await response.arrayBuffer());
      const total = Number(match?.[3]);
      if (
        response.status !== 206 ||
        !match ||
        Number(match[1]) !== offset ||
        bytes.length !== Number(match[2]) - offset + 1 ||
        (bytes.length !== length && Number(match[2]) !== total - 1)
      ) {
        throw new FileError('failed', 'The cloud sent a different part of the file');
      }
      return { bytes, total };
    },
  };
}
