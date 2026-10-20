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

  it('never cuts a character in half when a long passage has no spaces', () => {
    // One letter first, so a cut by code units would land inside an emoji.
    const quote = 'a' + '😀'.repeat(1200);
    const shared = excerptText({ quote, title: 'T', pageIndex: 0 }).split('\n')[0] ?? '';
    // No lone surrogate halves: every code unit pair is a whole emoji.
    expect(shared).not.toMatch(
      /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/,
    );
    expect(shared.endsWith('…”')).toBe(true);
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
