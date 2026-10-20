// @vitest-environment node
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import type { Bookmark } from '../core/bookmarks';
import type { Highlight } from '../core/highlights';
import { noteId, type Note, type NoteTarget } from '../core/notes';
import type { SyncItem } from '../core/sync';
import { DB_NAME, createIndexedDBStores } from './indexeddb-book-store';

function setup(factory = new IDBFactory()) {
  let clock = 1_000;
  const stores = createIndexedDBStores({
    factory,
    now: () => ++clock,
    requestPersistence: async () => true,
  });
  return { ...stores, factory };
}

const pdf = (text: string) => new Blob([`%PDF-1.7 ${text}`]);

const bookmark = (bookId: string, pageIndex = 3): Bookmark => ({
  id: `${bookId}:${pageIndex}`,
  bookId,
  pageIndex,
  label: `Page ${pageIndex + 1}`,
  createdAt: 500,
});

const highlight = (bookId: string, id = 'h1'): Highlight => ({
  id,
  bookId,
  pageIndex: 0,
  rects: [{ pageIndex: 0, x: 1, y: 2, width: 3, height: 4 }],
  quote: 'quoted',
  createdAt: 600,
});

const PAGE_TARGET: NoteTarget = { kind: 'page', pageIndex: 1 };
const note = (bookId: string, target: NoteTarget = PAGE_TARGET): Note => ({
  id: noteId(bookId, target),
  bookId,
  target,
  text: 'a thought',
  createdAt: 700,
  updatedAt: 700,
});
const noteKey = (bookId: string, target: NoteTarget = PAGE_TARGET) =>
  `note:${noteId(bookId, target)}`;

const byKey = (items: SyncItem[]) => Object.fromEntries(items.map((i) => [`${i.kind}:${i.id}`, i]));

describe('sync bookkeeping in the local store', () => {
  it('records every local write as a pending change with an increasing stamp', async () => {
    const s = setup();
    const book = await s.books.add(pdf('a'), 'a.pdf');
    await s.bookmarks.put(bookmark(book.id));
    const first = byKey(await s.sync.pending());
    expect(Object.keys(first).sort()).toEqual([`book:${book.id}`, `bookmark:${book.id}:3`]);
    const device = await s.sync.deviceId();
    expect(first[`bookmark:${book.id}:3`]).toMatchObject({
      bookId: book.id,
      deleted: false,
      device,
      data: bookmark(book.id),
    });

    await s.bookmarks.put({ ...bookmark(book.id), label: 'renamed' });
    const second = byKey(await s.sync.pending());
    expect(second[`bookmark:${book.id}:3`]?.updatedAt).toBeGreaterThan(
      first[`bookmark:${book.id}:3`]?.updatedAt ?? Infinity,
    );
  });

  it('keeps the same device id across restarts', async () => {
    const factory = new IDBFactory();
    const a = await setup(factory).sync.deviceId();
    const b = await setup(factory).sync.deviceId();
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
    expect(b).toBe(a);
  });

  it('a removed annotation becomes a pending deletion', async () => {
    const s = setup();
    const book = await s.books.add(pdf('a'), 'a.pdf');
    await s.highlights.put(highlight(book.id));
    await s.highlights.remove('h1');
    expect(byKey(await s.sync.pending())['highlight:h1']).toMatchObject({
      deleted: true,
      data: null,
    });
  });

  it('removing a highlight also records its notes as deleted', async () => {
    const s = setup();
    const book = await s.books.add(pdf('a'), 'a.pdf');
    await s.highlights.put(highlight(book.id));
    const onPassage: NoteTarget = { kind: 'highlight', pageIndex: 0, highlightId: 'h1' };
    await s.notes.put(note(book.id, onPassage));
    await s.highlights.remove('h1');
    expect(byKey(await s.sync.pending())[noteKey(book.id, onPassage)]).toMatchObject({
      deleted: true,
    });
  });

  it('"delete everywhere" records the book and all its annotations as deleted', async () => {
    const s = setup();
    const book = await s.books.add(pdf('a'), 'a.pdf');
    await s.bookmarks.put(bookmark(book.id));
    await s.notes.put(note(book.id));
    await s.books.remove(book.id);
    const pending = byKey(await s.sync.pending());
    expect(pending[`book:${book.id}`]?.deleted).toBe(true);
    expect(pending[`bookmark:${book.id}:3`]?.deleted).toBe(true);
    expect(pending[noteKey(book.id)]?.deleted).toBe(true);
    expect(await s.books.list()).toEqual([]);
  });

  it('"remove from this device" drops only the file, and syncs nothing', async () => {
    const s = setup();
    const book = await s.books.add(pdf('a'), 'a.pdf');
    await s.bookmarks.put(bookmark(book.id));
    await s.sync.markSynced(await s.sync.pending());

    await s.books.removeFromDevice(book.id);
    expect(await s.sync.pending()).toEqual([]);
    const [listed] = await s.books.list();
    expect(listed).toMatchObject({ id: book.id, hasFile: false });
    await expect(s.books.getBytes(book.id)).rejects.toMatchObject({ kind: 'not-found' });
    expect(await s.bookmarks.list(book.id)).toHaveLength(1);

    // Importing the same file again brings the file back.
    await s.books.add(pdf('a'), 'a.pdf');
    expect((await s.books.list())[0]?.hasFile).toBe(true);
  });

  it('marking changes as synced clears only those that did not change meanwhile', async () => {
    const s = setup();
    const book = await s.books.add(pdf('a'), 'a.pdf');
    await s.bookmarks.put(bookmark(book.id));
    const sent = await s.sync.pending();
    await s.bookmarks.put({ ...bookmark(book.id), label: 'edited during sync' });
    await s.sync.markSynced(sent);
    expect(Object.keys(byKey(await s.sync.pending()))).toEqual([`bookmark:${book.id}:3`]);
  });

  it('remembers the sync cursor', async () => {
    const s = setup();
    expect(await s.sync.cursor()).toBe(0);
    await s.sync.setCursor(42);
    expect(await s.sync.cursor()).toBe(42);
  });
});

