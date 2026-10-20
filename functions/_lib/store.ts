// Server-side sync storage on D1 (SQLite). One row per synced item, per user. Every applied change
// gets a fresh per-user sequence number, so a device asks for "everything after my cursor".
import { shouldApply, type SyncItem, type SyncKind } from '../../src/core/sync';

export type SqlValue = string | number | null;

/** The few database operations the store needs; D1 in production, node:sqlite in unit tests. */
export interface SqlDb {
  exec(sql: string): Promise<void>;
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  run(sql: string, params?: SqlValue[]): Promise<void>;
}

const SCHEMA_VERSION = 2;

/** Creates or upgrades the tables. Idempotent, so the Function can run it on first use. */
export async function migrate(db: SqlDb): Promise<void> {
  await db.exec(
    'CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);' +
      'CREATE TABLE IF NOT EXISTS sync_seq (user TEXT PRIMARY KEY, seq INTEGER NOT NULL);' +
      'CREATE TABLE IF NOT EXISTS sync_items (' +
      'user TEXT NOT NULL, kind TEXT NOT NULL, id TEXT NOT NULL, book_id TEXT NOT NULL, ' +
      'data TEXT, updated_at INTEGER NOT NULL, deleted INTEGER NOT NULL, device TEXT NOT NULL, ' +
      'seq INTEGER NOT NULL, PRIMARY KEY (user, kind, id));' +
      'CREATE INDEX IF NOT EXISTS sync_items_by_seq ON sync_items (user, seq);' +
      'CREATE INDEX IF NOT EXISTS sync_items_by_book ON sync_items (user, book_id);' +
      // v2 (phase 09b): book files stored in R2, for the storage cap and "already uploaded".
      'CREATE TABLE IF NOT EXISTS files (' +
      'user TEXT NOT NULL, book_id TEXT NOT NULL, size INTEGER NOT NULL, ' +
      'PRIMARY KEY (user, book_id));',
  );
  const rows = await db.all<{ version: number }>('SELECT version FROM schema_version');
  if (rows.length === 0) {
    await db.run('INSERT INTO schema_version (version) VALUES (?)', [SCHEMA_VERSION]);
  } else if ((rows[0]?.version ?? 0) < SCHEMA_VERSION) {
    await db.run('UPDATE schema_version SET version = ?', [SCHEMA_VERSION]);
  }
}

const migrated = new WeakMap<SqlDb, Promise<void>>();

/** Runs `migrate` once per database (per Function instance); retries after a failure. */
export function ensureMigrated(db: SqlDb): Promise<void> {
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

/** Next sequence number for this user; one atomic statement, so concurrent syncs never share one. */
async function nextSeq(db: SqlDb, user: string): Promise<number> {
  const rows = await db.all<{ seq: number }>(
    'INSERT INTO sync_seq (user, seq) VALUES (?, 1) ' +
      'ON CONFLICT(user) DO UPDATE SET seq = seq + 1 RETURNING seq',
    [user],
  );
  const seq = rows[0]?.seq;
  if (typeof seq !== 'number') throw new Error('Could not allocate a sync sequence number');
  return seq;
}

interface Row {
  kind: SyncKind;
  id: string;
  book_id: string;
  data: string | null;
  updated_at: number;
  deleted: number;
  device: string;
  seq: number;
}

async function write(db: SqlDb, user: string, item: SyncItem): Promise<void> {
  const seq = await nextSeq(db, user);
  await db.run(
    'INSERT INTO sync_items (user, kind, id, book_id, data, updated_at, deleted, device, seq) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user, kind, id) DO UPDATE SET ' +
      'book_id = excluded.book_id, data = excluded.data, updated_at = excluded.updated_at, ' +
      'deleted = excluded.deleted, device = excluded.device, seq = excluded.seq',
    [
      user,
      item.kind,
      item.id,
      item.bookId,
      item.deleted ? null : JSON.stringify(item.data),
      item.updatedAt,
      item.deleted ? 1 : 0,
      item.device,
      seq,
    ],
  );
}

/**
 * Applies changes with last write wins. A deleted book also deletes its annotations; the books
 * deleted this way are returned so the caller can delete their files.
 */
export async function applyChanges(
  db: SqlDb,
  user: string,
  changes: readonly SyncItem[],
): Promise<{ applied: number; deletedBooks: string[] }> {
  let applied = 0;
  const deletedBooks: string[] = [];
  for (const change of changes) {
    const stored = await db.all<{ updated_at: number; device: string }>(
      'SELECT updated_at, device FROM sync_items WHERE user = ? AND kind = ? AND id = ?',
      [user, change.kind, change.id],
    );
    const current = stored[0];
    const stamp = current && { updatedAt: current.updated_at, device: current.device };
    if (!shouldApply(stamp, change)) continue;
    await write(db, user, change);
    applied++;

    if (change.kind === 'book' && change.deleted) {
      deletedBooks.push(change.id);
      const annotations = await db.all<Row>(
        "SELECT * FROM sync_items WHERE user = ? AND book_id = ? AND kind != 'book' AND deleted = 0",
        [user, change.id],
      );
      for (const row of annotations) {
        await write(db, user, {
          kind: row.kind,
          id: row.id,
          bookId: row.book_id,
          updatedAt: Math.max(change.updatedAt, row.updated_at + 1),
          deleted: true,
          device: change.device,
          data: null,
        });
      }
    }
  }
  return { applied, deletedBooks };
}

/** Whether the server knows this book: never synced, synced and present, or deleted. */
export async function bookState(
  db: SqlDb,
  user: string,
  bookId: string,
): Promise<'unknown' | 'present' | 'deleted'> {
  const rows = await db.all<{ deleted: number }>(
    "SELECT deleted FROM sync_items WHERE user = ? AND kind = 'book' AND id = ?",
    [user, bookId],
  );
  const row = rows[0];
  if (!row) return 'unknown';
  return row.deleted === 1 ? 'deleted' : 'present';
}

export interface Pulled {
  items: SyncItem[];
  /** Pass back as `since` next time. */
  cursor: number;
  /** True if there are more changes after this page. */
  more: boolean;
}

/** Changes after `since`, oldest first, without echoing `device` its own writes. */
export async function changesSince(
  db: SqlDb,
  user: string,
  since: number,
  device: string,
  limit = 500,
): Promise<Pulled> {
  const rows = await db.all<Row>(
    'SELECT kind, id, book_id, data, updated_at, deleted, device, seq FROM sync_items ' +
      'WHERE user = ? AND seq > ? ORDER BY seq LIMIT ?',
    [user, since, limit + 1],
  );
  const more = rows.length > limit;
  const page = rows.slice(0, limit);
  const cursor = page.length > 0 ? (page[page.length - 1]?.seq ?? since) : since;
  const items = page
    .filter((row) => row.device !== device)
    .map((row) => ({
      kind: row.kind,
      id: row.id,
      bookId: row.book_id,
      updatedAt: row.updated_at,
      deleted: row.deleted === 1,
      device: row.device,
      data: row.data === null ? null : (JSON.parse(row.data) as unknown),
    }));
  return { items, cursor, more };
}
