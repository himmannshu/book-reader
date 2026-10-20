// The library shelf (phase 11): reading progress, sorting and filtering. Pure logic.
import type { ReadingState } from './reading-state';
import { sortByRecentlyOpened } from './library';

export type ShelfSort = 'recent' | 'title' | 'progress';
export const SHELF_SORTS: readonly ShelfSort[] = ['recent', 'title', 'progress'];

export function validShelfSort(value: unknown): value is ShelfSort {
  return SHELF_SORTS.includes(value as ShelfSort);
}

export interface ShelfBook {
  id: string;
  title: string;
  lastOpenedAt: number;
  addedAt: number;
}

export interface Progress {
  /** 1-based page reached. */
  page: number;
  pageCount: number;
  /** Whole percent of pages reached: page 151 of 300 is 50%, the last page is 100%. */
  percent: number;
}

/**
 * How far into the book the saved place is, or null if it was not started here: never read, or
 * still on page 1 (opening a book saves its place even if nothing was read).
 */
export function readingProgress(state: ReadingState | null | undefined): Progress | null {
  const pageCount = state?.pageCount;
  if (!state || pageCount === undefined || pageCount < 1) return null;
  const page = Math.min(state.position.pageIndex + 1, pageCount);
  if (page === 1 && pageCount > 1) return null;
  return { page, pageCount, percent: Math.floor((page / pageCount) * 100) };
}

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

/** The books in the chosen order. Returns a new array. */
export function sortShelf<T extends ShelfBook>(
  books: readonly T[],
  states: ReadonlyMap<string, ReadingState>,
  sort: ShelfSort,
): T[] {
  const recent = sortByRecentlyOpened(books);
  if (sort === 'recent') return recent;
  if (sort === 'title') return recent.sort((a, b) => collator.compare(a.title, b.title));
  const share = (book: T) => {
    const progress = readingProgress(states.get(book.id));
    return progress ? progress.page / progress.pageCount : -1;
  };
  // Array.sort is stable, so equal progress keeps the most recent first.
  return recent.sort((a, b) => share(b) - share(a));
}

/** Lower case without accents, for matching. */
function plain(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** Books whose title contains `text` (ignoring case, accents and surrounding spaces). */
export function filterShelf<T extends ShelfBook>(books: readonly T[], text: string): T[] {
  const wanted = plain(text.trim());
  if (!wanted) return [...books];
  return books.filter((book) => plain(book.title).includes(wanted));
}
