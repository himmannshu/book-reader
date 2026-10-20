import { describe, expect, it } from 'vitest';
import { MIN_QUERY_LENGTH, findMatches, matchSnippet, searchable } from './search';

describe('findMatches', () => {
  it('finds every occurrence, ignoring case', () => {
    expect(findMatches('Alpha beta ALPHA alphabet', 'alpha')).toEqual([
      { start: 0, end: 5 },
      { start: 11, end: 16 },
      { start: 17, end: 22 },
    ]);
  });

  it('ignores accents in the text and the query, with offsets in the original text', () => {
    const text = 'Le café, une Café noire';
    const matches = findMatches(text, 'CAFÉ');
    expect(matches.map(({ start, end }) => text.slice(start, end))).toEqual(['café', 'Café']);
  });

  it('treats any run of spaces and line breaks as one space', () => {
    const text = 'the quick\n  brown fox';
    const [match] = findMatches(text, 'quick brown');
    expect(match && text.slice(match.start, match.end)).toBe('quick\n  brown');
  });

  it('finds nothing for a query shorter than the minimum or made of spaces', () => {
    expect(MIN_QUERY_LENGTH).toBe(2);
    expect(findMatches('a b a', 'a')).toEqual([]);
    expect(findMatches('a  b', '   ')).toEqual([]);
  });

  it('does not overlap matches', () => {
    expect(findMatches('aaaa', 'aa')).toEqual([
      { start: 0, end: 2 },
      { start: 2, end: 4 },
    ]);
  });
});

describe('searchable', () => {
  it('is true once the query has enough letters', () => {
    expect(searchable(' a ')).toBe(false);
    expect(searchable('ab')).toBe(true);
  });
});

describe('matchSnippet', () => {
  it('shows words around the match, trimmed to whole words, on one line', () => {
    const text = 'one two three four five six\nseven eight nine ten eleven twelve';
    const [match] = findMatches(text, 'seven');
    if (!match) throw new Error('no match');
    expect(matchSnippet(text, match, 12)).toEqual({
      before: '… five six ',
      match: 'seven',
      after: ' eight nine …',
    });
  });

  it('adds no ellipsis at the edges of the page', () => {
    const [match] = findMatches('short text', 'short');
    if (!match) throw new Error('no match');
    expect(matchSnippet('short text', match, 40)).toEqual({
      before: '',
      match: 'short',
      after: ' text',
    });
  });
});
