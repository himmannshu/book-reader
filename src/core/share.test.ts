import { describe, expect, it } from 'vitest';
import { excerptText, MAX_EXCERPT } from './share';

describe('excerptText', () => {
  it('quotes the passage and names the book and page', () => {
    expect(excerptText({ quote: 'To be, or not to be.', title: 'Hamlet', pageIndex: 41 })).toBe(
      '“To be, or not to be.”\n— Hamlet, page 42',
    );
  });

  it('tidies white space and leaves out an empty title', () => {
    expect(excerptText({ quote: '  two\n lines  ', title: '  ', pageIndex: 0 })).toBe(
      '“two lines”\n— page 1',
    );
  });

  it('shortens a very long passage at a word, with an ellipsis', () => {
    const quote = Array.from({ length: 400 }, (_, i) => `w${i}`).join(' ');
    const text = excerptText({ quote, title: 'T', pageIndex: 0 });
    const shared = text.split('\n')[0] ?? '';
    expect(shared.length).toBeLessThanOrEqual(MAX_EXCERPT + 3);
    expect(shared.endsWith('…”')).toBe(true);
    expect(shared).not.toMatch(/ …/);
  });
});
