// Tells the sync engine "something changed" after each successful local write, without the UI
// having to know about sync. Reads, and removing a file from this device only, are not changes.
import type {
  BookStore,
  BookmarkStore,
  HighlightStore,
  NoteStore,
  PerBookStore,
} from '../storage/types';

export interface UserStores {
  books: BookStore;
  bookmarks: BookmarkStore;
  highlights: HighlightStore;
  notes: NoteStore;
}

function after<A extends unknown[], R>(write: (...args: A) => Promise<R>, changed: () => void) {
  return async (...args: A): Promise<R> => {
    const result = await write(...args);
    changed();
    return result;
  };
}

function perBook<T extends { id: string; bookId: string }>(
  store: PerBookStore<T>,
  changed: () => void,
): PerBookStore<T> {
  return {
    list: (bookId) => store.list(bookId),
    put: after((item: T) => store.put(item), changed),
    remove: after((id: string) => store.remove(id), changed),
  };
}

export function withSyncTrigger(stores: UserStores, changed: () => void): UserStores {
  const { books } = stores;
  return {
    books: {
      add: after((file: Blob, fileName: string) => books.add(file, fileName), changed),
      list: () => books.list(),
      getBytes: (id) => books.getBytes(id),
      markOpened: after((id: string) => books.markOpened(id), changed),
      remove: after((id: string) => books.remove(id), changed),
      removeFromDevice: (id) => books.removeFromDevice(id),
    },
    bookmarks: perBook(stores.bookmarks, changed),
    highlights: perBook(stores.highlights, changed),
    notes: perBook(stores.notes, changed),
  };
}
