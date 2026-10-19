// IndexedDB adapter for the book, bookmark and highlight stores (D5a in architecture-decisions.md).
// Metadata and files live in separate object stores, so listing books never loads the PDFs.
// Files are stored as ArrayBuffers, not Blobs: Safari's private browsing (and Playwright's WebKit)
// refuses Blobs in IndexedDB but accepts ArrayBuffers, at similar speed.
import { sortByPage, type Bookmark } from '../core/bookmarks';
import { sortByPosition, type Highlight } from '../core/highlights';
import { sortByRecentlyOpened, titleFromFileName } from '../core/library';
import { sortNotes, validNote, type Note } from '../core/notes';
import {
  StorageError,
  type BookRecord,
  type BookStore,
  type BookmarkStore,
  type HighlightStore,
  type NoteStore,
  type PerBookStore,
} from './types';

export const DB_NAME = 'book-reader';
/** Bump with a migration in `upgrade` whenever the stores or record shape change. */
export const DB_VERSION = 4;
const BOOKS = 'books';
const FILES = 'bookFiles';
const BOOKMARKS = 'bookmarks';
const HIGHLIGHTS = 'highlights';
const NOTES = 'notes';
/** Stores of items that belong to a book; each has an index on `bookId`. */
const PER_BOOK = [BOOKMARKS, HIGHLIGHTS, NOTES];
const BY_BOOK = 'bookId';
const BY_HIGHLIGHT = 'highlightId';

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

function upgrade(db: IDBDatabase, oldVersion: number): void {
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
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function defaultPersistence(): Promise<boolean> {
  return navigator.storage?.persist?.() ?? Promise.resolve(false);
}

export interface IndexedDBStores {
  books: BookStore;
  bookmarks: BookmarkStore;
  highlights: HighlightStore;
  notes: NoteStore;
}

/** Both stores share one database connection. */
export function createIndexedDBStores(options: IndexedDBBookStoreOptions = {}): IndexedDBStores {
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

  const books: BookStore = {
    add: (file, fileName) =>
      guard(async () => {
        const bytes = await file.arrayBuffer();
        const id = await sha256Hex(bytes);
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
        if (!existing) tx.objectStore(FILES).put(bytes, id);
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
        await atomic(database, [BOOKS, FILES, ...PER_BOOK], async (tx) => {
          tx.objectStore(BOOKS).delete(id);
          tx.objectStore(FILES).delete(id);
          for (const name of PER_BOOK) {
            const items = tx.objectStore(name);
            const keys = await request(items.index(BY_BOOK).getAllKeys(id));
            keys.forEach((key) => items.delete(key));
          }
        });
      }),
  };

  /** list/put/remove for one per-book object store, in reading order. */
  function perBook<T extends { id: string; bookId: string }>(
    name: string,
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
          const database = await db();
          const tx = database.transaction([BOOKS, name], 'readwrite');
          const book = await request(tx.objectStore(BOOKS).getKey(item.bookId));
          if (book === undefined) {
            tx.abort();
            throw new StorageError('not-found', `No book ${item.bookId}`);
          }
          tx.objectStore(name).put(item);
          await done(tx);
        }),

      remove: (id) =>
        guard(async () => {
          const database = await db();
          const tx = database.transaction(name, 'readwrite');
          tx.objectStore(name).delete(id);
          await done(tx);
        }),
    };
  }

  const highlights = perBook<Highlight>(HIGHLIGHTS, sortByPosition);
  const noteRows = perBook<Note>(NOTES, (rows) => rows);
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
        const database = await db();
        await atomic(database, [BOOKS, HIGHLIGHTS, NOTES], async (tx) => {
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
        });
      }),
    remove: noteRows.remove,
  };

  return {
    books,
    bookmarks: perBook<Bookmark>(BOOKMARKS, sortByPage),
    highlights: {
      ...highlights,
      remove: (id) =>
        guard(async () => {
          const database = await db();
          await atomic(database, [HIGHLIGHTS, NOTES], async (tx) => {
            tx.objectStore(HIGHLIGHTS).delete(id);
            const items = tx.objectStore(NOTES);
            const keys = await request(items.index(BY_HIGHLIGHT).getAllKeys(id));
            keys.forEach((key) => items.delete(key));
          });
        }),
    },
    notes,
  };
}
