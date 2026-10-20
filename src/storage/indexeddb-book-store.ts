// IndexedDB adapter for the book, bookmark, highlight and note stores (D5a in architecture-decisions.md).
// Metadata and files live in separate object stores, so listing books never loads the PDFs.
// Files are stored as ArrayBuffers, not Blobs: Safari's private browsing (and Playwright's WebKit)
// refuses Blobs in IndexedDB but accepts ArrayBuffers, at similar speed.
// Sync (phase 09a): every local write also stamps a row in `syncMeta`, in the same transaction, so
// the sync engine can send exactly what changed; deletions keep their row as a tombstone.
import { sortByPage, type Bookmark } from '../core/bookmarks';
import { sortByPosition, type Highlight } from '../core/highlights';
import { sortByRecentlyOpened, titleFromFileName } from '../core/library';
import { sortNotes, validNote, type Note } from '../core/notes';
import { validReadingState, type ReadingState } from '../core/reading-state';
import { nextStamp, shouldApply, type SyncItem, type SyncKind } from '../core/sync';
import {
  StorageError,
  type BookRecord,
  type BookStore,
  type BookmarkStore,
  type Cover,
  type CoverStore,
  type FileTransferStore,
  type HighlightStore,
  type NoteStore,
  type PerBookStore,
  type ReadingStateStore,
  type SyncStore,
  type UploadRecord,
} from './types';

/** False where the browser (or the unit-test environment) has no IndexedDB. */
export const indexedDBAvailable = typeof globalThis.indexedDB !== 'undefined';

export const DB_NAME = 'book-reader';
/** Bump with a migration in `upgrade` whenever the stores or record shape change. */
export const DB_VERSION = 8;
const BOOKS = 'books';
const FILES = 'bookFiles';
const BOOKMARKS = 'bookmarks';
const HIGHLIGHTS = 'highlights';
const NOTES = 'notes';
const SYNC_META = 'syncMeta';
const SYNC_STATE = 'syncState';
const UPLOADS = 'uploads';
const READING = 'readingState';
const COVERS = 'covers';
/** Stores of items that belong to a book; each has an index on `bookId`. */
const PER_BOOK = [BOOKMARKS, HIGHLIGHTS, NOTES];
const BY_BOOK = 'bookId';
const BY_HIGHLIGHT = 'highlightId';
const BY_PENDING = 'pending';
const ALL_STORES = [BOOKS, FILES, ...PER_BOOK, SYNC_META, SYNC_STATE, UPLOADS, READING, COVERS];

const STORE_OF: Record<SyncKind, string> = {
  book: BOOKS,
  bookmark: BOOKMARKS,
  highlight: HIGHLIGHTS,
  note: NOTES,
};
const KIND_OF: Record<string, SyncKind> = {
  [BOOKMARKS]: 'bookmark',
  [HIGHLIGHTS]: 'highlight',
  [NOTES]: 'note',
};

/** One row per synced item: its last stamp, and whether this device still has to send it. */
interface SyncMeta {
  key: string;
  kind: SyncKind;
  id: string;
  bookId: string;
  updatedAt: number;
  deleted: boolean;
  device: string;
  /** 1 while the change still has to be sent (IndexedDB cannot index booleans). */
  pending: 0 | 1;
}

const metaKey = (kind: SyncKind, id: string) => `${kind}:${id}`;

export interface IndexedDBBookStoreOptions {
  /** Defaults to the browser's `indexedDB`. Tests pass a fake. */
  factory?: IDBFactory;
  now?: () => number;
  /** Asks the browser not to evict our data. Defaults to `navigator.storage.persist`. */
  requestPersistence?: () => Promise<boolean>;
}

