// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { handleSync } from './handler';
import { memoryDb } from './sqlite-test-db';

const dev = { AUTH_MODE: 'dev', DEV_USER: 'me@example.com' };
const url = 'http://localhost:8788/api/sync';

function post(body: unknown, init: RequestInit = {}) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    ...init,
  });
}

const change = {
  kind: 'bookmark',
  id: 'bm-1',
  bookId: 'book-1',
  updatedAt: 100,
  deleted: false,
  device: 'device-a',
  data: { label: 'Page 1' },
};

describe('handleSync', () => {
  it("stores a device's changes and returns them to another device", async () => {
    const db = memoryDb();
    const pushed = await handleSync(
      post({ deviceId: 'device-a', since: 0, changes: [change] }),
      dev,
      db,
    );
    expect(pushed.status).toBe(200);
    expect(await pushed.json()).toMatchObject({ items: [], more: false });

    const pulled = await handleSync(post({ deviceId: 'device-b', since: 0, changes: [] }), dev, db);
    const body = (await pulled.json()) as { items: unknown[]; cursor: number };
    expect(body.items).toEqual([change]);
    expect(body.cursor).toBeGreaterThan(0);
  });

  it('rejects malformed requests with 400 and stores nothing', async () => {
    const db = memoryDb();
    const bad = [
      'not json',
      { deviceId: '', since: 0, changes: [] },
      { deviceId: 'd', since: -1, changes: [] },
      { deviceId: 'd', since: 0, changes: [{ ...change, kind: 'virus' }] },
      { deviceId: 'd', since: 0, changes: [{ ...change, updatedAt: 'soon' }] },
      { deviceId: 'd', since: 0, changes: [{ ...change, device: 'someone-else' }] },
      { deviceId: 'd', since: 0, changes: Array.from({ length: 501 }, () => change) },
    ];
    for (const body of bad) {
      expect(
        (await handleSync(post(body), dev, db)).status,
        JSON.stringify(body).slice(0, 60),
      ).toBe(400);
    }
    const pulled = await handleSync(post({ deviceId: 'x', since: 0, changes: [] }), dev, db);
    expect(((await pulled.json()) as { items: unknown[] }).items).toEqual([]);
  });

  it('answers 401 without an identity, in production mode', async () => {
    const res = await handleSync(post({ deviceId: 'd', since: 0, changes: [] }), {}, memoryDb());
    expect([401, 500]).toContain(res.status);
    const prod = { ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com', ACCESS_AUD: 'aud' };
    expect(
      (await handleSync(post({ deviceId: 'd', since: 0, changes: [] }), prod, memoryDb())).status,
    ).toBe(401);
  });
});
