// Search inside a book (phase 13). Pure: the engine supplies each page's text.
// Matching ignores case, accents and how much white space there is, and reports offsets in the
// original text, so the same function can find matches in the page's text layer.

export const MIN_QUERY_LENGTH = 2;

export interface TextMatch {
  /** Offsets in the original text: `text.slice(start, end)` is what matched. */
  start: number;
  end: number;
}

/** The text for matching, with, for each of its characters, the index it came from. */
function fold(text: string): { folded: string; origin: number[] } {
  let folded = '';
  const origin: number[] = [];
  let lastWasSpace = false;
  for (let i = 0; i < text.length;) {
    const code = text.codePointAt(i) ?? 0;
    const char = String.fromCodePoint(code);
    const width = char.length;
    if (/\s/u.test(char)) {
      if (!lastWasSpace) {
        folded += ' ';
        origin.push(i);
      }
      lastWasSpace = true;
    } else {
      const plain = char.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
      for (const part of plain) {
        folded += part;
        for (let k = 0; k < part.length; k++) origin.push(i);
      }
      if (plain.length > 0) lastWasSpace = false;
    }
    i += width;
  }
  return { folded, origin };
}

const foldQuery = (query: string) => fold(query.trim()).folded;

export function searchable(query: string): boolean {
  return foldQuery(query).length >= MIN_QUERY_LENGTH;
}

/** Every non-overlapping match of `query` in `text`, in order. */
export function findMatches(text: string, query: string): TextMatch[] {
  const wanted = foldQuery(query);
  if (wanted.length < MIN_QUERY_LENGTH) return [];
  const { folded, origin } = fold(text);
  const matches: TextMatch[] = [];
  for (let at = folded.indexOf(wanted); at >= 0; at = folded.indexOf(wanted, at + wanted.length)) {
    const last = at + wanted.length - 1;
    const start = origin[at] ?? 0;
    // End after the whole original character the last folded one came from (é may be two).
    let end = (origin[last] ?? start) + 1;
    while (end < text.length && /\p{M}/u.test(text[end] ?? '')) end++;
    if (end < text.length && /[\uDC00-\uDFFF]/.test(text[end] ?? '')) end++;
    matches.push({ start, end });
  }
  return matches;
}

export interface Snippet {
  before: string;
  match: string;
  after: string;
}

/** The match with up to `radius` characters of context each side, cut at word boundaries. */
export function matchSnippet(text: string, { start, end }: TextMatch, radius = 40): Snippet {
  const oneLine = (part: string) => part.replace(/\s+/g, ' ');
  let from = Math.max(0, start - radius);
  let to = Math.min(text.length, end + radius);
  if (from > 0) {
    const space = text.indexOf(' ', from);
    if (space >= 0 && space < start) from = space + 1;
  }
  if (to < text.length) {
    const space = text.lastIndexOf(' ', to);
    if (space > end) to = space;
  }
  return {
    before: (from > 0 ? '… ' : '') + oneLine(text.slice(from, start)).replace(/^ /, ''),
    match: oneLine(text.slice(start, end)),
    after: oneLine(text.slice(end, to)) + (to < text.length ? ' …' : ''),
  };
}
