import { describe, expect, it } from 'vitest';
import type { ReadingState } from './reading-state';
import {
  SHELF_FILTERS,
  filterByStatus,
  filterShelf,
  readingProgress,
  shelfCounts,
  shelfStatus,
  sortShelf,
  validShelfView,
  type ShelfBook,
} from './shelf';

const state = (pageIndex: number, pageCount?: number): ReadingState => ({
  bookId: 'x',
  position: { pageIndex, fraction: 0, pixelsAbove: 0 },
  zoom: 'fit-width',
  savedAt: 1,
  ...(pageCount === undefined ? {} : { pageCount }),
});

describe('readingProgress', () => {
  it('is the share of pages reached, with the page number', () => {
    expect(readingProgress(state(150, 300))).toEqual({ page: 151, pageCount: 300, percent: 50 });
    expect(readingProgress(state(1, 300))).toEqual({ page: 2, pageCount: 300, percent: 0 });
    expect(readingProgress(state(299, 300))).toEqual({ page: 300, pageCount: 300, percent: 100 });
  });

  it('is null before the book is read, while still on page 1, or when the page count is unknown', () => {
    expect(readingProgress(state(0, 300))).toBeNull();
    // A one-page book on its only page is finished.
    expect(readingProgress(state(0, 1))?.percent).toBe(100);
    expect(readingProgress(null)).toBeNull();
    expect(readingProgress(undefined)).toBeNull();
    expect(readingProgress(state(4))).toBeNull();
  });

  it('never goes past the last page', () => {
    expect(readingProgress(state(400, 300))?.percent).toBe(100);
  });
});

const book = (id: string, title: string, lastOpenedAt: number): ShelfBook => ({
  id,
  title,
  lastOpenedAt,
  addedAt: 0,
});

describe('sortShelf', () => {
  const books = [
    book('a', 'zebra', 3),
    book('b', 'Émile', 1),
    book('c', 'apple 10', 2),
    book('d', 'apple 9', 4),
  ];
  const states = new Map([
    ['a', state(10, 100)],
    ['c', state(90, 100)],
  ]);

  it('puts the most recently opened first by default', () => {
    expect(sortShelf(books, states, 'recent').map((b) => b.id)).toEqual(['d', 'a', 'c', 'b']);
  });

  it('sorts titles alphabetically, ignoring case and accents, with numbers in order', () => {
    expect(sortShelf(books, states, 'title').map((b) => b.title)).toEqual([
      'apple 9',
      'apple 10',
      'Émile',
      'zebra',
    ]);
  });

  it('sorts by progress, furthest first, unread books last (most recent first among ties)', () => {
    expect(sortShelf(books, states, 'progress').map((b) => b.id)).toEqual(['c', 'a', 'd', 'b']);
  });
});

describe('filterShelf', () => {
  const books = [book('a', 'The Brothers Karamazov', 1), book('b', 'Émile, or On Education', 2)];

  it('keeps books whose title contains the text, ignoring case and accents', () => {
    expect(filterShelf(books, 'karam').map((b) => b.id)).toEqual(['a']);
    expect(filterShelf(books, 'EMILE').map((b) => b.id)).toEqual(['b']);
    expect(filterShelf(books, '  on  ').map((b) => b.id)).toEqual(['b']);
  });

  it('keeps everything for empty text', () => {
    expect(filterShelf(books, '   ')).toHaveLength(2);
  });
});

describe('shelfStatus (phase 22)', () => {
  it('is cloud for a book not on this device, whatever its progress', () => {
    expect(shelfStatus({ hasFile: false }, state(150, 300))).toBe('cloud');
  });

  it('is unread before the book is started, reading in between, finished at the last page', () => {
    expect(shelfStatus({}, undefined)).toBe('unread');
    expect(shelfStatus({ hasFile: true }, state(0, 300))).toBe('unread');
    expect(shelfStatus({}, state(150, 300))).toBe('reading');
    expect(shelfStatus({}, state(298, 300))).toBe('reading');
    expect(shelfStatus({}, state(299, 300))).toBe('finished');
    expect(shelfStatus({}, state(0, 1))).toBe('finished');
  });
});

describe('shelf filters (phase 22)', () => {
  const shelf = [
    { ...book('a', 'Alpha', 1), hasFile: true },
    { ...book('b', 'Beta', 2), hasFile: true },
    { ...book('c', 'Gamma', 3), hasFile: true },
    { ...book('d', 'Delta', 4), hasFile: false },
  ];
  const states = new Map<string, ReadingState>([
    ['a', state(150, 300)],
    ['b', state(299, 300)],
  ]);

  it('counts the books in each filter', () => {
    expect(shelfCounts(shelf, states)).toEqual({
      all: 4,
      reading: 1,
      unread: 1,
      finished: 1,
      cloud: 1,
    });
  });

  it('keeps only the books in the chosen filter, in their order', () => {
    expect(filterByStatus(shelf, states, 'all').map((b) => b.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(filterByStatus(shelf, states, 'reading').map((b) => b.id)).toEqual(['a']);
    expect(filterByStatus(shelf, states, 'unread').map((b) => b.id)).toEqual(['c']);
    expect(filterByStatus(shelf, states, 'finished').map((b) => b.id)).toEqual(['b']);
    expect(filterByStatus(shelf, states, 'cloud').map((b) => b.id)).toEqual(['d']);
  });

  it('knows its filters and views', () => {
    expect(SHELF_FILTERS).toEqual(['all', 'reading', 'unread', 'finished', 'cloud']);
    expect(validShelfView('list')).toBe(true);
    expect(validShelfView('grid')).toBe(true);
    expect(validShelfView('table')).toBe(false);
  });
});
