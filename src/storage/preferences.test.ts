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