describe('applying changes from other devices', () => {
  const remote = (over: Partial<SyncItem>): SyncItem => ({
    kind: 'bookmark',
    id: 'x',
    bookId: 'book-r',
    updatedAt: 5_000,
    deleted: false,
    device: 'other-device',
    data: null,
    ...over,
  });

  it('adds a book from another device as a book without its file', async () => {
    const s = setup();
    const record = {
      id: 'book-r',
      fileName: 'r.pdf',
      title: 'R',
      byteSize: 9,
      addedAt: 1,
      lastOpenedAt: 2,
    };
    await s.sync.applyRemote([remote({ kind: 'book', id: 'book-r', data: record })]);
    expect(await s.books.list()).toEqual([{ ...record, hasFile: false }]);
    expect(await s.sync.pending()).toEqual([]);
  });

  it('applies newer annotations, ignores older ones, and never echoes them back', async () => {
    const s = setup();
    const book = await s.books.add(pdf('a'), 'a.pdf');
    await s.bookmarks.put(bookmark(book.id));
    await s.sync.markSynced(await s.sync.pending());
    const ours = byKey(await s.sync.pending());
    expect(ours).toEqual({});

    const newer = { ...bookmark(book.id), label: 'from the iPad' };
    await s.sync.applyRemote([
      remote({ id: newer.id, bookId: book.id, data: newer, updatedAt: 1e12 }),
    ]);
    expect((await s.bookmarks.list(book.id))[0]?.label).toBe('from the iPad');

    const older = { ...bookmark(book.id), label: 'stale' };
    const { applied } = await s.sync.applyRemote([
      remote({ id: older.id, bookId: book.id, data: older, updatedAt: 1 }),
    ]);
    expect(applied).toBe(0);
    expect((await s.bookmarks.list(book.id))[0]?.label).toBe('from the iPad');
    expect(await s.sync.pending()).toEqual([]);
  });

  it('a newer remote deletion removes the item; an older copy never brings it back', async () => {
    const s = setup();
    const book = await s.books.add(pdf('a'), 'a.pdf');
    await s.notes.put(note(book.id));
    const id = note(book.id).id;
    await s.sync.applyRemote([
      remote({ kind: 'note', id, bookId: book.id, deleted: true, updatedAt: 1e12 }),
    ]);
    expect(await s.notes.list(book.id)).toEqual([]);
    await s.sync.applyRemote([
      remote({ kind: 'note', id, bookId: book.id, data: note(book.id), updatedAt: 1e11 }),
    ]);
    expect(await s.notes.list(book.id)).toEqual([]);
  });

  it('a remote "delete everywhere" removes the book, its file and its annotations here', async () => {
    const s = setup();
    const book = await s.books.add(pdf('a'), 'a.pdf');
    await s.bookmarks.put(bookmark(book.id));
    await s.sync.applyRemote([
      remote({ kind: 'book', id: book.id, bookId: book.id, deleted: true, updatedAt: 1e12 }),
    ]);
    expect(await s.books.list()).toEqual([]);
    expect(await s.bookmarks.list(book.id)).toEqual([]);
    await expect(s.books.getBytes(book.id)).rejects.toMatchObject({ kind: 'not-found' });
  });
});

describe('upgrading an existing v4 database', () => {
  it('keeps every book and annotation and queues them all for the first sync', async () => {
    const factory = new IDBFactory();
    // Build a v4 database the way phase 07 left it.
    await new Promise<void>((resolve, reject) => {
      const req = factory.open(DB_NAME, 4);
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore('books', { keyPath: 'id' });
        db.createObjectStore('bookFiles');
        db.createObjectStore('bookmarks', { keyPath: 'id' }).createIndex('bookId', 'bookId');
        db.createObjectStore('highlights', { keyPath: 'id' }).createIndex('bookId', 'bookId');
        const notes = db.createObjectStore('notes', { keyPath: 'id' });
        notes.createIndex('bookId', 'bookId');
        notes.createIndex('highlightId', 'target.highlightId');
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(
          ['books', 'bookFiles', 'bookmarks', 'highlights', 'notes'],
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
        tx.objectStore('bookmarks').put(bookmark('old'));
        tx.objectStore('highlights').put(highlight('old'));
        tx.objectStore('notes').put(note('old'));
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });

    const s = setup(factory);
    expect(await s.books.list()).toEqual([
      {
        id: 'old',
        fileName: 'old.pdf',
        title: 'Old',
        byteSize: 4,
        addedAt: 10,
        lastOpenedAt: 20,
        hasFile: true,
      },
    ]);
    expect(await s.bookmarks.list('old')).toEqual([bookmark('old')]);
    expect(await s.highlights.list('old')).toEqual([highlight('old')]);
    expect(await s.notes.list('old')).toEqual([note('old')]);

    const pending = byKey(await s.sync.pending());
    expect(Object.keys(pending).sort()).toEqual(
      ['book:old', 'bookmark:old:3', 'highlight:h1', noteKey('old')].sort(),
    );
    expect(pending['bookmark:old:3']?.updatedAt).toBe(500);
    expect(pending[noteKey('old')]?.updatedAt).toBe(700);
    expect(pending['book:old']?.updatedAt).toBe(20);
  });
});
