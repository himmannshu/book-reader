// @vitest-environment node
import { IDBFactory, IDBObjectStore as FakeObjectStore } from 'fake-indexeddb';
import { describe, expect, it, vi } from 'vitest';
import type { Highlight } from '../core/highlights';
import { noteId, type Note, type NoteTarget } from '../core/notes';
import { createIndexedDBStores, DB_NAME } from './indexeddb-book-store';

const target: NoteTarget = { kind: 'page', pageIndex: 0 };
const makeNote = (bookId: string, to: NoteTarget = target, text = 'First\n第二 📖'): Note => ({
  id: noteId(bookId, to),
  bookId,
  target: to,
  text,
  createdAt: 1,
  updatedAt: 2,
});
const highlight = (bookId: string, id = 'h'): Highlight => ({
  id,
  bookId,
  pageIndex: 0,
  rects: [{ pageIndex: 0, x: 72, y: 700, width: 120, height: 14 }],
  quote: 'foot of page',
  createdAt: 1,
});
const setup = () =>
  createIndexedDBStores({ factory: new IDBFactory(), requestPersistence: async () => true });
const addBook = (stores: ReturnType<typeof setup>, text = 'a') =>
  stores.books.add(new Blob([`%PDF ${text}`]), `${text}.pdf`);

describe('note persistence', () => {
  it('keeps one note per target, preserves entered text and refuses blank edits', async () => {
    const stores = setup();
    const book = await addBook(stores);
    const first = makeNote(book.id);
    await stores.notes.put(first);
    await stores.notes.put({ ...first, text: 'Edited\n中文', updatedAt: 3 });
    await expect(stores.notes.put({ ...first, text: ' \n ' })).rejects.toThrow();
    await expect(stores.notes.put({ ...first, id: 'duplicate' })).rejects.toThrow();
    expect(await stores.notes.list(book.id)).toEqual([
      { ...first, text: 'Edited\n中文', updatedAt: 3 },
    ]);
  });

  it('validates the book and highlight association before saving', async () => {
    const stores = setup();
    const a = await addBook(stores);
    const b = await addBook(stores, 'b');
    await stores.highlights.put(highlight(a.id));
    const link: NoteTarget = { kind: 'highlight', pageIndex: 0, highlightId: 'h' };
    await expect(stores.notes.put(makeNote('missing'))).rejects.toMatchObject({
      kind: 'not-found',
    });
    await expect(stores.notes.put(makeNote(b.id, link))).rejects.toMatchObject({
      kind: 'not-found',
    });
    await expect(stores.notes.put(makeNote(a.id, { ...link, pageIndex: 1 }))).rejects.toThrow();
    expect(await stores.notes.list(a.id)).toEqual([]);
    await stores.notes.put(makeNote(a.id, link));
    expect(await stores.notes.list(b.id)).toEqual([]);
  });

  it('deletes a highlight and its note atomically, keeping other notes', async () => {
    const stores = setup();
    const book = await addBook(stores);
    await stores.highlights.put(highlight(book.id));
    const linked = makeNote(book.id, { kind: 'highlight', pageIndex: 0, highlightId: 'h' });
    await stores.notes.put(linked);
    await stores.notes.put(makeNote(book.id));
    const original = FakeObjectStore.prototype.delete;
    const failure = vi.spyOn(FakeObjectStore.prototype, 'delete').mockImplementation(function (
      this: InstanceType<typeof FakeObjectStore>,
      key,
    ) {
      if (this.name === 'notes') throw new DOMException('Full', 'QuotaExceededError');
      return original.call(this, key);
    });
    try {
      await expect(stores.highlights.remove('h')).rejects.toMatchObject({ kind: 'quota' });
    } finally {
      failure.mockRestore();
    }
    expect(await stores.highlights.list(book.id)).toEqual([highlight(book.id)]);
    expect(await stores.notes.list(book.id)).toHaveLength(2);
    await stores.highlights.remove('h');
    expect(await stores.highlights.list(book.id)).toEqual([]);
    expect(await stores.notes.list(book.id)).toEqual([makeNote(book.id)]);
  });

  it('removing a note leaves its highlight; removing a book deletes both kinds of note', async () => {
    const stores = setup();
    const a = await addBook(stores);
    const b = await addBook(stores, 'b');
    await stores.highlights.put(highlight(a.id));
    const linked = makeNote(a.id, { kind: 'highlight', pageIndex: 0, highlightId: 'h' });
    await stores.notes.put(linked);
    await stores.notes.remove(linked.id);
    expect(await stores.highlights.list(a.id)).toHaveLength(1);
    await stores.notes.put(linked);
    await stores.notes.put(makeNote(a.id));
    await stores.notes.put(makeNote(b.id));
    await stores.books.remove(a.id);
    expect(await stores.notes.list(a.id)).toEqual([]);
    expect(await stores.highlights.list(a.id)).toEqual([]);
    expect(await stores.notes.list(b.id)).toEqual([makeNote(b.id)]);
  });

  it('upgrades a populated v3 database without rewriting books, bytes, bookmarks or highlights', async () => {
    const factory = new IDBFactory();
    const old = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = factory.open(DB_NAME, 3);
      req.onupgradeneeded = () => {
        req.result.createObjectStore('books', { keyPath: 'id' });
        req.result.createObjectStore('bookFiles');
        for (const name of ['bookmarks', 'highlights'])
          req.result.createObjectStore(name, { keyPath: 'id' }).createIndex('bookId', 'bookId');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const record = {
      id: 'old',
      fileName: 'old.pdf',
      title: 'old',
      byteSize: 4,
      addedAt: 1,
      lastOpenedAt: 2,
    };
    const mark = { id: 'old:0', bookId: 'old', pageIndex: 0, label: 'Page 1', createdAt: 1 };
    const tx = old.transaction(['books', 'bookFiles', 'bookmarks', 'highlights'], 'readwrite');
    tx.objectStore('books').put(record);
    tx.objectStore('bookFiles').put(new TextEncoder().encode('%PDF').buffer, 'old');
    tx.objectStore('bookmarks').put(mark);
    tx.objectStore('highlights').put(highlight('old'));
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onabort = () => reject(tx.error);
    });
    old.close();
    const stores = createIndexedDBStores({ factory });
    expect(await stores.notes.list('old')).toEqual([]);
    expect(await stores.books.list()).toEqual([record]);
    expect(new TextDecoder().decode(await stores.books.getBytes('old'))).toBe('%PDF');
    expect(await stores.bookmarks.list('old')).toEqual([mark]);
    expect(await stores.highlights.list('old')).toEqual([highlight('old')]);
    await stores.notes.put(makeNote('old'));
    expect(await stores.notes.list('old')).toEqual([makeNote('old')]);
  });
});
