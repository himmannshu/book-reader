// Export of a book's highlights and notes to Markdown (phase 12). Pure: the caller downloads it.
// Layout (sample in the phase-12 context file): the title, a summary line, then one section per
// chapter (from the table of contents) and one subsection per page, in book order.
import { chapterAt, type OutlineEntry } from './bookmarks';
import { sortByPosition, type Highlight } from './highlights';
import type { Note } from './notes';

export interface ExportInput {
  title: string;
  highlights: readonly Highlight[];
  notes: readonly Note[];
  outline: readonly OutlineEntry[];
  exportedAt: Date;
}

/**
 * Escapes what Markdown would read as formatting, so text reads exactly as written: inline marks
 * and entities anywhere, and at the start a list number ("1." becomes "1\\."), a list or rule dash,
 * or a plus. A backslash before a digit would show, so numbers are escaped after their digits.
 */
function escape(text: string): string {
  return text
    .replace(/[\\`*_{}[\]<>#|~&]/g, '\\$&')
    .replace(/^(\d+)([.)])/, '$1\\$2')
    .replace(/^([-+=])/, '\\$1');
}

/** A note's own text, kept as typed (it may use Markdown); line breaks stay line breaks. */
function noteText(text: string): string {
  return text
    .trim()
    .split('\n')
    .map((line) => line.trimEnd())
    .join('  \n');
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

function isoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function exportMarkdown({
  title,
  highlights,
  notes,
  outline,
  exportedAt,
}: ExportInput): string {
  const lines: string[] = [`# ${escape(title.trim() || 'Untitled book')}`, ''];
  const summary = `${plural(highlights.length, 'highlight')}, ${plural(notes.length, 'note')}`;
  lines.push(
    `Highlights and notes from Book Reader, exported ${isoDate(exportedAt)}: ${summary}.`,
    '',
  );
  if (highlights.length === 0 && notes.length === 0) {
    lines.push('No highlights or notes yet.', '');
    return lines.join('\n');
  }

  const known = new Set(highlights.map((h) => h.id));
  const noteFor = new Map<string, Note>();
  const pageNotes = new Map<number, Note[]>();
  for (const note of notes) {
    const target = note.target;
    if (target.kind === 'highlight' && known.has(target.highlightId)) {
      noteFor.set(target.highlightId, note);
    } else {
      // Page notes, and notes whose highlight is gone, belong to their page.
      const list = pageNotes.get(target.pageIndex) ?? [];
      list.push(note);
      pageNotes.set(target.pageIndex, list);
    }
  }
  const byPage = new Map<number, Highlight[]>();
  for (const passage of sortByPosition(highlights)) {
    const list = byPage.get(passage.pageIndex) ?? [];
    list.push(passage);
    byPage.set(passage.pageIndex, list);
  }

  const pages = [...new Set([...byPage.keys(), ...pageNotes.keys()])].sort((a, b) => a - b);
  let chapter: OutlineEntry | undefined;
  for (const pageIndex of pages) {
    const here = chapterAt(pageIndex, outline);
    const heading = here?.title.trim();
    if (here && here !== chapter && heading) lines.push(`## ${escape(heading)}`, '');
    chapter = here;
    lines.push(`### Page ${pageIndex + 1}`, '');
    for (const note of pageNotes.get(pageIndex) ?? []) {
      const label = note.target.kind === 'page' ? 'Page note' : 'Note';
      lines.push(`**${label}:** ${noteText(note.text)}`, '');
    }
    for (const passage of byPage.get(pageIndex) ?? []) {
      lines.push(`> ${escape(passage.quote)}`, '');
      const attached = noteFor.get(passage.id);
      if (attached) lines.push(`**Note:** ${noteText(attached.text)}`, '');
    }
  }
  return lines.join('\n');
}

/** "<title> - highlights and notes.md", without characters that file systems refuse. */
export function exportFileName(title: string): string {
  const safe = title
    .replace(/[\\/:*?"<>|\p{Cc}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
    .trim();
  return `${safe || 'Book'} - highlights and notes.md`;
}
