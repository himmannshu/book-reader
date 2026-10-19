// @vitest-environment node
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import type { Bookmark } from '../core/bookmarks';
import { DB_NAME, DB_VERSION, createIndexedDBStores, toStorageError } from './indexeddb-book-store';
import { StorageError } from './types';

function setup() {
  const factory = new IDBFactory();
  let clock = 1_000;
  let persistCalls = 0;
  const stores = createIndexedDBStores({
    factory,
    now: () => ++clock,
    requestPersistence: async () => {
      persistCalls++;
      return true;
    },
  });
  return {
    store: stores.books,
    bookmarks: stores.bookmarks,
    factory,
    persistCalls: () => persistCalls,
  };
}

const pdf = (text: string) => new Blob([`%PDF-1.7 ${text}`], { type: 'application/pdf' });

describe('IndexedDB book store', () => {
  it('saves a book and lists it with a title from the file name', async () => {
    const { store } = setup();
    const record = await store.add(pdf('one'), 'My_Book.pdf');
    expect(record).toMatchObject({
      fileName: 'My_Book.pdf',
      title: 'My Book',
      byteSize: '%PDF-1.7 one'.length,
    });
    expect(record.id).toMatch(/^[0-9a-f]{64}$/);
    expect(await store.list()).toEqual([record]);
  });

  it('returns the stored bytes unchanged', async () => {
    const { store } = setup();
    const record = await store.add(pdf('bytes'), 'b.pdf');
    const bytes = await store.getBytes(record.id);
    expect(new TextDecoder().decode(bytes)).toBe('%PDF-1.7 bytes');
  });

  it('keeps one entry when the same file is added twice, and marks it opened again', async () => {
    const { store } = setup();
    const first = await store.add(pdf('same'), 'a.pdf');
    const second = await store.add(pdf('same'), 'a copy.pdf');
    expect(second.id).toBe(first.id);
    expect(second.lastOpenedAt).toBeGreaterThan(first.lastOpenedAt);
    expect(await store.list()).toHaveLength(1);
  });

  it('lists books most recently opened first', async () => {
    const { store } = setup();
    const a = await store.add(pdf('a'), 'a.pdf');
    await store.add(pdf('b'), 'b.pdf');
    await store.markOpened(a.id);
    expect((await store.list()).map((b) => b.fileName)).toEqual(['a.pdf', 'b.pdf']);
  });

  it('removes a book and its file', async () => {
    const { store } = setup();
    const record = await store.add(pdf('gone'), 'gone.pdf');
    await store.remove(record.id);
    expect(await store.list()).toEqual([]);
    await expect(store.getBytes(record.id)).rejects.toMatchObject({ kind: 'not-found' });
  });

  it('reports a missing book as not-found', async () => {
    const { store } = setup();
    await expect(store.getBytes('nope')).rejects.toBeInstanceOf(StorageError);
    await expect(store.markOpened('nope')).rejects.toMatchObject({ kind: 'not-found' });
  });

  it('asks for persistent storage after the first save only', async () => {
    const { store, persistCalls } = setup();
    await store.add(pdf('1'), '1.pdf');
    await store.add(pdf('2'), '2.pdf');
    expect(persistCalls()).toBe(1);
  });

  it('creates schema version 2 with separate metadata, file and bookmark stores', async () => {
    const { store, factory } = setup();
    await store.list();
    const db = await openRaw(factory);
    expect(db.version).toBe(DB_VERSION);
    expect(DB_VERSION).toBe(2);
    expect([...db.objectStoreNames].sort()).toEqual(['bookFiles', 'bookmarks', 'books']);
    db.close();
  });

  it('keeps books saved under schema version 1 when upgrading', async () => {
    const factory = new IDBFactory();
    const old = await openRaw(factory, 1, (db) => {
      db.createObjectStore('books', { keyPath: 'id' });
      db.createObjectStore('bookFiles');
    });
    const record = {
      id: 'v1',
      fileName: 'old.pdf',
      title: 'old',
      byteSize: 4,
      addedAt: 1,
      lastOpenedAt: 1,
    };
    const tx = old.transaction(['books', 'bookFiles'], 'readwrite');
    tx.objectStore('books').put(record);
    tx.objectStore('bookFiles').put(new TextEncoder().encode('%PDF').buffer, 'v1');
    await new Promise((resolve) => (tx.oncomplete = resolve));
    old.close();

    const { books, bookmarks } = createIndexedDBStores({ factory });
    expect(await books.list()).toEqual([record]);
    expect(new TextDecoder().decode(await books.getBytes('v1'))).toBe('%PDF');
    await bookmarks.put(mark('v1', 2));
    expect(await bookmarks.list('v1')).toEqual([mark('v1', 2)]);
  });
});

