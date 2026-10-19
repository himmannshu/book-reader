// The storage interface for books. UI and viewer code depend only on these types; the
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
  getFile(id: string): Promise<Blob>;
  markOpened(id: string): Promise<void>;
  /** Deletes the book and its file. */
  remove(id: string): Promise<void>;
}

export type StorageErrorKind = 'quota' | 'unavailable' | 'not-found' | 'unknown';

export class StorageError extends Error {
  readonly kind: StorageErrorKind;

  constructor(kind: StorageErrorKind, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'StorageError';
    this.kind = kind;
  }
}