/** Maps browser storage failures onto the few kinds the UI explains to the reader. */
export function toStorageError(error: unknown): StorageError {
  if (error instanceof StorageError) return error;
  const name = error instanceof Error || error instanceof DOMException ? error.name : '';
  switch (name) {
    case 'QuotaExceededError':
      return new StorageError('quota', 'Not enough storage space', { cause: error });
    case 'InvalidStateError':
    case 'SecurityError':
    case 'UnknownError':
      return new StorageError('unavailable', 'Storage is not available', { cause: error });
    case 'NotFoundError':
      return new StorageError('not-found', 'Not found', { cause: error });
    default:
      return new StorageError('unknown', 'Storage failed', { cause: error });
  }
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

/** Abort the entire cascade even if a later request throws synchronously (e.g. quota exceeded). */
async function atomic<T>(
  database: IDBDatabase,
  names: string[],
  work: (tx: IDBTransaction) => Promise<T>,
): Promise<T> {
  const tx = database.transaction(names, 'readwrite');
  const completion = done(tx);
  // Attach a handler immediately; work may still be awaiting a request when the transaction aborts.
  void completion.catch(() => undefined);
  try {
    const result = await work(tx);
    await completion;
    return result;
  } catch (error) {
    if (tx.error === null) {
      try {
        tx.abort();
      } catch (abortError) {
        // A completed/aborted transaction cannot be aborted again; the original failure is reported.
        if (!(abortError instanceof DOMException) || abortError.name !== 'InvalidStateError')
          throw abortError;
      }
    }
    await completion.catch(() => undefined);
    throw error;
  }
}

/** v5: queue everything already stored for the first sync, stamped with its own timestamps. */
function seedSyncMeta(tx: IDBTransaction): void {
  const meta = tx.objectStore(SYNC_META);
  const seed = (store: string, kind: SyncKind, stamp: (row: Record<string, unknown>) => number) => {
    const cursorRequest = tx.objectStore(store).openCursor();
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) return;
      const row = cursor.value as Record<string, unknown> & { id: string; bookId?: string };
      const entry: SyncMeta = {
        key: metaKey(kind, row.id),
        kind,
        id: row.id,
        bookId: kind === 'book' ? row.id : (row.bookId ?? ''),
        updatedAt: stamp(row),
        deleted: false,
        device: '',
        pending: 1,
      };
      meta.put(entry);
      cursor.continue();
    };
  };
  const num = (value: unknown) => (typeof value === 'number' ? value : 0);
  seed(BOOKS, 'book', (row) => num(row.lastOpenedAt) || num(row.addedAt));
  seed(BOOKMARKS, 'bookmark', (row) => num(row.createdAt));
  seed(HIGHLIGHTS, 'highlight', (row) => num(row.createdAt));
  seed(NOTES, 'note', (row) => num(row.updatedAt) || num(row.createdAt));
}