function openRaw(
  factory: IDBFactory,
  version?: number,
  upgrade?: (db: IDBDatabase) => void,
): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(DB_NAME, version);
    if (upgrade) request.onupgradeneeded = () => upgrade(request.result);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function mark(bookId: string, pageIndex: number, label = `Page ${pageIndex + 1}`): Bookmark {
  return { id: `${bookId}:${pageIndex}`, bookId, pageIndex, label, createdAt: 5 };
}

describe('IndexedDB bookmark store', () => {
  it("lists a book's bookmarks in page order, and only that book's", async () => {
    const { store, bookmarks } = setup();
    const a = await store.add(pdf('a'), 'a.pdf');
    const b = await store.add(pdf('b'), 'b.pdf');
    await bookmarks.put(mark(a.id, 9));
    await bookmarks.put(mark(a.id, 2));
    await bookmarks.put(mark(b.id, 4));
    expect((await bookmarks.list(a.id)).map((m) => m.pageIndex)).toEqual([2, 9]);
    expect(await bookmarks.list(b.id)).toEqual([mark(b.id, 4)]);
  });

  it('keeps one bookmark per id', async () => {
    const { store, bookmarks } = setup();
    const a = await store.add(pdf('a'), 'a.pdf');
    await bookmarks.put(mark(a.id, 3, 'first'));
    await bookmarks.put(mark(a.id, 3, 'second'));
    expect(await bookmarks.list(a.id)).toEqual([mark(a.id, 3, 'second')]);
  });

  it('removes a bookmark', async () => {
    const { store, bookmarks } = setup();
    const a = await store.add(pdf('a'), 'a.pdf');
    await bookmarks.put(mark(a.id, 3));
    await bookmarks.put(mark(a.id, 4));
    await bookmarks.remove(mark(a.id, 3).id);
    expect(await bookmarks.list(a.id)).toEqual([mark(a.id, 4)]);
  });

  it("removes a book's bookmarks together with the book", async () => {
    const { store, bookmarks } = setup();
    const a = await store.add(pdf('a'), 'a.pdf');
    const b = await store.add(pdf('b'), 'b.pdf');
    await bookmarks.put(mark(a.id, 1));
    await bookmarks.put(mark(b.id, 1));
    await store.remove(a.id);
    expect(await bookmarks.list(a.id)).toEqual([]);
    expect(await bookmarks.list(b.id)).toEqual([mark(b.id, 1)]);
  });

  it('refuses a bookmark for a book that is not stored', async () => {
    const { bookmarks } = setup();
    await expect(bookmarks.put(mark('nope', 0))).rejects.toMatchObject({ kind: 'not-found' });
    expect(await bookmarks.list('nope')).toEqual([]);
  });
});

describe('toStorageError', () => {
  const domError = (name: string) => new DOMException('boom', name);

  it('maps a full disk to quota', () => {
    expect(toStorageError(domError('QuotaExceededError')).kind).toBe('quota');
  });

  it('maps browser modes that block storage to unavailable', () => {
    for (const name of ['InvalidStateError', 'SecurityError', 'UnknownError']) {
      expect(toStorageError(domError(name)).kind).toBe('unavailable');
    }
  });

  it('keeps a StorageError as it is and maps anything else to unknown', () => {
    const original = new StorageError('not-found', 'x');
    expect(toStorageError(original)).toBe(original);
    expect(toStorageError(new Error('odd')).kind).toBe('unknown');
  });
});
