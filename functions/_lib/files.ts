// Book files in the cloud (phase 09b): /api/files/<bookId>[/uploads[/<uploadId>/<part|complete>]].
// Uploads are multipart, so books over the 100 MB request limit work and an interrupted upload
// resumes from its next part. The server never hashes files (Workers CPU limits); the device that
// downloads a file checks that its SHA-256 matches the book id before keeping it.
import type { JWTVerifyGetKey } from 'jose';
import { AuthError, identify, type AuthEnv } from './auth';
import { bookState, ensureMigrated, type SqlDb } from './store';

/** Every part but the last has exactly this size (R2 requires equal parts of at least 5 MiB). */
export const PART_SIZE = 8 * 1024 * 1024;
/** R2's free tier is 10 GB; stop well before it so the cloud never costs money. */
export const DEFAULT_CAP_BYTES = 9_000_000_000;
const MAX_PARTS = 10_000;
const MAX_UPLOAD_ID = 1024;

export interface FilesEnv extends AuthEnv {
  /** Overrides the storage cap (bytes); tests set a small one. */
  FILES_CAP_BYTES?: string;
}

export interface UploadedPart {
  partNumber: number;
  etag: string;
}

/** Thrown by a FileBucket when an upload id is unknown, finished or aborted. */
export class NoSuchUpload extends Error {}

/** The few R2 operations the file API needs; R2 in production, memory in unit tests. */
export interface FileBucket {
  createUpload(key: string): Promise<string>;
  uploadPart(
    key: string,
    uploadId: string,
    partNumber: number,
    body: ReadableStream | Uint8Array,
  ): Promise<UploadedPart>;
  /** Returns the stored object's size. */
  complete(key: string, uploadId: string, parts: UploadedPart[]): Promise<number>;
  abort(key: string, uploadId: string): Promise<void>;
  /** The object (or a byte range of it), or null when there is none. */
  get(
    key: string,
    range?: { offset: number; length: number },
  ): Promise<{ body: ReadableStream; size: number } | null>;
  size(key: string): Promise<number | null>;
  delete(keys: string[]): Promise<void>;
}

class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

const BOOK_ID = /^[0-9a-f]{64}$/;

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** R2 key for a user's book file. Hashing the email keeps it out of the bucket's key list. */
export async function fileKey(user: string, bookId: string): Promise<string> {
  return `files/${await sha256Hex(user)}/${bookId}`;
}

/** Deletes the files of books deleted everywhere (called by the sync handler). */
export async function forgetFiles(
  db: SqlDb,
  bucket: FileBucket | null,
  user: string,
  bookIds: readonly string[],
): Promise<void> {
  const ids = bookIds.filter((id) => BOOK_ID.test(id));
  if (ids.length === 0) return;
  if (bucket) await bucket.delete(await Promise.all(ids.map((id) => fileKey(user, id))));
  for (const id of ids) {
    await db.run('DELETE FROM files WHERE user = ? AND book_id = ?', [user, id]);
  }
}

function capBytes(env: FilesEnv): number {
  const cap = Number(env.FILES_CAP_BYTES);
  return Number.isFinite(cap) && cap > 0 ? cap : DEFAULT_CAP_BYTES;
}

async function storedSize(db: SqlDb, user: string, bookId: string): Promise<number | null> {
  const rows = await db.all<{ size: number }>(
    'SELECT size FROM files WHERE user = ? AND book_id = ?',
    [user, bookId],
  );
  return rows[0]?.size ?? null;
}

async function storedTotal(db: SqlDb, user: string): Promise<number> {
  const rows = await db.all<{ total: number | null }>(
    'SELECT SUM(size) AS total FROM files WHERE user = ?',
    [user],
  );
  return rows[0]?.total ?? 0;
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    if (typeof body === 'object' && body !== null) return body as Record<string, unknown>;
  } catch {
    // Falls through to the 400 below.
  }
  throw new HttpError(400, 'bad-request');
}

async function requireLiveBook(db: SqlDb, user: string, bookId: string): Promise<void> {
  const state = await bookState(db, user, bookId);
  if (state === 'unknown') throw new HttpError(409, 'not-synced');
  if (state === 'deleted') throw new HttpError(410, 'deleted');
}

async function createUpload(
  request: Request,
  env: FilesEnv,
  db: SqlDb,
  bucket: FileBucket,
  user: string,
  bookId: string,
): Promise<Response> {
  const { size } = await readJson(request);
  if (typeof size !== 'number' || !Number.isInteger(size) || size <= 0) {
    throw new HttpError(400, 'bad-size');
  }
  if (size > PART_SIZE * MAX_PARTS) throw new HttpError(413, 'too-large');
  await requireLiveBook(db, user, bookId);
  if ((await storedSize(db, user, bookId)) !== null) return json({ done: true });
  if ((await storedTotal(db, user)) + size > capBytes(env)) {
    throw new HttpError(507, 'storage-full');
  }
  const uploadId = await bucket.createUpload(await fileKey(user, bookId));
  return json({ uploadId, partSize: PART_SIZE });
}

async function uploadPart(
  request: Request,
  bucket: FileBucket,
  user: string,
  bookId: string,
  uploadId: string,
  partText: string,
): Promise<Response> {
  const partNumber = Number(partText);
  if (!/^\d+$/.test(partText) || partNumber < 1 || partNumber > MAX_PARTS) {
    throw new HttpError(400, 'bad-part');
  }
  // R2 needs to know a streamed part's length up front; browsers always send it for byte bodies.
  const length = Number(request.headers.get('content-length'));
  if (!request.headers.has('content-length') || !Number.isInteger(length)) {
    throw new HttpError(411, 'length-required');
  }
  if (length <= 0 || length > PART_SIZE) throw new HttpError(413, 'bad-part-size');
  if (!request.body) throw new HttpError(400, 'bad-part');
  const part = await bucket.uploadPart(
    await fileKey(user, bookId),
    uploadId,
    partNumber,
    request.body,
  );
  return json(part);
}

