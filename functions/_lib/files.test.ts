// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { SyncItem } from '../../src/core/sync';
import { handleFiles, PART_SIZE, type FilesEnv } from './files';
import { memoryBucket } from './memory-bucket';
import { handleSync } from './handler';
import { memoryDb } from './sqlite-test-db';
import type { SqlDb } from './store';

const BOOK = 'a'.repeat(64);
const OTHER_BOOK = 'b'.repeat(64);
const base = 'http://localhost:8788';

function env(user = 'me@example.com', extra: Partial<FilesEnv> = {}): FilesEnv {
  return { AUTH_MODE: 'dev', DEV_USER: user, ...extra };
}

function book(id: string, deleted = false, updatedAt = 100): SyncItem {
  return {
    kind: 'book',
    id,
    bookId: id,
    updatedAt,
    deleted,
    device: 'device-a',
    data: deleted ? null : { title: 'A book', fileName: 'a.pdf', byteSize: 1 },
  };
}

async function syncBooks(
  db: SqlDb,
  e: FilesEnv,
  bucket: ReturnType<typeof memoryBucket>,
  items: SyncItem[],
) {
  const res = await handleSync(
    new Request(`${base}/api/sync`, {
      method: 'POST',
      body: JSON.stringify({ deviceId: 'device-a', since: 0, changes: items }),
    }),
    e,
    db,
    undefined,
    bucket,
  );
  expect(res.status).toBe(200);
}

/** Compares bytes without vitest's deep equality, which runs out of memory on megabytes. */
async function expectBytes(response: Response | Promise<Response>, expected: Uint8Array) {
  const actual = new Uint8Array(await (await response).arrayBuffer());
  expect(actual.length).toBe(expected.length);
  expect(Buffer.compare(actual, expected)).toBe(0);
}

function bytes(length: number, seed = 1): Uint8Array {
  const out = new Uint8Array(length);
  for (let i = 0; i < length; i++) out[i] = (i * 31 + seed) & 0xff;
  return out;
}

function call(
  db: SqlDb,
  bucket: ReturnType<typeof memoryBucket>,
  e: FilesEnv,
  method: string,
  path: string,
  body?: BodyInit,
  headers: Record<string, string> = {},
) {
  // Browsers send Content-Length for byte bodies; Node's Request doesn't add it, so tests do.
  const length: Record<string, string> =
    body instanceof Uint8Array ? { 'content-length': String(body.length) } : {};
  return handleFiles(
    new Request(`${base}/api/files/${path}`, { method, body, headers: { ...length, ...headers } }),
    e,
    db,
    bucket,
  );
}

/** Uploads `data` the way the client does: create, parts of PART_SIZE, complete. */
async function upload(
  db: SqlDb,
  bucket: ReturnType<typeof memoryBucket>,
  e: FilesEnv,
  id: string,
  data: Uint8Array,
): Promise<Response> {
  const created = await call(
    db,
    bucket,
    e,
    'POST',
    `${id}/uploads`,
    JSON.stringify({ size: data.length }),
  );
  if (created.status !== 200) return created;
  const { uploadId, done } = (await created.json()) as { uploadId?: string; done?: boolean };
  if (done) return new Response(null, { status: 204 });
  const parts = [];
  for (let n = 1, offset = 0; offset < data.length; n++, offset += PART_SIZE) {
    const res = await call(
      db,
      bucket,
      e,
      'PUT',
      `${id}/uploads/${uploadId}/${n}`,
      data.slice(offset, offset + PART_SIZE),
    );
    expect(res.status).toBe(200);
    parts.push((await res.json()) as { partNumber: number; etag: string });
  }
  return call(
    db,
    bucket,
    e,
    'POST',
    `${id}/uploads/${uploadId}/complete`,
    JSON.stringify({ parts }),
  );
}

