import type { Bookmark } from '../core/bookmarks';
import type { Highlight } from '../core/highlights';

// The storage interface for books and their annotations (bookmarks, highlights). UI and viewer code depend only on these types; the
// IndexedDB adapter (and later the cloud adapter, phase 09) sits behind them.

export interface BookRecord {
  /** SHA-256 of the file, hex. The same file always gets the same id. */
  id: string;
  fileName: string;
  title: string;
  byteSize: number;
  /** Milliseconds since the epoch. */
  addedAt: number;
  lastOpenedAt: number;
}

export interface BookStore {
  /** Saves a book. Saving a file that is already stored keeps one entry and marks it opened. */
  add(file: Blob, fileName: string): Promise<BookRecord>;
  /** All stored books, most recently opened first. Does not load the files. */
  list(): Promise<BookRecord[]>;
  /** The book's bytes, fresh for each call (PDF.js may take ownership of the buffer). */
  getBytes(id: string): Promise<Uint8Array>;
  markOpened(id: string): Promise<void>;
  /** Deletes the book, its file, and its bookmarks and highlights. */
  remove(id: string): Promise<void>;
}

/** Items that belong to one stored book, such as its bookmarks or highlights. */
export interface PerBookStore<T extends { id: string; bookId: string }> {
  /** The book's items, in reading order. */
  list(bookId: string): Promise<T[]>;
  /** Saves an item, replacing one with the same id. Fails with not-found if the book isn't stored. */
  put(item: T): Promise<void>;
  remove(id: string): Promise<void>;
}

export type BookmarkStore = PerBookStore<Bookmark>;
export type HighlightStore = PerBookStore<Highlight>;

export type StorageErrorKind = 'quota' | 'unavailable' | 'not-found' | 'unknown';

export class StorageError extends Error {
  readonly kind: StorageErrorKind;

  constructor(kind: StorageErrorKind, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'StorageError';
    this.kind = kind;
  }
}
