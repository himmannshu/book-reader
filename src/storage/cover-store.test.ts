// Phase 11: covers drawn on this device, and every book's reading state for the shelf.
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
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
const jpeg = (byte: number) => ({
  bytes: new Uint8Array([0xff, 0xd8, byte]).buffer,
  type: 'image/jpeg',
});
const bytesOf = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)];

describe('covers', () => {
  it('are listed after saving, one per book (a new one replaces the old)', async () => {
    const s = setup();
    const a = await s.books.add(pdf('a'), 'a.pdf');
    const b = await s.books.add(pdf('b'), 'b.pdf');
    expect(await s.covers.list()).toEqual([]);
    await s.covers.put({ bookId: a.id, ...jpeg(1) });
    await s.covers.put({ bookId: b.id, ...jpeg(2) });
    await s.covers.put({ bookId: a.id, ...jpeg(3) });
    const listed = new Map((await s.covers.list()).map((c) => [c.bookId, bytesOf(c.bytes)]));
    expect(listed).toEqual(
      new Map([
        [a.id, [0xff, 0xd8, 3]],
        [b.id, [0xff, 0xd8, 2]],
      ]),
    );
  });

  it('keep the author read with them; one drawn before phase 22 has none recorded', async () => {
    const s = setup();
    const a = await s.books.add(pdf('a'), 'a.pdf');
    const b = await s.books.add(pdf('b'), 'b.pdf');
    const c = await s.books.add(pdf('c'), 'c.pdf');
    await s.covers.put({ bookId: a.id, ...jpeg(1), author: 'Mary Shelley' });
    await s.covers.put({ bookId: b.id, ...jpeg(2), author: null });
    await s.covers.put({ bookId: c.id, ...jpeg(3) });
    const authors = new Map((await s.covers.list()).map((cover) => [cover.bookId, cover]));
    expect(authors.get(a.id)?.author).toBe('Mary Shelley');
    expect(authors.get(b.id)?.author).toBeNull();
    expect(authors.get(c.id)).not.toHaveProperty('author');
  });

  it('are ignored for a book not in the library, and never queued for sync', async () => {
    const s = setup();
    const a = await s.books.add(pdf('a'), 'a.pdf');
    const before = await s.sync.pending();
    await s.covers.put({ bookId: 'gone', ...jpeg(1) });
    await s.covers.put({ bookId: a.id, ...jpeg(1) });
    expect((await s.covers.list()).map((c) => c.bookId)).toEqual([a.id]);
    expect(await s.sync.pending()).toEqual(before);
  });

  it('stay when only the file is removed, and go with the book here or from another device', async () => {
    const s = setup();
    const a = await s.books.add(pdf('a'), 'a.pdf');
    const b = await s.books.add(pdf('b'), 'b.pdf');
    await s.covers.put({ bookId: a.id, ...jpeg(1) });
    await s.covers.put({ bookId: b.id, ...jpeg(2) });
    await s.books.removeFromDevice(a.id);
    expect((await s.covers.list()).map((c) => c.bookId).sort()).toEqual([a.id, b.id].sort());

    await s.books.remove(a.id);
    const deletion: SyncItem = {
      kind: 'book',
      id: b.id,
      bookId: b.id,
      updatedAt: 1e12,
      deleted: true,
      device: 'other',
      data: null,
    };
    await s.sync.applyRemote([deletion]);
    expect(await s.covers.list()).toEqual([]);
  });
});

describe('reading states for the shelf', () => {
  it('lists every saved state, keeping the page count', async () => {
    const s = setup();
    const a = await s.books.add(pdf('a'), 'a.pdf');
    const state: ReadingState = {
      bookId: a.id,
      position: { pageIndex: 150, fraction: 0, pixelsAbove: 0 },
      zoom: 'fit-width',
      savedAt: 2,
      pageCount: 300,
    };
    await s.readingStates.put(state);
    expect(await s.readingStates.list()).toEqual([state]);
  });
});

describe('upgrading an existing v7 database', () => {
  it('keeps books and reading states and adds covers', async () => {
    const factory = new IDBFactory();
    // Build a v7 database through the phase 10 code path's shape.
    await new Promise<void>((resolve, reject) => {
      const req = factory.open(DB_NAME, 7);
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
        db.createObjectStore('readingState', { keyPath: 'bookId' });
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(['books', 'bookFiles', 'readingState'], 'readwrite');
        tx.objectStore('books').put({
          id: 'old',
          fileName: 'old.pdf',
          title: 'Old',
          byteSize: 4,
          addedAt: 10,
          lastOpenedAt: 20,
        });
        tx.objectStore('bookFiles').put(new TextEncoder().encode('%PDF').buffer, 'old');
        tx.objectStore('readingState').put({
          bookId: 'old',
          position: { pageIndex: 3, fraction: 0.5, pixelsAbove: 0 },
          zoom: 150,
          savedAt: 9,
        });
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
    expect(await s.readingStates.get('old')).toMatchObject({ zoom: 150, savedAt: 9 });
    expect(await s.covers.list()).toEqual([]);
    await s.covers.put({ bookId: 'old', ...jpeg(7) });
    expect((await s.covers.list()).map((c) => c.bookId)).toEqual(['old']);
  });
});