describe('handleFiles', () => {
  it('uploads a book in parts and downloads it byte for byte, also in ranges', async () => {
    const db = memoryDb();
    const bucket = memoryBucket();
    await syncBooks(db, env(), bucket, [book(BOOK)]);
    const data = bytes(PART_SIZE * 2 + 1234);

    expect((await upload(db, bucket, env(), BOOK, data)).status).toBe(200);
    expect(bucket.uploadedParts).toBe(3);

    const whole = await call(db, bucket, env(), 'GET', BOOK);
    expect(whole.status).toBe(200);
    expect(whole.headers.get('content-length')).toBe(String(data.length));
    expect(whole.headers.get('cache-control')).toBe('no-store');
    await expectBytes(whole, data);

    const range = await call(db, bucket, env(), 'GET', BOOK, undefined, {
      range: `bytes=${PART_SIZE - 2}-${PART_SIZE + 5}`,
    });
    expect(range.status).toBe(206);
    expect(range.headers.get('content-range')).toBe(
      `bytes ${PART_SIZE - 2}-${PART_SIZE + 5}/${data.length}`,
    );
    await expectBytes(range, data.slice(PART_SIZE - 2, PART_SIZE + 6));

    const tail = await call(db, bucket, env(), 'GET', BOOK, undefined, {
      range: `bytes=${data.length - 3}-`,
    });
    await expectBytes(tail, data.slice(-3));
    const outside = await call(db, bucket, env(), 'GET', BOOK, undefined, {
      range: `bytes=${data.length}-`,
    });
    expect(outside.status).toBe(416);
  });

  it('says done without a new upload when the file is already stored', async () => {
    const db = memoryDb();
    const bucket = memoryBucket();
    await syncBooks(db, env(), bucket, [book(BOOK)]);
    await upload(db, bucket, env(), BOOK, bytes(10));
    const again = await call(
      db,
      bucket,
      env(),
      'POST',
      `${BOOK}/uploads`,
      JSON.stringify({ size: 10 }),
    );
    expect(await again.json()).toEqual({ done: true });
  });

  it('a part can be sent again after a failure; the upload continues from there', async () => {
    const db = memoryDb();
    const bucket = memoryBucket();
    await syncBooks(db, env(), bucket, [book(BOOK)]);
    const data = bytes(PART_SIZE + 10);
    const created = await call(
      db,
      bucket,
      env(),
      'POST',
      `${BOOK}/uploads`,
      JSON.stringify({ size: data.length }),
    );
    const { uploadId } = (await created.json()) as { uploadId: string };
    const p1 = await (
      await call(
        db,
        bucket,
        env(),
        'PUT',
        `${BOOK}/uploads/${uploadId}/1`,
        data.slice(0, PART_SIZE),
      )
    ).json();
    // Part 2 arrives cut short (say the connection dropped); the client sends it again later
    // under the same upload id, and the new copy replaces the old one.
    await call(
      db,
      bucket,
      env(),
      'PUT',
      `${BOOK}/uploads/${uploadId}/2`,
      data.slice(PART_SIZE, PART_SIZE + 3),
    );
    const p2 = await (
      await call(db, bucket, env(), 'PUT', `${BOOK}/uploads/${uploadId}/2`, data.slice(PART_SIZE))
    ).json();
    const done = await call(
      db,
      bucket,
      env(),
      'POST',
      `${BOOK}/uploads/${uploadId}/complete`,
      JSON.stringify({ parts: [p1, p2] }),
    );
    expect(done.status).toBe(200);
    await expectBytes(call(db, bucket, env(), 'GET', BOOK), data);
  });

  it('answers 404 for an upload id it does not know, so the client starts over', async () => {
    const db = memoryDb();
    const bucket = memoryBucket();
    await syncBooks(db, env(), bucket, [book(BOOK)]);
    const res = await call(db, bucket, env(), 'PUT', `${BOOK}/uploads/nope/1`, bytes(5));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no-such-upload' });
  });

  it('refuses parts that are too big or have no length', async () => {
    const db = memoryDb();
    const bucket = memoryBucket();
    await syncBooks(db, env(), bucket, [book(BOOK)]);
    const created = await call(
      db,
      bucket,
      env(),
      'POST',
      `${BOOK}/uploads`,
      JSON.stringify({ size: 99 }),
    );
    const { uploadId } = (await created.json()) as { uploadId: string };
    expect(
      (await call(db, bucket, env(), 'PUT', `${BOOK}/uploads/${uploadId}/1`, bytes(PART_SIZE + 1)))
        .status,
    ).toBe(413);
    const stream = new Blob([bytes(5)]).stream();
    const chunked = await handleFiles(
      new Request(`${base}/api/files/${BOOK}/uploads/${uploadId}/1`, {
        method: 'PUT',
        body: stream,
        duplex: 'half',
      } as RequestInit),
      env(),
      db,
      bucket,
    );
    expect(chunked.status).toBe(411);
    expect(
      (await call(db, bucket, env(), 'PUT', `${BOOK}/uploads/${uploadId}/0`, bytes(5))).status,
    ).toBe(400);
  });

  it('only uploads books the server knows, and never one that was deleted', async () => {
    const db = memoryDb();
    const bucket = memoryBucket();
    const unknown = await call(
      db,
      bucket,
      env(),
      'POST',
      `${BOOK}/uploads`,
      JSON.stringify({ size: 5 }),
    );
    expect(unknown.status).toBe(409);
    expect(await unknown.json()).toEqual({ error: 'not-synced' });

    await syncBooks(db, env(), bucket, [book(BOOK)]);
    const created = await call(
      db,
      bucket,
      env(),
      'POST',
      `${BOOK}/uploads`,
      JSON.stringify({ size: 5 }),
    );
    const { uploadId } = (await created.json()) as { uploadId: string };
    const part = await (
      await call(db, bucket, env(), 'PUT', `${BOOK}/uploads/${uploadId}/1`, bytes(5))
    ).json();

    // Deleted everywhere (on another device) while this one was uploading.
    await syncBooks(db, env(), bucket, [book(BOOK, true, 200)]);
    const completed = await call(
      db,
      bucket,
      env(),
      'POST',
      `${BOOK}/uploads/${uploadId}/complete`,
      JSON.stringify({ parts: [part] }),
    );
    expect(completed.status).toBe(410);
    expect((await call(db, bucket, env(), 'GET', BOOK)).status).toBe(404);
    expect(bucket.objectCount()).toBe(0);

    const restart = await call(
      db,
      bucket,
      env(),
      'POST',
      `${BOOK}/uploads`,
      JSON.stringify({ size: 5 }),
    );
    expect(restart.status).toBe(410);
  });

  it('a synced "delete everywhere" removes the stored file', async () => {
    const db = memoryDb();
    const bucket = memoryBucket();
    await syncBooks(db, env(), bucket, [book(BOOK), book(OTHER_BOOK)]);
    await upload(db, bucket, env(), BOOK, bytes(10));
    await upload(db, bucket, env(), OTHER_BOOK, bytes(10, 2));
    expect(bucket.objectCount()).toBe(2);

    await syncBooks(db, env(), bucket, [book(BOOK, true, 200)]);
    expect(bucket.objectCount()).toBe(1);
    const gone = await call(db, bucket, env(), 'GET', BOOK);
    expect(gone.status).toBe(404);
    expect(await gone.json()).toEqual({ error: 'not-uploaded' });
    expect((await call(db, bucket, env(), 'GET', OTHER_BOOK)).status).toBe(200);
  });

  it('stops at the storage cap with storage-full', async () => {
    const db = memoryDb();
    const bucket = memoryBucket();
    const capped = env('me@example.com', { FILES_CAP_BYTES: '25' });
    await syncBooks(db, capped, bucket, [book(BOOK), book(OTHER_BOOK)]);
    expect((await upload(db, bucket, capped, BOOK, bytes(20))).status).toBe(200);
    const full = await call(
      db,
      bucket,
      capped,
      'POST',
      `${OTHER_BOOK}/uploads`,
      JSON.stringify({ size: 6 }),
    );
    expect(full.status).toBe(507);
    expect(await full.json()).toEqual({ error: 'storage-full' });
    // Deleting the first book frees its space.
    await syncBooks(db, capped, bucket, [book(BOOK, true, 300)]);
    expect((await upload(db, bucket, capped, OTHER_BOOK, bytes(6))).status).toBe(200);
  });

  it("keeps each user's files apart", async () => {
    const db = memoryDb();
    const bucket = memoryBucket();
    await syncBooks(db, env('me@example.com'), bucket, [book(BOOK)]);
    await upload(db, bucket, env('me@example.com'), BOOK, bytes(10));

    const other = env('someone@example.com');
    expect((await call(db, bucket, other, 'GET', BOOK)).status).toBe(404);
    // Even with the same book synced, the other user has no file until they upload one.
    await syncBooks(db, other, bucket, [book(BOOK)]);
    expect((await call(db, bucket, other, 'GET', BOOK)).status).toBe(404);
    const created = await call(
      db,
      bucket,
      other,
      'POST',
      `${BOOK}/uploads`,
      JSON.stringify({ size: 10 }),
    );
    expect(await created.json()).toHaveProperty('uploadId');
  });

  it('rejects requests without a valid Access token in production mode', async () => {
    const prod = { ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com', ACCESS_AUD: 'aud' };
    const res = await call(memoryDb(), memoryBucket(), prod, 'GET', BOOK);
    expect(res.status).toBe(401);
    const forged = await call(memoryDb(), memoryBucket(), prod, 'GET', BOOK, undefined, {
      'cf-access-jwt-assertion': 'not.a.token',
      'x-dev-user': 'me@example.com',
    });
    expect(forged.status).toBe(401);
  });

  it('rejects bad paths, ids and methods', async () => {
    const db = memoryDb();
    const bucket = memoryBucket();
    expect((await call(db, bucket, env(), 'GET', 'not-a-sha')).status).toBe(400);
    expect((await call(db, bucket, env(), 'DELETE', BOOK)).status).toBe(405);
    expect((await call(db, bucket, env(), 'GET', `${BOOK}/what`)).status).toBe(404);
    expect((await call(db, bucket, env(), 'POST', `${BOOK}/uploads`, '{"size":-1}')).status).toBe(
      400,
    );
  });

  it('says the cloud is not set up when there is no bucket', async () => {
    const res = await handleFiles(
      new Request(`${base}/api/files/${BOOK}`),
      env(),
      memoryDb(),
      null,
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'files-not-configured' });
  });
});