function upgrade(db: IDBDatabase, oldVersion: number, tx: IDBTransaction): void {
  if (oldVersion < 1) {
    db.createObjectStore(BOOKS, { keyPath: 'id' });
    db.createObjectStore(FILES);
  }
  if (oldVersion < 2) {
    db.createObjectStore(BOOKMARKS, { keyPath: 'id' }).createIndex(BY_BOOK, 'bookId');
  }
  if (oldVersion < 3) {
    db.createObjectStore(HIGHLIGHTS, { keyPath: 'id' }).createIndex(BY_BOOK, 'bookId');
  }
  if (oldVersion < 4) {
    const notes = db.createObjectStore(NOTES, { keyPath: 'id' });
    notes.createIndex(BY_BOOK, 'bookId');
    notes.createIndex(BY_HIGHLIGHT, 'target.highlightId');
  }
  if (oldVersion < 5) {
    const meta = db.createObjectStore(SYNC_META, { keyPath: 'key' });
    meta.createIndex(BY_PENDING, 'pending');
    meta.createIndex(BY_BOOK, 'bookId');
    db.createObjectStore(SYNC_STATE);
    if (oldVersion > 0) seedSyncMeta(tx);
  }
  if (oldVersion < 6) {
    // Phase 09b: upload progress per book. Books stored before have no row, so they upload.
    db.createObjectStore(UPLOADS, { keyPath: 'bookId' });
  }
  if (oldVersion < 7) {
    // Phase 10: where each book was left on this device. Not synced, so no syncMeta rows.
    db.createObjectStore(READING, { keyPath: 'bookId' });
  }
  if (oldVersion < 8) {
    // Phase 11: a picture of page 1 per book, drawn on this device. Not synced.
    db.createObjectStore(COVERS, { keyPath: 'bookId' });
  }
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function defaultPersistence(): Promise<boolean> {
  return navigator.storage?.persist?.() ?? Promise.resolve(false);
}

/** The stored book record, without the computed `hasFile`. */
function storedBook(record: BookRecord): BookRecord {
  const { id, fileName, title, byteSize, addedAt, lastOpenedAt } = record;
  return { id, fileName, title, byteSize, addedAt, lastOpenedAt };
}

export interface IndexedDBStores {
  books: BookStore;
  bookmarks: BookmarkStore;
  highlights: HighlightStore;
  notes: NoteStore;
  sync: SyncStore;
  files: FileTransferStore;
  readingStates: ReadingStateStore;
  covers: CoverStore;
}

/** All stores share one database connection. */
export function createIndexedDBStores(options: IndexedDBBookStoreOptions = {}): IndexedDBStores {
  const now = options.now ?? Date.now;
  const requestPersistence = options.requestPersistence ?? defaultPersistence;
  let opening: Promise<IDBDatabase> | undefined;
  let askedForPersistence = false;
  let device: Promise<string> | undefined;

  function db(): Promise<IDBDatabase> {
    opening ??= new Promise<IDBDatabase>((resolve, reject) => {
      const factory = options.factory ?? globalThis.indexedDB;
      if (!factory) {
        reject(new StorageError('unavailable', 'IndexedDB is not available'));
        return;
      }
      const req = factory.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (event) => {
        if (req.transaction) upgrade(req.result, event.oldVersion, req.transaction);
      };
      req.onsuccess = () => {
        const database = req.result;
        // Another tab upgraded the schema: let it proceed; we reopen on next use.
        database.onversionchange = () => {
          database.close();
          opening = undefined;
        };
        resolve(database);
      };
      req.onerror = () => reject(toStorageError(req.error));
      req.onblocked = () => reject(new StorageError('unavailable', 'Database upgrade blocked'));
    }).catch((error: unknown) => {
      opening = undefined;
      throw toStorageError(error);
    });
    return opening;
  }

  async function guard<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      throw toStorageError(error);
    }
  }

  /** This device's id, created once and kept in `syncState`. */
  function deviceId(): Promise<string> {
    device ??= guard(async () => {
      const database = await db();
      const tx = database.transaction(SYNC_STATE, 'readwrite');
      const state = tx.objectStore(SYNC_STATE);
      let id = (await request(state.get('deviceId'))) as string | undefined;
      if (!id) {
        id = crypto.randomUUID();
        state.put(id, 'deviceId');
      }
      await done(tx);
      return id;
    }).catch((error: unknown) => {
      device = undefined;
      throw error;
    });
    return device;
  }

  /** Records a local change to (kind, id) in the same transaction as the change itself. */
  async function stamp(
    tx: IDBTransaction,
    me: string,
    kind: SyncKind,
    id: string,
    bookId: string,
    deleted: boolean,
  ): Promise<void> {
    const meta = tx.objectStore(SYNC_META);
    const previous = (await request(meta.get(metaKey(kind, id)))) as SyncMeta | undefined;
    const entry: SyncMeta = {
      key: metaKey(kind, id),
      kind,
      id,
      bookId,
      updatedAt: nextStamp(previous?.updatedAt, now()),
      deleted,
      device: me,
      pending: 1,
    };
    meta.put(entry);
  }

  /** Deletes a book's annotations; with `me`, stamps each deletion for sync. */
  async function deleteAnnotationsOf(
    tx: IDBTransaction,
    bookId: string,
    me: string | undefined,
  ): Promise<void> {
    for (const name of PER_BOOK) {
      const items = tx.objectStore(name);
      const ids = (await request(items.index(BY_BOOK).getAllKeys(bookId))) as string[];
      for (const id of ids) {
        items.delete(id);
        const kind = KIND_OF[name];
        if (me !== undefined && kind) await stamp(tx, me, kind, id, bookId, true);
      }
    }
  }

  const books: BookStore = {
    add: (file, fileName) =>
      guard(async () => {
        const bytes = await file.arrayBuffer();
        const id = await sha256Hex(bytes);
        const me = await deviceId();
        const database = await db();
        const record = await atomic(database, [BOOKS, FILES, SYNC_META], async (tx) => {
          const store = tx.objectStore(BOOKS);
          const existing = (await request(store.get(id))) as BookRecord | undefined;
          const time = now();
          const next: BookRecord = existing
            ? { ...storedBook(existing), lastOpenedAt: time }
            : {
                id,
                fileName,
                title: titleFromFileName(fileName),
                byteSize: file.size,
                addedAt: time,
                lastOpenedAt: time,
              };
          store.put(next);
          // A book known from another device, or removed from this one, gets its file back.
          if ((await request(tx.objectStore(FILES).getKey(id))) === undefined) {
            tx.objectStore(FILES).put(bytes, id);
          }
          await stamp(tx, me, 'book', id, id, false);
          return next;
        });

        if (!askedForPersistence) {
          askedForPersistence = true;
          // Best effort: browsers may decline, and reading still works either way.
          void requestPersistence().catch(() => false);
        }
        return { ...record, hasFile: true };
      }),

    list: () =>
      guard(async () => {
        const database = await db();
        const tx = database.transaction([BOOKS, FILES]);
        const [all, fileKeys] = await Promise.all([
          request(tx.objectStore(BOOKS).getAll()) as Promise<BookRecord[]>,
          request(tx.objectStore(FILES).getAllKeys()),
        ]);
        const withFile = new Set(fileKeys);
        return sortByRecentlyOpened(
          all.map((book) => ({ ...book, hasFile: withFile.has(book.id) })),
        );
      }),

    getBytes: (id) =>
      guard(async () => {
        const database = await db();
        const bytes = (await request(database.transaction(FILES).objectStore(FILES).get(id))) as
          ArrayBuffer | undefined;
        if (!bytes) throw new StorageError('not-found', `No stored file for book ${id}`);
        return new Uint8Array(bytes);
      }),

    markOpened: (id) =>
      guard(async () => {
        const me = await deviceId();
        const database = await db();
        await atomic(database, [BOOKS, SYNC_META], async (tx) => {
          const store = tx.objectStore(BOOKS);
          const record = (await request(store.get(id))) as BookRecord | undefined;
          if (!record) throw new StorageError('not-found', `No book ${id}`);
          store.put({ ...storedBook(record), lastOpenedAt: now() });
          await stamp(tx, me, 'book', id, id, false);
        });
      }),

    remove: (id) =>
      guard(async () => {
        const me = await deviceId();
        const database = await db();
        const names = [BOOKS, FILES, ...PER_BOOK, SYNC_META, UPLOADS, READING, COVERS];
        await atomic(database, names, async (tx) => {
          tx.objectStore(BOOKS).delete(id);
          tx.objectStore(FILES).delete(id);
          tx.objectStore(UPLOADS).delete(id);
          tx.objectStore(READING).delete(id);
          tx.objectStore(COVERS).delete(id);
          await deleteAnnotationsOf(tx, id, me);
          await stamp(tx, me, 'book', id, id, true);
        });
      }),

    removeFromDevice: (id) =>
      guard(async () => {
        const database = await db();
        const tx = database.transaction(FILES, 'readwrite');
        tx.objectStore(FILES).delete(id);
        await done(tx);
      }),

    putFile: (id, bytes) =>
      guard(async () => {
        // Copy into an ArrayBuffer of its own: IndexedDB stores the whole underlying buffer.
        const buffer = bytes.slice().buffer;
        const database = await db();
        await atomic(database, [BOOKS, FILES, UPLOADS], async (tx) => {
          if ((await request(tx.objectStore(BOOKS).getKey(id))) === undefined) {
            throw new StorageError('not-found', `No book ${id}`);
          }
          tx.objectStore(FILES).put(buffer, id);
          // It came from the cloud, so the cloud has it.
          const record: UploadRecord = { bookId: id, state: 'done', parts: [] };
          tx.objectStore(UPLOADS).put(record);
        });
        if (!askedForPersistence) {
          askedForPersistence = true;
          void requestPersistence().catch(() => false);
        }
      }),
  };

  /** list/put/remove for one per-book object store, in reading order. */
  function perBook<T extends { id: string; bookId: string }>(
    name: string,
    kind: SyncKind,
    order: (items: T[]) => T[],
  ): PerBookStore<T> {
    return {
      list: (bookId) =>
        guard(async () => {
          const database = await db();
          const all = (await request(
            database.transaction(name).objectStore(name).index(BY_BOOK).getAll(bookId),
          )) as T[];
          return order(all);
        }),

      put: (item) =>
        guard(async () => {
          const me = await deviceId();
          const database = await db();
          await atomic(database, [BOOKS, name, SYNC_META], async (tx) => {
            const book = await request(tx.objectStore(BOOKS).getKey(item.bookId));
            if (book === undefined) throw new StorageError('not-found', `No book ${item.bookId}`);
            tx.objectStore(name).put(item);
            await stamp(tx, me, kind, item.id, item.bookId, false);
          });
        }),

      remove: (id) =>
        guard(async () => {
          const me = await deviceId();
          const database = await db();
          await atomic(database, [name, SYNC_META], async (tx) => {
            const items = tx.objectStore(name);
            const existing = (await request(items.get(id))) as T | undefined;
            if (!existing) return;
            items.delete(id);
            await stamp(tx, me, kind, id, existing.bookId, true);
          });
        }),
    };
  }

  const highlights = perBook<Highlight>(HIGHLIGHTS, 'highlight', sortByPosition);
  const noteRows = perBook<Note>(NOTES, 'note', (rows) => rows);
  const notes: NoteStore = {
    list: (bookId) =>
      guard(async () => {
        const database = await db();
        const tx = database.transaction([NOTES, HIGHLIGHTS]);
        const [rows, passages] = await Promise.all([
          request(tx.objectStore(NOTES).index(BY_BOOK).getAll(bookId)) as Promise<Note[]>,
          request(tx.objectStore(HIGHLIGHTS).index(BY_BOOK).getAll(bookId)) as Promise<Highlight[]>,
        ]);
        return sortNotes(rows, passages);
      }),
    put: (note) =>
      guard(async () => {
        if (!validNote(note)) throw new Error('Invalid note');
        const me = await deviceId();
        const database = await db();
        await atomic(database, [BOOKS, HIGHLIGHTS, NOTES, SYNC_META], async (tx) => {
          if ((await request(tx.objectStore(BOOKS).getKey(note.bookId))) === undefined)
            throw new StorageError('not-found', 'Book no longer exists');
          if (note.target.kind === 'highlight') {
            const passage = (await request(
              tx.objectStore(HIGHLIGHTS).get(note.target.highlightId),
            )) as Highlight | undefined;
            if (
              !passage ||
              passage.bookId !== note.bookId ||
              passage.pageIndex !== note.target.pageIndex
            )
              throw new StorageError('not-found', 'Highlight no longer exists');
          }
          tx.objectStore(NOTES).put(note);
          await stamp(tx, me, 'note', note.id, note.bookId, false);
        });
      }),
    remove: noteRows.remove,
  };

  const sync: SyncStore = {
    deviceId,

    cursor: () =>
      guard(async () => {
        const database = await db();
        const value = await request(
          database.transaction(SYNC_STATE).objectStore(SYNC_STATE).get('cursor'),
        );
        return typeof value === 'number' ? value : 0;
      }),

    setCursor: (cursor) =>
      guard(async () => {
        const database = await db();
        const tx = database.transaction(SYNC_STATE, 'readwrite');
        tx.objectStore(SYNC_STATE).put(cursor, 'cursor');
        await done(tx);
      }),

    pending: () =>
      guard(async () => {
        const me = await deviceId();
        const database = await db();
        const tx = database.transaction(ALL_STORES);
        const metas = (await request(
          tx.objectStore(SYNC_META).index(BY_PENDING).getAll(1),
        )) as SyncMeta[];
        const items: SyncItem[] = [];
        for (const meta of metas.sort((a, b) => a.updatedAt - b.updatedAt)) {
          let data: unknown = null;
          if (!meta.deleted) {
            const row = (await request(tx.objectStore(STORE_OF[meta.kind]).get(meta.id))) as
              BookRecord | undefined;
            if (row === undefined) continue; // Written and removed before a stamp could matter.
            data = meta.kind === 'book' ? storedBook(row) : row;
          }
          items.push({
            kind: meta.kind,
            id: meta.id,
            bookId: meta.bookId,
            updatedAt: meta.updatedAt,
            deleted: meta.deleted,
            device: me,
            data,
          });
        }
        return items;
      }),

    markSynced: (items) =>
      guard(async () => {
        const database = await db();
        const tx = database.transaction(SYNC_META, 'readwrite');
        const store = tx.objectStore(SYNC_META);
        for (const item of items) {
          const meta = (await request(store.get(metaKey(item.kind, item.id)))) as
            SyncMeta | undefined;
          // Changed again while the request was in flight: keep it pending.
          if (meta && meta.pending === 1 && meta.updatedAt === item.updatedAt) {
            store.put({ ...meta, device: item.device, pending: 0 });
          }
        }
        await done(tx);
      }),

    applyRemote: (items) =>
      guard(async () => {
        const database = await db();
        return atomic(database, ALL_STORES, async (tx) => {
          const metas = tx.objectStore(SYNC_META);
          let applied = 0;
          for (const item of items) {
            const key = metaKey(item.kind, item.id);
            const current = (await request(metas.get(key))) as SyncMeta | undefined;
            if (!shouldApply(current, item)) continue;
            const store = tx.objectStore(STORE_OF[item.kind]);
            if (item.deleted) {
              store.delete(item.id);
              if (item.kind === 'book') {
                tx.objectStore(FILES).delete(item.id);
                tx.objectStore(UPLOADS).delete(item.id);
                tx.objectStore(READING).delete(item.id);
                tx.objectStore(COVERS).delete(item.id);
                await deleteAnnotationsOf(tx, item.id, undefined);
              }
            } else if (typeof item.data === 'object' && item.data !== null) {
              if (item.kind === 'note' && !validNote(item.data as Note)) continue;
              store.put(item.kind === 'book' ? storedBook(item.data as BookRecord) : item.data);
            } else {
              continue;
            }
            const entry: SyncMeta = {
              key,
              kind: item.kind,
              id: item.id,
              bookId: item.bookId,
              updatedAt: item.updatedAt,
              deleted: item.deleted,
              device: item.device,
              pending: 0,
            };
            metas.put(entry);
            applied++;
          }
          return { applied };
        });
      }),
  };

  const files: FileTransferStore = {
    pendingUploads: () =>
      guard(async () => {
        const database = await db();
        const tx = database.transaction([BOOKS, FILES, UPLOADS]);
        const [all, fileKeys, uploads] = await Promise.all([
          request(tx.objectStore(BOOKS).getAll()) as Promise<BookRecord[]>,
          request(tx.objectStore(FILES).getAllKeys()),
          request(tx.objectStore(UPLOADS).getAll()) as Promise<UploadRecord[]>,
        ]);
        const withFile = new Set(fileKeys);
        const byBook = new Map(uploads.map((u) => [u.bookId, u]));
        return all
          .filter((book) => withFile.has(book.id) && byBook.get(book.id)?.state !== 'done')
          .sort((a, b) => a.addedAt - b.addedAt)
          .map((book) => {
            const upload = byBook.get(book.id);
            return upload
              ? { book: { ...book, hasFile: true }, upload }
              : { book: { ...book, hasFile: true } };
          });
      }),

    saveUpload: (record) =>
      guard(async () => {
        const database = await db();
        await atomic(database, [BOOKS, UPLOADS], async (tx) => {
          if ((await request(tx.objectStore(BOOKS).getKey(record.bookId))) === undefined) return;
          tx.objectStore(UPLOADS).put(record);
        });
      }),
  };

  const readingStates: ReadingStateStore = {
    get: (bookId) =>
      guard(async () => {
        const database = await db();
        const row: unknown = await request(
          database.transaction(READING).objectStore(READING).get(bookId),
        );
        return validReadingState(row) ? row : null;
      }),

    list: () =>
      guard(async () => {
        const database = await db();
        const rows = (await request(
          database.transaction(READING).objectStore(READING).getAll(),
        )) as unknown[];
        return rows.filter(validReadingState);
      }),

    put: (state) =>
      guard(async () => {
        if (!validReadingState(state)) {
          console.error('Not saving a malformed reading state', state);
          return;
        }
        const { bookId, position, zoom, savedAt, pageCount } = state;
        const row: ReadingState = { bookId, position: { ...position }, zoom, savedAt };
        if (pageCount !== undefined) row.pageCount = pageCount;
        const database = await db();
        await atomic(database, [BOOKS, READING], async (tx) => {
          if ((await request(tx.objectStore(BOOKS).getKey(bookId))) === undefined) return;
          tx.objectStore(READING).put(row);
        });
      }),
  };

  const covers: CoverStore = {
    list: () =>
      guard(async () => {
        const database = await db();
        const rows = (await request(
          database.transaction(COVERS).objectStore(COVERS).getAll(),
        )) as unknown[];
        return rows.filter(
          (row): row is Cover =>
            typeof row === 'object' &&
            row !== null &&
            typeof (row as Cover).bookId === 'string' &&
            // Not instanceof: a cloned buffer may come from another realm.
            Object.prototype.toString.call((row as Cover).bytes) === '[object ArrayBuffer]' &&
            typeof (row as Cover).type === 'string',
        );
      }),

    put: ({ bookId, bytes, type }) =>
      guard(async () => {
        const database = await db();
        await atomic(database, [BOOKS, COVERS], async (tx) => {
          if ((await request(tx.objectStore(BOOKS).getKey(bookId))) === undefined) return;
          const row: Cover = { bookId, bytes, type };
          tx.objectStore(COVERS).put(row);
        });
      }),
  };

  return {
    books,
    files,
    readingStates,
    covers,
    bookmarks: perBook<Bookmark>(BOOKMARKS, 'bookmark', sortByPage),
    highlights: {
      ...highlights,
      remove: (id) =>
        guard(async () => {
          const me = await deviceId();
          const database = await db();
          await atomic(database, [HIGHLIGHTS, NOTES, SYNC_META], async (tx) => {
            const passages = tx.objectStore(HIGHLIGHTS);
            const passage = (await request(passages.get(id))) as Highlight | undefined;
            if (!passage) return;
            passages.delete(id);
            await stamp(tx, me, 'highlight', id, passage.bookId, true);
            const items = tx.objectStore(NOTES);
            const noteIds = (await request(items.index(BY_HIGHLIGHT).getAllKeys(id))) as string[];
            for (const noteId of noteIds) {
              items.delete(noteId);
              await stamp(tx, me, 'note', noteId, passage.bookId, true);
            }
          });
        }),
    },
    notes,
    sync,
  };
}
