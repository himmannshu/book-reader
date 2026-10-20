// POST /api/sync: push this device's changes, pull everyone else's. See src/core/sync.ts.
import type { JWTVerifyGetKey } from 'jose';
import type { SyncItem, SyncKind } from '../../src/core/sync';
import { AuthError, identify, type AuthEnv } from './auth';
import { applyChanges, changesSince, migrate, type SqlDb } from './store';

const KINDS: ReadonlySet<SyncKind> = new Set(['book', 'bookmark', 'highlight', 'note']);
const MAX_CHANGES = 500;
const MAX_ITEM_BYTES = 64 * 1024;
const MAX_ID = 200;

interface SyncRequest {
  deviceId: string;
  since: number;
  changes: SyncItem[];
}

class BadRequest extends Error {}

function isId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_ID;
}

function parseChange(raw: unknown, deviceId: string): SyncItem {
  if (typeof raw !== 'object' || raw === null) throw new BadRequest('change is not an object');
  const c = raw as Record<string, unknown>;
  if (!KINDS.has(c.kind as SyncKind)) throw new BadRequest('unknown kind');
  if (!isId(c.id) || !isId(c.bookId)) throw new BadRequest('bad id');
  if (typeof c.updatedAt !== 'number' || !Number.isFinite(c.updatedAt) || c.updatedAt < 0) {
    throw new BadRequest('bad updatedAt');
  }
  if (typeof c.deleted !== 'boolean') throw new BadRequest('bad deleted');
  if (c.device !== deviceId) throw new BadRequest('change from another device');
  if (!c.deleted && (typeof c.data !== 'object' || c.data === null))
    throw new BadRequest('bad data');
  if (c.data !== undefined && JSON.stringify(c.data).length > MAX_ITEM_BYTES) {
    throw new BadRequest('item too large');
  }
  return {
    kind: c.kind as SyncKind,
    id: c.id,
    bookId: c.bookId,
    updatedAt: Math.floor(c.updatedAt),
    deleted: c.deleted,
    device: deviceId,
    data: c.deleted ? null : c.data,
  };
}

function parseRequest(raw: unknown): SyncRequest {
  if (typeof raw !== 'object' || raw === null) throw new BadRequest('body is not an object');
  const r = raw as Record<string, unknown>;
  if (!isId(r.deviceId)) throw new BadRequest('bad deviceId');
  if (typeof r.since !== 'number' || !Number.isInteger(r.since) || r.since < 0) {
    throw new BadRequest('bad since');
  }
  if (!Array.isArray(r.changes) || r.changes.length > MAX_CHANGES)
    throw new BadRequest('bad changes');
  const deviceId = r.deviceId;
  return { deviceId, since: r.since, changes: r.changes.map((c) => parseChange(c, deviceId)) };
}

const migrated = new WeakMap<SqlDb, Promise<void>>();

function ensureMigrated(db: SqlDb): Promise<void> {
  let done = migrated.get(db);
  if (!done) {
    done = migrate(db).catch((error: unknown) => {
      migrated.delete(db);
      throw error;
    });
    migrated.set(db, done);
  }
  return done;
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

export async function handleSync(
  request: Request,
  env: AuthEnv,
  db: SqlDb,
  getKey?: JWTVerifyGetKey,
): Promise<Response> {
  try {
    const user = await identify(request, env, getKey);
    let body: SyncRequest;
    try {
      body = parseRequest(await request.json());
    } catch (error) {
      throw error instanceof BadRequest ? error : new BadRequest('body is not JSON');
    }
    await ensureMigrated(db);
    await applyChanges(db, user, body.changes);
    const pulled = await changesSince(db, user, body.since, body.deviceId);
    return json(pulled);
  } catch (error) {
    if (error instanceof AuthError) return json({ error: error.message }, error.status);
    if (error instanceof BadRequest) return json({ error: error.message }, 400);
    console.error('Sync failed', error);
    return json({ error: 'Sync failed' }, 500);
  }
}
