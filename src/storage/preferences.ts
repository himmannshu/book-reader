// App-wide settings (phase 10), in localStorage: the theme must be known before the first render,
// and IndexedDB can only be read asynchronously. Without storage they last for the session.
import { validTheme, type Theme } from '../core/reading-state';
import type { Preferences } from './types';

const THEME_KEY = 'book-reader:theme';

/** `storage` returns the Storage to use; it may throw where storage is blocked. */
export function createPreferences(
  storage: () => Storage = () => globalThis.localStorage,
): Preferences {
  let theme: Theme = 'light';
  try {
    const saved = storage().getItem(THEME_KEY);
    if (validTheme(saved)) theme = saved;
  } catch (error) {
    console.error('Could not read settings; using the defaults', error);
  }
  return {
    theme: () => theme,
    setTheme(next) {
      theme = next;
      try {
        storage().setItem(THEME_KEY, next);
      } catch (error) {
        console.error('Could not save the theme; it applies until the app is closed', error);
      }
    },
  };
}
