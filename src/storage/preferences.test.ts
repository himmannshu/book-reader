import { describe, expect, it, vi } from 'vitest';
import { createPreferences } from './preferences';

/** A minimal Storage, like localStorage. */
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  };
}

describe('preferences', () => {
  it('start with the light theme and keep the chosen one', () => {
    const storage = memoryStorage();
    const prefs = createPreferences(() => storage);
    expect(prefs.theme()).toBe('light');
    prefs.setTheme('dark');
    expect(prefs.theme()).toBe('dark');
    // A new session reads what was saved.
    expect(createPreferences(() => storage).theme()).toBe('dark');
  });

  it('ignore an unknown stored theme', () => {
    const storage = memoryStorage();
    storage.setItem('book-reader:theme', 'neon');
    expect(createPreferences(() => storage).theme()).toBe('light');
  });

  it('still work for this session when storage is blocked, and log why', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const prefs = createPreferences(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(prefs.theme()).toBe('light');
    prefs.setTheme('sepia');
    expect(prefs.theme()).toBe('sepia');
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it('still work when saving fails (storage full)', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const storage = memoryStorage();
    storage.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
    const prefs = createPreferences(() => storage);
    prefs.setTheme('dark');
    expect(prefs.theme()).toBe('dark');
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});

describe('shelf sort preference', () => {
  it('starts at recent and keeps the chosen sort', () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
    } as unknown as Storage;
    const prefs = createPreferences(() => storage);
    expect(prefs.shelfSort()).toBe('recent');
    prefs.setShelfSort('title');
    expect(createPreferences(() => storage).shelfSort()).toBe('title');
    data.set('book-reader:shelf-sort', 'size');
    expect(createPreferences(() => storage).shelfSort()).toBe('recent');
  });
});

describe('shelf view preference (phase 22)', () => {
  it('starts as a grid and keeps the chosen view', () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
    } as unknown as Storage;
    const prefs = createPreferences(() => storage);
    expect(prefs.shelfView()).toBe('grid');
    prefs.setShelfView('list');
    expect(createPreferences(() => storage).shelfView()).toBe('list');
    data.set('book-reader:shelf-view', 'carousel');
    expect(createPreferences(() => storage).shelfView()).toBe('grid');
  });
});
