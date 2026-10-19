import { describe, expect, it } from 'vitest';
import { bookmarkId, bookmarkLabel, sortByPage, type OutlineEntry } from './bookmarks';

const entry = (title: string, pageIndex: number | null, children: OutlineEntry[] = []) => ({
  title,
  pageIndex,
  children,
});

// Mirrors tests/fixtures/outline-12-pages.pdf.
const outline: OutlineEntry[] = [
  entry('Part One', 0, [entry('Chapter 1', 1), entry('Chapter 2', 4)]),
  entry('Part Two', 7, [entry('Chapter 3', 8), entry('Missing section', null)]),
  entry('Appendix', 11),
];

describe('bookmarkLabel', () => {
  it('is the page number alone when the book has no outline', () => {
    expect(bookmarkLabel(4, [])).toBe('Page 5');
  });

  it('adds the chapter the page belongs to', () => {
    expect(bookmarkLabel(5, outline)).toBe('Page 6 · Chapter 2');
    expect(bookmarkLabel(9, outline)).toBe('Page 10 · Chapter 3');
    expect(bookmarkLabel(11, outline)).toBe('Page 12 · Appendix');
  });

  it('prefers the chapter over its part when both start on the page', () => {
    const sameStart = [entry('Part', 3, [entry('Chapter', 3)])];
    expect(bookmarkLabel(3, sameStart)).toBe('Page 4 · Chapter');
  });

  it('uses a part when no chapter has started yet', () => {
    expect(bookmarkLabel(0, outline)).toBe('Page 1 · Part One');
    expect(bookmarkLabel(7, outline)).toBe('Page 8 · Part Two');
  });

  it('is the page number alone before the first entry', () => {
    expect(bookmarkLabel(1, [entry('Later', 3)])).toBe('Page 2');
  });

  it('ignores entries without a page and entries out of page order', () => {
    const unordered = [entry('Index', 20), entry('Broken', null), entry('Intro', 2)];
    expect(bookmarkLabel(5, unordered)).toBe('Page 6 · Intro');
  });
});

describe('bookmarkId', () => {
  it('is the same for the same page of the same book', () => {
    expect(bookmarkId('abc', 3)).toBe(bookmarkId('abc', 3));
    expect(bookmarkId('abc', 3)).not.toBe(bookmarkId('abc', 4));
    expect(bookmarkId('abc', 3)).not.toBe(bookmarkId('abd', 3));
  });
});

describe('sortByPage', () => {
  it('orders bookmarks by page and returns a new array', () => {
    const marks = [{ pageIndex: 9 }, { pageIndex: 2 }, { pageIndex: 5 }];
    const sorted = sortByPage(marks);
    expect(sorted.map((b) => b.pageIndex)).toEqual([2, 5, 9]);
    expect(marks[0]?.pageIndex).toBe(9);
  });
});
