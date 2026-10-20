// Phase 09b: which book files still have to go to the cloud, and saving downloaded ones.
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import type { Bookmark } from '../core/bookmarks';
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

const remoteBook = (id: string, over: Partial<SyncItem> = {}): SyncItem => ({
  kind: 'book',
  id,
  bookId: id,
  updatedAt: 5_000,
  deleted: false,
  device: 'other-device',
  data: { id, fileName: 'r.pdf', title: 'R', byteSize: 4, addedAt: 1, lastOpenedAt: 2 },
  ...over,
});

const ids = async (s: ReturnType<typeof setup>) =>
  (await s.files.pendingUploads()).map(({ book }) => book.id);

describe('pending uploads', () => {
  it('lists books whose file is here and not yet in the cloud, oldest first', async () => {
    const s = setup();
    const a = await s.books.add(pdf('a'), 'a.pdf');
    const b = await s.books.add(pdf('b'), 'b.pdf');
    await s.sync.applyRemote([remoteBook('c'.repeat(64))]); // No file here: nothing to upload.
    expect(await ids(s)).toEqual([a.id, b.id]);

    await s.files.saveUpload({ bookId: a.id, state: 'done', parts: [] });
    expect(await ids(s)).toEqual([b.id]);
  });

  it('remembers an unfinished upload with its parts, so it can resume', async () => {
    const s = setup();
    const a = await s.books.add(pdf('a'), 'a.pdf');
    const record = {
      bookId: a.id,
      state: 'uploading' as const,
      uploadId: 'up-1',
      parts: [{ partNumber: 1, etag: 'e1' }],
    };
    await s.files.saveUpload(record);
    expect(await s.files.pendingUploads()).toEqual([
      { book: expect.objectContaining({ id: a.id }), upload: record },
    ]);
  });

  it('ignores progress for a book that no longer exists', async () => {
    const s = setup();
    await s.files.saveUpload({ bookId: 'gone', state: 'done', parts: [] });
    const a = await s.books.add(pdf('a'), 'a.pdf');
    expect(await ids(s)).toEqual([a.id]);
  });

  it('"delete everywhere", here or on another device, forgets the upload', async () => {
    const s = setup();
    const a = await s.books.add(pdf('a'), 'a.pdf');
    await s.files.saveUpload({ bookId: a.id, state: 'done', parts: [] });
    await s.books.remove(a.id);
    await s.books.add(pdf('a'), 'a.pdf');
    expect(await ids(s)).toEqual([a.id]);

    await s.files.saveUpload({ bookId: a.id, state: 'done', parts: [] });
    await s.sync.applyRemote([remoteBook(a.id, { deleted: true, data: null, updatedAt: 1e12 })]);
    await s.books.add(pdf('a'), 'a.pdf');
    expect(await ids(s)).toEqual([a.id]);
  });

  it('"remove from this device" leaves nothing to upload', async () => {
    const s = setup();
    const a = await s.books.add(pdf('a'), 'a.pdf');
    await s.books.removeFromDevice(a.id);
    expect(await ids(s)).toEqual([]);
  });
});

describe('saving a downloaded file', () => {
  it('stores the file of a book known from another device, which then needs no upload', async () => {
    const s = setup();
    const id = 'd'.repeat(64);
    await s.sync.applyRemote([remoteBook(id)]);
    const bytes = new TextEncoder().encode('%PDF');
    await s.books.putFile(id, bytes);
    expect((await s.books.list())[0]).toMatchObject({ id, hasFile: true });
    expect(Array.from(await s.books.getBytes(id))).toEqual(Array.from(bytes));
    expect(await ids(s)).toEqual([]);
    expect(await s.sync.pending()).toEqual([]);
  });

  it('refuses a file for a book that is not in the library', async () => {
    const s = setup();
    await expect(s.books.putFile('e'.repeat(64), new Uint8Array([1]))).rejects.toMatchObject({
      kind: 'not-found',
    });
  });
});

describe('upgrading an existing v5 database', () => {
  it('keeps books, annotations and sync state, and queues local files for upload', async () => {
    const factory = new IDBFactory();
    const mark: Bookmark = {
      id: 'old:1',
      bookId: 'old',
      pageIndex: 1,
      label: 'Page 2',
      createdAt: 5,
    };
    // A v5 database the way phase 09a left it.
    await new Promise<void>((resolve, reject) => {
      const req = factory.open(DB_NAME, 5);
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
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(
          ['books', 'bookFiles', 'bookmarks', 'syncMeta', 'syncState'],
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
        tx.objectStore('syncMeta').put({
          key: 'bookmark:old:1',
          kind: 'bookmark',
          id: 'old:1',
          bookId: 'old',
          updatedAt: 5,
          deleted: false,
          device: 'dev-1',
          pending: 1,
        });
        tx.objectStore('syncState').put('dev-1', 'deviceId');
        tx.objectStore('syncState').put(42, 'cursor');
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
    expect((await s.sync.pending()).map((i) => i.id)).toEqual(['old:1']);
    expect(await ids(s)).toEqual(['old']);
  });
});
