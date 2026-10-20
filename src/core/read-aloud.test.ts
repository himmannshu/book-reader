import { describe, expect, it } from 'vitest';
import { MAX_CHUNK, sentenceAt, splitSentences } from './read-aloud';

const texts = (text: string) => splitSentences(text).map((s) => text.slice(s.start, s.end));

describe('splitSentences', () => {
  it('splits at sentence ends and keeps offsets into the original text', () => {
    const text = 'First one. Second one? Third!\nFourth line without a stop';
    expect(texts(text)).toEqual([
      'First one.',
      'Second one?',
      'Third!',
      'Fourth line without a stop',
    ]);
  });

  it('joins lines of one sentence, and ends a sentence at a blank line', () => {
    const text = 'A sentence that wraps\nonto the next line. Then\n\nA heading\n\nMore text.';
    expect(texts(text)).toEqual([
      'A sentence that wraps\nonto the next line.',
      'Then',
      'A heading',
      'More text.',
    ]);
  });

  it('does not split after common abbreviations, initials or decimals', () => {
    const text = 'Dr. Smith met Mr. J. R. Brown at 3.5 p.m. on the bridge. Then they left.';
    expect(texts(text)).toEqual([
      'Dr. Smith met Mr. J. R. Brown at 3.5 p.m. on the bridge.',
      'Then they left.',
    ]);
  });

  it('breaks very long sentences at commas or spaces, so each piece is short enough to speak', () => {
    const long = Array.from({ length: 80 }, (_, i) => `word${i}`).join(', ');
    const pieces = texts(long);
    expect(pieces.length).toBeGreaterThan(1);
    for (const piece of pieces) expect(piece.length).toBeLessThanOrEqual(MAX_CHUNK);
    expect(pieces.join(' ').replace(/\s+/g, ' ')).toBe(long);
  });

  it('skips empty and space-only text', () => {
    expect(splitSentences('   \n\n  ')).toEqual([]);
  });
});

describe('sentenceAt', () => {
  it('finds the first sentence that ends after a share of the page', () => {
    const text = 'One. Two. Three. Four.';
    const sentences = splitSentences(text);
    expect(sentenceAt(sentences, text.length, 0)).toBe(0);
    expect(sentenceAt(sentences, text.length, 0.5)).toBe(2);
    expect(sentenceAt(sentences, text.length, 1)).toBe(3);
  });
});