function parseParts(raw: unknown): UploadedPart[] {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_PARTS) {
    throw new HttpError(400, 'bad-parts');
  }
  return raw.map((p: unknown) => {
    const part = p as Record<string, unknown> | null;
    if (
      typeof part?.partNumber !== 'number' ||
      !Number.isInteger(part.partNumber) ||
      typeof part.etag !== 'string'
    ) {
      throw new HttpError(400, 'bad-parts');
    }
    return { partNumber: part.partNumber, etag: part.etag };
  });
}

async function completeUpload(
  request: Request,
  db: SqlDb,
  bucket: FileBucket,
  user: string,
  bookId: string,
  uploadId: string,
): Promise<Response> {
  const parts = parseParts((await readJson(request)).parts);
  const key = await fileKey(user, bookId);
  const state = await bookState(db, user, bookId);
  if (state !== 'present') {
    // Deleted everywhere while this device was uploading: never bring the file back.
    await bucket.abort(key, uploadId).catch(() => undefined);
    throw new HttpError(
      state === 'deleted' ? 410 : 409,
      state === 'deleted' ? 'deleted' : 'not-synced',
    );
  }
  const size = await bucket.complete(key, uploadId, parts);
  await db.run(
    'INSERT INTO files (user, book_id, size) VALUES (?, ?, ?) ' +
      'ON CONFLICT(user, book_id) DO UPDATE SET size = excluded.size',
    [user, bookId, size],
  );
  return json({ size });
}

/** Parses a single `bytes=` range; null when there is none, 416 when it can't be satisfied. */
function parseRange(
  header: string | null,
  size: number,
): { offset: number; length: number } | null {
  if (!header) return null;
  const match = /^bytes=(\d+)-(\d*)$/.exec(header.trim());
  if (!match) throw new HttpError(416, 'bad-range');
  const start = Number(match[1]);
  const end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1);
  if (start >= size || end < start) throw new HttpError(416, 'bad-range');
  return { offset: start, length: end - start + 1 };
}

async function download(
  request: Request,
  db: SqlDb,
  bucket: FileBucket,
  user: string,
  bookId: string,
): Promise<Response> {
  if ((await bookState(db, user, bookId)) === 'deleted') throw new HttpError(404, 'not-uploaded');
  const key = await fileKey(user, bookId);
  const size = await bucket.size(key);
  if (size === null) throw new HttpError(404, 'not-uploaded');
  const range = parseRange(request.headers.get('range'), size);
  const headers = new Headers({
    'cache-control': 'no-store',
    'content-type': 'application/pdf',
    'accept-ranges': 'bytes',
    'content-length': String(range ? range.length : size),
  });
  if (range) {
    headers.set(
      'content-range',
      `bytes ${range.offset}-${range.offset + range.length - 1}/${size}`,
    );
  }
  if (request.method === 'HEAD') return new Response(null, { status: range ? 206 : 200, headers });
  const object = await bucket.get(key, range ?? undefined);
  if (!object) throw new HttpError(404, 'not-uploaded');
  return new Response(object.body, { status: range ? 206 : 200, headers });
}

export async function handleFiles(
  request: Request,
  env: FilesEnv,
  db: SqlDb,
  bucket: FileBucket | null,
  getKey?: JWTVerifyGetKey,
): Promise<Response> {
  try {
    const user = await identify(request, env, getKey);
    if (!bucket) throw new HttpError(503, 'files-not-configured');
    const path = new URL(request.url).pathname.replace(/^\/api\/files\/?/, '');
    const [bookId = '', section, uploadId, action, ...rest] = path.split('/');
    if (!BOOK_ID.test(bookId)) throw new HttpError(400, 'bad-book-id');
    if (rest.length > 0) throw new HttpError(404, 'not-found');
    await ensureMigrated(db);
    const method = request.method;

    if (section === undefined) {
      if (method !== 'GET' && method !== 'HEAD') throw new HttpError(405, 'method-not-allowed');
      return await download(request, db, bucket, user, bookId);
    }
    if (section !== 'uploads') throw new HttpError(404, 'not-found');
    if (uploadId === undefined) {
      if (method !== 'POST') throw new HttpError(405, 'method-not-allowed');
      return await createUpload(request, env, db, bucket, user, bookId);
    }
    if (!uploadId || uploadId.length > MAX_UPLOAD_ID || action === undefined) {
      throw new HttpError(404, 'not-found');
    }
    if (action === 'complete') {
      if (method !== 'POST') throw new HttpError(405, 'method-not-allowed');
      return await completeUpload(request, db, bucket, user, bookId, uploadId);
    }
    if (method !== 'PUT') throw new HttpError(405, 'method-not-allowed');
    return await uploadPart(request, bucket, user, bookId, uploadId, action);
  } catch (error) {
    if (error instanceof AuthError) return json({ error: error.message }, error.status);
    if (error instanceof HttpError) return json({ error: error.code }, error.status);
    if (error instanceof NoSuchUpload) return json({ error: 'no-such-upload' }, 404);
    console.error('Files request failed', error);
    return json({ error: 'failed' }, 500);
  }
}
