// App-wide settings (phase 10), in localStorage: the theme must be known before the first render,
// and IndexedDB can only be read asynchronously. Without storage they last for the session.
import { validTheme, type Theme } from '../core/reading-state';
import { validShelfSort, validShelfView, type ShelfSort, type ShelfView } from '../core/shelf';
import type { Preferences } from './types';

/** Also read by the boot script in index.html, before the app loads. */
const THEME_KEY = 'book-reader:theme';
const SHELF_SORT_KEY = 'book-reader:shelf-sort';
const SHELF_VIEW_KEY = 'book-reader:shelf-view';

/** `storage` returns the Storage to use; it may throw where storage is blocked. */
export function createPreferences(
  storage: () => Storage = () => globalThis.localStorage,
): Preferences {
  const read = <T>(key: string, valid: (value: unknown) => value is T, fallback: T): T => {
    try {
      const saved = storage().getItem(key);
      return valid(saved) ? saved : fallback;
    } catch (error) {
      console.error('Could not read settings; using the defaults', error);
      return fallback;
    }
  };
  const write = (key: string, value: string) => {
    try {
      storage().setItem(key, value);
    } catch (error) {
      console.error('Could not save a setting; it applies until the app is closed', error);
    }
  };
  let theme: Theme = read(THEME_KEY, validTheme, 'light');
  let shelfSort: ShelfSort = read(SHELF_SORT_KEY, validShelfSort, 'recent');
  let shelfView: ShelfView = read(SHELF_VIEW_KEY, validShelfView, 'grid');
  return {
    theme: () => theme,
    setTheme(next) {
      theme = next;
      write(THEME_KEY, next);
    },
    shelfSort: () => shelfSort,
    setShelfSort(next) {
      shelfSort = next;
      write(SHELF_SORT_KEY, next);
    },
    shelfView: () => shelfView,
    setShelfView(next) {
      shelfView = next;
      write(SHELF_VIEW_KEY, next);
    },
  };
}
