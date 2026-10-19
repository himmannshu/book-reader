// @vitest-environment node
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import {
  DB_NAME,
  DB_VERSION,
  createIndexedDBBookStore,
  toStorageError,
} from './indexeddb-book-store';
import { StorageError } from './types';

function setup() {
  const factory = new IDBFactory();
  let clock = 1_000;
  let persistCalls = 0;
  const store = createIndexedDBBookStore({
    factory,
    now: () => ++clock,
    requestPersistence: async () => {
      persistCalls++;
      return true;
    },
  });
  return { store, factory, persistCalls: () => persistCalls };
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

  it('returns the stored file with the same bytes', async () => {
    const { store } = setup();
    const record = await store.add(pdf('bytes'), 'b.pdf');
    const file = await store.getFile(record.id);
    expect(await file.text()).toBe('%PDF-1.7 bytes');
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
    await expect(store.getFile(record.id)).rejects.toMatchObject({ kind: 'not-found' });
  });

  it('reports a missing book as not-found', async () => {
    const { store } = setup();
    await expect(store.getFile('nope')).rejects.toBeInstanceOf(StorageError);
    await expect(store.markOpened('nope')).rejects.toMatchObject({ kind: 'not-found' });
  });

  it('asks for persistent storage after the first save only', async () => {
    const { store, persistCalls } = setup();
    await store.add(pdf('1'), '1.pdf');
    await store.add(pdf('2'), '2.pdf');
    expect(persistCalls()).toBe(1);
  });

  it('creates schema version 1 with separate metadata and file stores', async () => {
    const { store, factory } = setup();
    await store.list();
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open(DB_NAME);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    expect(db.version).toBe(DB_VERSION);
    expect(DB_VERSION).toBe(1);
    expect([...db.objectStoreNames].sort()).toEqual(['bookFiles', 'books']);
    db.close();
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
