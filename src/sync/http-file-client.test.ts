import { describe, expect, it, vi } from 'vitest';
import { FileError } from './file-client';
import { httpFileClient } from './http-client';

const BOOK = 'a'.repeat(64);

function client(response: (url: string, init: RequestInit) => Promise<Response>, online = true) {
  const fetchFn = vi.fn(response);
  return {
    files: httpFileClient({ fetch: fetchFn as typeof fetch, isOnline: () => online }),
    fetchFn,
  };
}

async function kind(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return 'ok';
  } catch (error) {
    return error instanceof FileError ? error.kind : `other:${String(error)}`;
  }
}

const status =
  (code: number, body: unknown = {}) =>
  async () =>
    Response.json(body, { status: code });

describe('httpFileClient', () => {
  it('starts an upload with the size, and reports an already stored file', async () => {
    const { files, fetchFn } = client(async () => Response.json({ uploadId: 'u1', partSize: 8 }));
    expect(await files.startUpload(BOOK, 123)).toEqual({ uploadId: 'u1', partSize: 8 });
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/files/${BOOK}/uploads`);
    expect(init).toMatchObject({ method: 'POST', credentials: 'same-origin', redirect: 'manual' });
    expect(JSON.parse(String(init.body))).toEqual({ size: 123 });

    expect(
      await client(async () => Response.json({ done: true })).files.startUpload(BOOK, 1),
    ).toEqual({
      done: true,
    });
  });

  it('sends each part as bytes and completes with the list of parts', async () => {
    const { files, fetchFn } = client(async (url) =>
      url.endsWith('/complete')
        ? Response.json({ size: 3 })
        : Response.json({ partNumber: 2, etag: 'e2' }),
    );
    const bytes = new Uint8Array([1, 2, 3]);
    expect(await files.uploadPart(BOOK, 'u 1', 2, bytes)).toEqual({ partNumber: 2, etag: 'e2' });
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/files/${BOOK}/uploads/u%201/2`);
    expect(init.method).toBe('PUT');
    expect(init.body).toBe(bytes);

    await files.completeUpload(BOOK, 'u 1', [{ partNumber: 1, etag: 'e1' }]);
    const [doneUrl, doneInit] = fetchFn.mock.calls[1] as [string, RequestInit];
    expect(doneUrl).toBe(`/api/files/${BOOK}/uploads/u%201/complete`);
    expect(JSON.parse(String(doneInit.body))).toEqual({ parts: [{ partNumber: 1, etag: 'e1' }] });
  });

  it('downloads a byte range and reads the total size', async () => {
    const { files, fetchFn } = client(
      async () =>
        new Response(new Uint8Array([7, 8]), {
          status: 206,
          headers: { 'content-range': 'bytes 10-11/500' },
        }),
    );
    const got = await files.downloadRange(BOOK, 10, 2);
    expect(Array.from(got.bytes)).toEqual([7, 8]);
    expect(got.total).toBe(500);
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/files/${BOOK}`);
    expect(new Headers(init.headers).get('range')).toBe('bytes=10-11');
  });

  it('fails a range reply that is not what was asked for', async () => {
    const wrong = client(
      async () =>
        new Response(new Uint8Array([7]), {
          status: 206,
          headers: { 'content-range': 'bytes 10-10/500' },
        }),
    );
    expect(await kind(wrong.files.downloadRange(BOOK, 10, 2))).toBe('failed');
    const whole = client(async () => new Response(new Uint8Array([7, 8]), { status: 200 }));
    expect(await kind(whole.files.downloadRange(BOOK, 10, 2))).toBe('failed');
  });

  it('maps server answers onto what the app can explain', async () => {
    expect(
      await kind(client(status(404, { error: 'not-uploaded' })).files.downloadRange(BOOK, 0, 1)),
    ).toBe('not-uploaded');
    expect(
      await kind(
        client(status(404, { error: 'no-such-upload' })).files.uploadPart(
          BOOK,
          'u',
          1,
          new Uint8Array(1),
        ),
      ),
    ).toBe('no-such-upload');
    expect(await kind(client(status(404)).files.startUpload(BOOK, 1))).toBe('unavailable');
    expect(
      await kind(client(status(503, { error: 'files-not-configured' })).files.startUpload(BOOK, 1)),
    ).toBe('unavailable');
    expect(
      await kind(client(status(507, { error: 'storage-full' })).files.startUpload(BOOK, 1)),
    ).toBe('storage-full');
    expect(
      await kind(client(status(409, { error: 'not-synced' })).files.startUpload(BOOK, 1)),
    ).toBe('not-synced');
    expect(await kind(client(status(410, { error: 'deleted' })).files.startUpload(BOOK, 1))).toBe(
      'deleted',
    );
    expect(await kind(client(status(401)).files.startUpload(BOOK, 1))).toBe('signed-out');
    const redirect = Response.redirect('https://team.cloudflareaccess.com/login', 302);
    expect(await kind(client(async () => redirect).files.startUpload(BOOK, 1))).toBe('signed-out');
    expect(await kind(client(status(500)).files.startUpload(BOOK, 1))).toBe('failed');
    expect(await kind(client(async () => new Response('nope')).files.startUpload(BOOK, 1))).toBe(
      'failed',
    );
  });

  it('is offline when the browser says so or the network fails', async () => {
    const { files, fetchFn } = client(status(200), false);
    expect(await kind(files.startUpload(BOOK, 1))).toBe('offline');
    expect(fetchFn).not.toHaveBeenCalled();
    expect(
      await kind(
        client(() => Promise.reject(new TypeError('Failed to fetch'))).files.startUpload(BOOK, 1),
      ),
    ).toBe('offline');
  });

  it('lets a cancelled download end as an AbortError, not as offline', async () => {
    const abort = new DOMException('The operation was aborted.', 'AbortError');
    const { files } = client(() => Promise.reject(abort));
    await expect(files.downloadRange(BOOK, 0, 1, AbortSignal.abort())).rejects.toBe(abort);
  });
});
