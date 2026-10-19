import { describe, expect, it } from 'vitest';
import { sortByRecentlyOpened, titleFromFileName } from './library';

describe('titleFromFileName', () => {
  it('drops the .pdf extension, in any case', () => {
    expect(titleFromFileName('Designing Data Intensive Applications.pdf')).toBe(
      'Designing Data Intensive Applications',
    );
    expect(titleFromFileName('NOTES.PDF')).toBe('NOTES');
  });

  it('turns underscores into spaces and trims', () => {
    expect(titleFromFileName('  the_hundred_page_ml_book.pdf ')).toBe('the hundred page ml book');
  });

  it('keeps names without a .pdf extension as they are', () => {
    expect(titleFromFileName('scan')).toBe('scan');
  });

  it('falls back to a placeholder for an empty name', () => {
    expect(titleFromFileName('.pdf')).toBe('Untitled book');
    expect(titleFromFileName('')).toBe('Untitled book');
  });
});

describe('sortByRecentlyOpened', () => {
  const book = (id: string, lastOpenedAt: number, addedAt = 0) => ({ id, lastOpenedAt, addedAt });

  it('puts the most recently opened book first', () => {
    const sorted = sortByRecentlyOpened([book('a', 10), book('b', 30), book('c', 20)]);
    expect(sorted.map((b) => b.id)).toEqual(['b', 'c', 'a']);
  });

  it('breaks ties by the most recently added', () => {
    const sorted = sortByRecentlyOpened([book('a', 5, 1), book('b', 5, 2)]);
    expect(sorted.map((b) => b.id)).toEqual(['b', 'a']);
  });

  it('does not modify the input', () => {
    const input = [book('a', 1), book('b', 2)];
    sortByRecentlyOpened(input);
    expect(input.map((b) => b.id)).toEqual(['a', 'b']);
  });
});
