// Phase 10: where each book was left, kept on this device only.
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it, vi } from 'vitest';
import type { Bookmark } from '../core/bookmarks';
import type { ReadingState } from '../core/reading-state';
import type { SyncItem } from '../core/sync';
import { DB_NAME, createIndexedDBStores } from './indexeddb-book-store';

function setup(factory = new IDBFactory()) {
  let clock = 1_000;
  return createIndexedDBStores({
    factory,
    now: () => ++clock,
    requestPersistence: async () => true,
  });
}

const pdf = (text: string) => new Blob([`%PDF-1.7 ${text}`]);

const stateOf = (bookId: string, over: Partial<ReadingState> = {}): ReadingState => ({
  bookId,
  position: { pageIndex: 7, fraction: 0.4, pixelsAbove: 0 },
  zoom: 150,
  savedAt: 5,
  ...over,
});

describe('reading state', () => {
  it('is empty for a book never read here, then returns what was saved', async () => {
    const s = setup();
    const book = await s.books.add(pdf('a'), 'a.pdf');
    expect(await s.readingStates.get(book.id)).toBeNull();

    await s.readingStates.put(stateOf(book.id));
    expect(await s.readingStates.get(book.id)).toEqual(stateOf(book.id));

    await s.readingStates.put(stateOf(book.id, { zoom: 'fit-page', savedAt: 9 }));
    expect(await s.readingStates.get(book.id)).toMatchObject({ zoom: 'fit-page', savedAt: 9 });
  });

  it('is never queued for sync', async () => {
    const s = setup();
    const book = await s.books.add(pdf('a'), 'a.pdf');
    const before = await s.sync.pending();
    await s.readingStates.put(stateOf(book.id));
    expect(await s.sync.pending()).toEqual(before);
  });

  it('ignores a save for a book that is not in the library (deleted while open)', async () => {
    const s = setup();
    await s.readingStates.put(stateOf('gone'));
    expect(await s.readingStates.get('gone')).toBeNull();
  });

  it('ignores a damaged record', async () => {
    const s = setup();
    const book = await s.books.add(pdf('a'), 'a.pdf');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await s.readingStates.put({ ...stateOf(book.id), zoom: 'huge' } as unknown as ReadingState);
    expect(await s.readingStates.get(book.id)).toBeNull();
    vi.restoreAllMocks();
  });

  it('is deleted with the book', async () => {
    const s = setup();
    const book = await s.books.add(pdf('a'), 'a.pdf');
    await s.readingStates.put(stateOf(book.id));
    await s.books.remove(book.id);
    expect(await s.readingStates.get(book.id)).toBeNull();
  });

  it('is kept when only the file is removed from this device', async () => {
    const s = setup();
    const book = await s.books.add(pdf('a'), 'a.pdf');
    await s.readingStates.put(stateOf(book.id));
    await s.books.removeFromDevice(book.id);
    expect(await s.readingStates.get(book.id)).toEqual(stateOf(book.id));
  });

  it('is deleted when another device deletes the book', async () => {
    const s = setup();
    const book = await s.books.add(pdf('a'), 'a.pdf');
    await s.readingStates.put(stateOf(book.id));
    const deletion: SyncItem = {
      kind: 'book',
      id: book.id,
      bookId: book.id,
      updatedAt: 1e12,
      deleted: true,
      device: 'other',
      data: null,
    };
    await s.sync.applyRemote([deletion]);
    expect(await s.readingStates.get(book.id)).toBeNull();
  });
});

describe('upgrading an existing v6 database', () => {
  it('keeps books, files, annotations, sync state and uploads, and adds reading state', async () => {
    const factory = new IDBFactory();
    const mark: Bookmark = {
      id: 'old:1',
      bookId: 'old',
      pageIndex: 1,
      label: 'Page 2',
      createdAt: 5,
    };
    // A v6 database the way phase 09b left it.
    await new Promise<void>((resolve, reject) => {
      const req = factory.open(DB_NAME, 6);
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore('books', { keyPath: 'id' });
        db.createObjectStore('bookFiles');
        db.createObjectStore('bookmarks', { keyPath: 'id' }).createIndex('bookId', 'bookId');
        db.createObjectStore('highlights', { keyPath: 'id' }).createIndex('bookId', 'bookId');
        const notes = db.createObjectStore('notes', { keyPath: 'id' });
        notes.createIndex('bookId', 'bookId');
        notes.createIndex('highlightId', 'target.highlightId');
        const meta = db.createObjectStore('syncMeta', { keyPath: 'key' });
        meta.createIndex('pending', 'pending');
        meta.createIndex('bookId', 'bookId');
        db.createObjectStore('syncState');
        db.createObjectStore('uploads', { keyPath: 'bookId' });
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(
          ['books', 'bookFiles', 'bookmarks', 'syncState', 'uploads'],
          'readwrite',
        );
        tx.objectStore('books').put({
          id: 'old',
          fileName: 'old.pdf',
          title: 'Old',
          byteSize: 4,
          addedAt: 10,
          lastOpenedAt: 20,
        });
        tx.objectStore('bookFiles').put(new TextEncoder().encode('%PDF').buffer, 'old');
        tx.objectStore('bookmarks').put(mark);
        tx.objectStore('syncState').put('dev-1', 'deviceId');
        tx.objectStore('syncState').put(42, 'cursor');
        tx.objectStore('uploads').put({ bookId: 'old', state: 'done', parts: [] });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });

    const s = setup(factory);
    expect((await s.books.list()).map((b) => [b.id, b.hasFile])).toEqual([['old', true]]);
    expect(await s.bookmarks.list('old')).toEqual([mark]);
    expect(await s.sync.deviceId()).toBe('dev-1');
    expect(await s.sync.cursor()).toBe(42);
    expect(await s.files.pendingUploads()).toEqual([]);
    expect(await s.readingStates.get('old')).toBeNull();
    await s.readingStates.put(stateOf('old'));
    expect(await s.readingStates.get('old')).toEqual(stateOf('old'));
  });
});
