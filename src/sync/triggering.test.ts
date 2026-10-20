import { describe, expect, it, vi } from 'vitest';
import type { BookStore, PerBookStore } from '../storage/types';
import { withSyncTrigger } from './triggering';

function fakeBooks(): BookStore {
  return {
    add: vi.fn(async () => ({
      id: 'b',
      fileName: 'b.pdf',
      title: 'b',
      byteSize: 1,
      addedAt: 1,
      lastOpenedAt: 1,
    })),
    list: vi.fn(async () => []),
    getBytes: vi.fn(async () => new Uint8Array()),
    markOpened: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
    removeFromDevice: vi.fn(async () => {}),
    putFile: vi.fn(async () => {}),
  };
}

function fakePerBook<T extends { id: string; bookId: string }>(): PerBookStore<T> {
  return { list: vi.fn(async () => []), put: vi.fn(async () => {}), remove: vi.fn(async () => {}) };
}

function setup() {
  const changed = vi.fn();
  const stores = withSyncTrigger(
    {
      books: fakeBooks(),
      bookmarks: fakePerBook(),
      highlights: fakePerBook(),
      notes: fakePerBook(),
    },
    changed,
  );
  return { stores, changed };
}

describe('withSyncTrigger', () => {
  it('reports a change after every successful local write', async () => {
    const { stores, changed } = setup();
    await stores.books.add(new Blob(['x']), 'x.pdf');
    await stores.books.markOpened('b');
    await stores.books.remove('b');
    await stores.bookmarks.put({ id: 'm', bookId: 'b' } as never);
    await stores.bookmarks.remove('m');
    await stores.highlights.put({ id: 'h', bookId: 'b' } as never);
    await stores.highlights.remove('h');
    await stores.notes.put({ id: 'n', bookId: 'b' } as never);
    await stores.notes.remove('n');
    expect(changed).toHaveBeenCalledTimes(9);
  });

  it('does not report reads, or removing a file from this device only', async () => {
    const { stores, changed } = setup();
    await stores.books.list();
    await stores.books.getBytes('b');
    await stores.bookmarks.list('b');
    await stores.books.removeFromDevice('b');
    expect(changed).not.toHaveBeenCalled();
  });

  it('does not report a write that failed', async () => {
    const changed = vi.fn();
    const books = { ...fakeBooks(), remove: vi.fn(() => Promise.reject(new Error('disk'))) };
    const stores = withSyncTrigger(
      { books, bookmarks: fakePerBook(), highlights: fakePerBook(), notes: fakePerBook() },
      changed,
    );
    await expect(stores.books.remove('b')).rejects.toThrow('disk');
    expect(changed).not.toHaveBeenCalled();
  });
});
