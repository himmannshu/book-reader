// IndexedDB adapter for the book store (D5a in harness/context/architecture-decisions.md).
// Metadata and files live in separate object stores, so listing books never loads the PDFs.
import { sortByRecentlyOpened, titleFromFileName } from '../core/library';
import { StorageError, type BookRecord, type BookStore } from './types';

export const DB_NAME = 'book-reader';
/** Bump with a migration in `upgrade` whenever the stores or record shape change. */
export const DB_VERSION = 1;
const BOOKS = 'books';
const FILES = 'bookFiles';

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

function upgrade(db: IDBDatabase, oldVersion: number): void {
  if (oldVersion < 1) {
    db.createObjectStore(BOOKS, { keyPath: 'id' });
    db.createObjectStore(FILES);
  }
}

async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function defaultPersistence(): Promise<boolean> {
  return navigator.storage?.persist?.() ?? Promise.resolve(false);
}

export function createIndexedDBBookStore(options: IndexedDBBookStoreOptions = {}): BookStore {
  const now = options.now ?? Date.now;
  const requestPersistence = options.requestPersistence ?? defaultPersistence;
  let opening: Promise<IDBDatabase> | undefined;
  let askedForPersistence = false;

  function db(): Promise<IDBDatabase> {
    opening ??= new Promise<IDBDatabase>((resolve, reject) => {
      const factory = options.factory ?? globalThis.indexedDB;
      if (!factory) {
        reject(new StorageError('unavailable', 'IndexedDB is not available'));
        return;
      }
      const req = factory.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (event) => upgrade(req.result, event.oldVersion);
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

  return {
    add: (file, fileName) =>
      guard(async () => {
        const id = await sha256Hex(file);
        const database = await db();
        const tx = database.transaction([BOOKS, FILES], 'readwrite');
        const books = tx.objectStore(BOOKS);
        const existing = (await request(books.get(id))) as BookRecord | undefined;
        const time = now();
        const record: BookRecord = existing
          ? { ...existing, lastOpenedAt: time }
          : {
              id,
              fileName,
              title: titleFromFileName(fileName),
              byteSize: file.size,
              addedAt: time,
              lastOpenedAt: time,
            };
        books.put(record);
        if (!existing) tx.objectStore(FILES).put(file, id);
        await done(tx);

        if (!askedForPersistence) {
          askedForPersistence = true;
          // Best effort: browsers may decline, and reading still works either way.
          void requestPersistence().catch(() => false);
        }
        return record;
      }),

    list: () =>
      guard(async () => {
        const database = await db();
        const all = (await request(
          database.transaction(BOOKS).objectStore(BOOKS).getAll(),
        )) as BookRecord[];
        return sortByRecentlyOpened(all);
      }),

    getFile: (id) =>
      guard(async () => {
        const database = await db();
        const file = (await request(database.transaction(FILES).objectStore(FILES).get(id))) as
          Blob | undefined;
        if (!file) throw new StorageError('not-found', `No stored file for book ${id}`);
        return file;
      }),

    markOpened: (id) =>
      guard(async () => {
        const database = await db();
        const tx = database.transaction(BOOKS, 'readwrite');
        const books = tx.objectStore(BOOKS);
        const record = (await request(books.get(id))) as BookRecord | undefined;
        if (!record) throw new StorageError('not-found', `No book ${id}`);
        books.put({ ...record, lastOpenedAt: now() });
        await done(tx);
      }),

    remove: (id) =>
      guard(async () => {
        const database = await db();
        const tx = database.transaction([BOOKS, FILES], 'readwrite');
        tx.objectStore(BOOKS).delete(id);
        tx.objectStore(FILES).delete(id);
        await done(tx);
      }),
  };
}
