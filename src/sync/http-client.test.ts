import { describe, expect, it, vi } from 'vitest';
import { SyncError } from './engine';
import { httpSyncClient } from './http-client';

const request = { deviceId: 'd', since: 0, changes: [] };

function client(response: () => Promise<Response>, online = true) {
  const fetchFn = vi.fn(response);
  return { sync: httpSyncClient({ fetch: fetchFn, isOnline: () => online }), fetchFn };
}

async function kind(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return 'ok';
  } catch (error) {
    return error instanceof SyncError ? error.kind : 'other';
  }
}

describe('httpSyncClient', () => {
  it('posts the request as JSON to /api/sync and returns the reply', async () => {
    const reply = { items: [], cursor: 3, more: false };
    const { sync, fetchFn } = client(async () => Response.json(reply));
    expect(await sync.sync(request)).toEqual(reply);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/sync');
    expect(init).toMatchObject({ method: 'POST', credentials: 'same-origin', redirect: 'manual' });
    expect(JSON.parse(String(init.body))).toEqual(request);
  });

  it('is offline without trying when the browser says so', async () => {
    const { sync, fetchFn } = client(async () => Response.json({}), false);
    expect(await kind(sync.sync(request))).toBe('offline');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('treats a network failure as offline', async () => {
    const { sync } = client(() => Promise.reject(new TypeError('Failed to fetch')));
    expect(await kind(sync.sync(request))).toBe('offline');
  });

  it('treats the Access login redirect or 401/403 as signed out', async () => {
    const redirect = Response.redirect('https://team.cloudflareaccess.com/login', 302);
    expect(await kind(client(async () => redirect).sync.sync(request))).toBe('signed-out');
    const opaque = { type: 'opaqueredirect', status: 0, ok: false } as Response;
    expect(await kind(client(async () => opaque).sync.sync(request))).toBe('signed-out');
    expect(
      await kind(client(async () => new Response('', { status: 401 })).sync.sync(request)),
    ).toBe('signed-out');
    expect(
      await kind(client(async () => new Response('', { status: 403 })).sync.sync(request)),
    ).toBe('signed-out');
  });

  it('treats a missing API (404/405) as sync not set up here', async () => {
    expect(
      await kind(client(async () => new Response('', { status: 404 })).sync.sync(request)),
    ).toBe('unavailable');
    expect(
      await kind(client(async () => new Response('', { status: 405 })).sync.sync(request)),
    ).toBe('unavailable');
  });

  it('treats server errors and malformed replies as failures', async () => {
    expect(
      await kind(client(async () => new Response('', { status: 500 })).sync.sync(request)),
    ).toBe('failed');
    expect(await kind(client(async () => new Response('<html>')).sync.sync(request))).toBe(
      'failed',
    );
    expect(await kind(client(async () => Response.json({ items: 'x' })).sync.sync(request))).toBe(
      'failed',
    );
  });
});
