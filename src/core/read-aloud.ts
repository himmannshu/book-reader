// Reading a book aloud (phase 16): the page text cut into short pieces for speech. Pure logic.

/** Longest piece given to the speech engine at once; some engines stop long utterances. */
export const MAX_CHUNK = 280;

export interface Sentence {
  /** Offsets into the page text: `text.slice(start, end)`. */
  start: number;
  end: number;
}

/** Words that end with a full stop without ending the sentence. */
const ABBREVIATIONS = new Set([
  'mr',
  'mrs',
  'ms',
  'dr',
  'prof',
  'st',
  'sr',
  'jr',
  'vs',
  'etc',
  'e.g',
  'i.e',
  'p.m',
  'a.m',
  'no',
  'vol',
  'ch',
  'fig',
  'pp',
  'cf',
  'ed',
  'eds',
  'approx',
  'mt',
  'ft',
]);

function endsSentence(text: string, at: number): boolean {
  const mark = text[at];
  if (mark === '!' || mark === '?') return true;
  if (mark !== '.') return false;
  // "3.5": a decimal point.
  if (/\d/.test(text[at - 1] ?? '') && /\d/.test(text[at + 1] ?? '')) return false;
  // The word before the stop: an abbreviation or a single initial doesn't end the sentence.
  const before = /([\p{L}.]+)$/u.exec(text.slice(Math.max(0, at - 12), at))?.[1] ?? '';
  const word = before.toLowerCase();
  if (ABBREVIATIONS.has(word) || /^\p{Lu}$/u.test(before)) return false;
  // "p.m. on": a stop inside an abbreviation continues when followed by a lower-case word.
  const next = /^\s+(\S)/u.exec(text.slice(at + 1))?.[1];
  if (word.includes('.') && next !== undefined && /\p{Ll}/u.test(next)) return false;
  return true;
}

/** Splits a piece longer than MAX_CHUNK at the last comma (or space) that keeps it short. */
function shorten(text: string, start: number, end: number, out: Sentence[]): void {
  while (end - start > MAX_CHUNK) {
    const window = text.slice(start, start + MAX_CHUNK);
    let cut = window.lastIndexOf(', ');
    if (cut < MAX_CHUNK / 3) cut = window.lastIndexOf(' ');
    const at = cut > 0 ? start + cut + 1 : start + MAX_CHUNK;
    out.push(trimmed(text, start, at));
    start = at;
  }
  out.push(trimmed(text, start, end));
}

function trimmed(text: string, start: number, end: number): Sentence {
  while (start < end && /\s/.test(text[start] ?? '')) start++;
  while (end > start && /\s/.test(text[end - 1] ?? '')) end--;
  return { start, end };
}

/** The page's text as pieces to speak, in order. Blank lines and sentence ends separate them. */
export function splitSentences(text: string): Sentence[] {
  const out: Sentence[] = [];
  let start = 0;
  const flush = (end: number) => {
    const piece = trimmed(text, start, end);
    if (piece.end > piece.start) shorten(text, piece.start, piece.end, out);
    start = end;
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (endsSentence(text, i)) {
      // Keep closing quotes and brackets with the sentence.
      let end = i + 1;
      while (end < text.length && /["'”’)\]]/.test(text[end] ?? '')) end++;
      if (end >= text.length || /\s/.test(text[end] ?? '')) {
        flush(end);
        i = end - 1;
      }
    } else if (char === '\n' && /^\n[ \t]*\n/.test(text.slice(i, i + 8))) {
      // A blank line ends a sentence (a heading, a paragraph without a stop). A single line
      // break doesn't: sentences wrap across lines.
      flush(i);
    }
  }
  flush(text.length);
  return out.filter((s) => s.end > s.start);
}

/** The first sentence that ends after `share` of the page text (0 = top, 1 = bottom). */
export function sentenceAt(sentences: readonly Sentence[], length: number, share: number): number {
  const offset = Math.max(0, Math.min(1, share)) * length;
  const index = sentences.findIndex((s) => s.end > offset);
  return index >= 0 ? index : Math.max(0, sentences.length - 1);
}
