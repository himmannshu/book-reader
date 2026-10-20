import { describe, expect, it } from 'vitest';
import type { OutlineEntry } from './bookmarks';
import { exportFileName, exportMarkdown } from './export';
import type { Highlight } from './highlights';
import { noteId, type Note, type NoteTarget } from './notes';

const BOOK = 'book';
const highlight = (id: string, pageIndex: number, y: number, quote: string): Highlight => ({
  id,
  bookId: BOOK,
  pageIndex,
  rects: [{ pageIndex, x: 72, y, width: 200, height: 12 }],
  quote,
  createdAt: 1,
});
const note = (target: NoteTarget, text: string): Note => ({
  id: noteId(BOOK, target),
  bookId: BOOK,
  target,
  text,
  createdAt: 1,
  updatedAt: 1,
});
const entry = (title: string, pageIndex: number | null, children: OutlineEntry[] = []) => ({
  title,
  pageIndex,
  children,
});

const outline = [entry('Part One', 0, [entry('Chapter 1', 1), entry('Chapter 2', 4)])];
const exportedAt = new Date(2026, 9, 20, 9, 30);

describe('exportMarkdown', () => {
  it('lists highlights and notes in book order, grouped by chapter and page', () => {
    const markdown = exportMarkdown({
      title: 'A Book',
      outline,
      exportedAt,
      highlights: [
        // Out of order on purpose.
        highlight('h3', 5, 100, 'Third, in chapter two.'),
        highlight('h2', 1, 300, 'Second, lower on the page.'),
        highlight('h1', 1, 100, 'First, near the top.'),
      ],
      notes: [
        note({ kind: 'highlight', pageIndex: 1, highlightId: 'h2' }, 'Why the second?\nTwo lines.'),
        note({ kind: 'page', pageIndex: 1 }, 'About page two.'),
        note({ kind: 'page', pageIndex: 0 }, 'Before the first chapter.'),
      ],
    });
    expect(markdown).toBe(
      [
        '# A Book',
        '',
        'Highlights and notes from Book Reader, exported 2026-10-20: 3 highlights, 3 notes.',
        '',
        '## Part One',
        '',
        '### Page 1',
        '',
        '**Page note:** Before the first chapter.',
        '',
        '## Chapter 1',
        '',
        '### Page 2',
        '',
        '**Page note:** About page two.',
        '',
        '> First, near the top.',
        '',
        '> Second, lower on the page.',
        '',
        '**Note:** Why the second?  ',
        'Two lines.',
        '',
        '## Chapter 2',
        '',
        '### Page 6',
        '',
        '> Third, in chapter two.',
        '',
      ].join('\n'),
    );
  });

  it('groups by page alone when the book has no table of contents', () => {
    const markdown = exportMarkdown({
      title: 'Plain',
      outline: [],
      exportedAt,
      highlights: [highlight('h', 2, 10, 'Only one.')],
      notes: [],
    });
    expect(markdown).toContain('1 highlight, 0 notes.');
    expect(markdown).not.toMatch(/^## /m);
    expect(markdown).toContain('### Page 3\n\n> Only one.\n');
  });

  it('escapes Markdown in quotes, so the passage reads as written', () => {
    const markdown = exportMarkdown({
      title: 'A *bold* [title]',
      outline: [],
      exportedAt,
      highlights: [highlight('h', 0, 10, '# Not a heading, *not* emphasis, 2 < 3 | x_y')],
      notes: [],
    });
    expect(markdown).toContain('# A \\*bold\\* \\[title\\]');
    expect(markdown).toContain('> \\# Not a heading, \\*not\\* emphasis, 2 \\< 3 \\| x\\_y');
  });

  it('says so when there is nothing to export', () => {
    const markdown = exportMarkdown({
      title: 'Empty',
      outline: [],
      exportedAt,
      highlights: [],
      notes: [],
    });
    expect(markdown).toContain('No highlights or notes yet.');
  });

  it('keeps a note whose highlight is gone, as a note on its page', () => {
    const markdown = exportMarkdown({
      title: 'Orphan',
      outline: [],
      exportedAt,
      highlights: [],
      notes: [note({ kind: 'highlight', pageIndex: 3, highlightId: 'gone' }, 'Still here.')],
    });
    expect(markdown).toContain('### Page 4\n\n**Note:** Still here.\n');
  });
});

describe('exportFileName', () => {
  it('is the title plus a description, without characters file systems refuse', () => {
    expect(exportFileName('A Book')).toBe('A Book - highlights and notes.md');
    expect(exportFileName('What? A/B: "C" <d>|*')).toBe('What A B C d - highlights and notes.md');
    expect(exportFileName('   ')).toBe('Book - highlights and notes.md');
    expect(exportFileName('x'.repeat(300)).length).toBeLessThanOrEqual(130);
  });
});
