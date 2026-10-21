import type { Bookmark } from '../core/bookmarks';
import type { Highlight } from '../core/highlights';
import type { Note } from '../core/notes';
import type { ReadingState, Theme } from '../core/reading-state';
import type { ShelfSort, ShelfView } from '../core/shelf';
import type { VoiceNote } from '../core/voice-notes';
import type { SyncItem } from '../core/sync';

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
  /**
   * Whether the PDF itself is on this device. False for a book known from another device (phase 09)
   * or removed from this device only. Computed when listing; never synced.
   */
  hasFile?: boolean;
}

export interface BookStore {
  /** Saves a book. Saving a file that is already stored keeps one entry and marks it opened. */
  add(file: Blob, fileName: string): Promise<BookRecord>;
  /** All stored books, most recently opened first. Does not load the files. */
  list(): Promise<BookRecord[]>;
  /** The book's bytes, fresh for each call (PDF.js may take ownership of the buffer). */
  getBytes(id: string): Promise<Uint8Array>;
  markOpened(id: string): Promise<void>;
  /** Deletes the book, its file and its annotations here, and (through sync) on every device. */
  remove(id: string): Promise<void>;
  /** Frees the file on this device only; the book and its annotations stay, here and elsewhere. */
  removeFromDevice(id: string): Promise<void>;
  /**
   * Saves a downloaded file for a book already in the library (phase 09b). The caller has checked
   * that its SHA-256 is the book id. Fails with not-found if the book isn't in the library.
   */
  putFile(id: string, bytes: Uint8Array): Promise<void>;
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
export type NoteStore = PerBookStore<Note>;

/** Where each book was left on this device (phase 10). Never synced; deleted with the book. */
export interface ReadingStateStore {
  /** The saved state, or null if the book was never read here (or the record is damaged). */
  get(bookId: string): Promise<ReadingState | null>;
  /** Saves the state; ignored if the book is no longer in the library. */
  put(state: ReadingState): Promise<void>;
  /** Every book's saved state (for the library's progress). Damaged records are left out. */
  list(): Promise<ReadingState[]>;
}

/** Voice notes (phase 15). On this device only; deleted with their book or highlight. */
export interface VoiceNoteStore {
  /** The book's voice notes (damaged records left out), in no particular order. */
  list(bookId: string): Promise<VoiceNote[]>;
  /** Saves a recording. Fails with not-found if the book isn't stored. */
  put(note: VoiceNote): Promise<void>;
  remove(id: string): Promise<void>;
}

/** A small picture of a book's first page (phase 11). */
export interface Cover {
  bookId: string;
  /** Image bytes (an ArrayBuffer: Safari refuses Blobs in IndexedDB). */
  bytes: ArrayBuffer;
  /** Media type, such as image/jpeg. */
  type: string;
  /**
   * The author from the PDF's metadata, read with the cover (phase 22): null when it has none.
   * Absent on covers drawn before phase 22, which are drawn again to read it.
   */
  author?: string | null;
}

/** Covers drawn on this device. Never synced; kept when only the file is removed. */
export interface CoverStore {
  list(): Promise<Cover[]>;
  /** Saves a cover; ignored if the book is no longer in the library. */
  put(cover: Cover): Promise<void>;
}

/** Small app-wide settings, read synchronously so the first render already uses them. */
export interface Preferences {
  theme(): Theme;
  setTheme(theme: Theme): void;
  shelfSort(): ShelfSort;
  setShelfSort(sort: ShelfSort): void;
  /** Grid or list on the library shelf (phase 22). */
  shelfView(): ShelfView;
  setShelfView(view: ShelfView): void;
}

/** Local bookkeeping for sync (phase 09a). Only the sync engine uses it. */
export interface SyncStore {
  /** This device's random, stable id. */
  deviceId(): Promise<string>;
  /** The server cursor after the last successful pull (0 before the first sync). */
  cursor(): Promise<number>;
  setCursor(cursor: number): Promise<void>;
  /** Local changes not yet accepted by the server, oldest first. */
  pending(): Promise<SyncItem[]>;
  /** Clears the pending flag for items that have not changed again since they were sent. */
  markSynced(items: readonly SyncItem[]): Promise<void>;
  /** Applies changes from other devices with last write wins; never marks them pending. */
  applyRemote(items: readonly SyncItem[]): Promise<{ applied: number }>;
}

/** Progress of copying one book's file to the cloud (phase 09b). */
export interface UploadRecord {
  bookId: string;
  /** done: the cloud has it; full: the cloud was full last time we tried. */
  state: 'uploading' | 'done' | 'full';
  uploadId?: string;
  /** Bytes per part, as the server chose when the upload started. */
  partSize?: number;
  /** Parts the server has accepted, so an interrupted upload resumes from the next one. */
  parts: { partNumber: number; etag: string }[];
}

/** Local bookkeeping for book files in the cloud. Only the uploader uses it. */
export interface FileTransferStore {
  /** Books whose file is on this device and not known to be in the cloud, oldest first. */
  pendingUploads(): Promise<{ book: BookRecord; upload?: UploadRecord }[]>;
  /** Saves upload progress; ignored if the book is no longer in the library. */
  saveUpload(record: UploadRecord): Promise<void>;
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
