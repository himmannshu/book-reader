import { describe, expect, it } from 'vitest';
import type { Highlight } from './highlights';
import {
  annotationRows,
  noteId,
  sortNotes,
  validNoteText,
  type Note,
  type NoteTarget,
} from './notes';

const page: NoteTarget = { kind: 'page', pageIndex: 0 };
const passage: NoteTarget = { kind: 'highlight', pageIndex: 0, highlightId: 'h' };
const note = (target: NoteTarget): Note => ({
  id: noteId('book', target),
  bookId: 'book',
  target,
  text: 'A thought\n中文 📖',
  createdAt: 1,
  updatedAt: 2,
});

describe('notes', () => {
  it('identifies one note per book and target without confusing pages and highlights', () => {
    expect(noteId('book', page)).toBe(noteId('book', { ...page }));
    expect(
      new Set([noteId('book', page), noteId('book', passage), noteId('other', page)]).size,
    ).toBe(3);
  });

  it('rejects whitespace but accepts multiline Unicode without normalizing the text', () => {
    expect(validNoteText(' \n\t ')).toBe(false);
    expect(validNoteText(note(page).text)).toBe(true);
  });

  it('orders page notes before passages, using PDF position rather than ids or creation times', () => {
    const high: Highlight = {
      id: 'h',
      bookId: 'book',
      pageIndex: 0,
      rects: [{ pageIndex: 0, x: 72, y: 600, width: 100, height: 14 }],
      quote: 'near the foot',
      createdAt: 1,
    };
    const low: Highlight = {
      ...high,
      id: 'a',
      rects: [{ ...high.rects[0], pageIndex: 0, x: 72, y: 200, width: 100, height: 14 }],
    };
    const notes = [
      note(passage),
      note({ kind: 'page', pageIndex: 1 }),
      note({ ...passage, highlightId: 'a' }),
      note(page),
    ];
    expect(sortNotes(notes, [high, low]).map((n) => n.id)).toEqual([
      noteId('book', page),
      noteId('book', { ...passage, highlightId: 'a' }),
      noteId('book', passage),
      noteId('book', { kind: 'page', pageIndex: 1 }),
    ]);
    expect(notes[0]?.target).toEqual(passage); // Sorting never mutates the input.
  });
});

describe('annotationRows (phase 21: the Notes tab lists every highlight)', () => {
  const mark = (id: string, pageIndex: number, y: number): Highlight => ({
    id,
    bookId: 'b',
    pageIndex,
    rects: [{ pageIndex, x: 72, y, width: 100, height: 12 }],
    quote: id,
    createdAt: 1,
  });
  const written = (target: NoteTarget, text: string): Note => ({
    id: noteId('b', target),
    bookId: 'b',
    target,
    text,
    createdAt: 1,
    updatedAt: 1,
  });

  it('gives every highlight a row, with its note; page notes lead their page', () => {
    const highlights = [mark('low', 0, 300), mark('high', 0, 100), mark('later', 2, 50)];
    const notes = [
      written({ kind: 'highlight', pageIndex: 0, highlightId: 'low' }, 'On the low one'),
      written({ kind: 'page', pageIndex: 0 }, 'Page one'),
    ];
    const rows = annotationRows(notes, highlights);
    expect(
      rows.map((row) =>
        row.kind === 'highlight' ? `${row.highlight.id}:${row.note?.text ?? ''}` : row.note.text,
      ),
    ).toEqual(['Page one', 'high:', 'low:On the low one', 'later:']);
  });

  it('keeps a note whose highlight is gone, as a note on its page', () => {
    const notes = [written({ kind: 'highlight', pageIndex: 1, highlightId: 'gone' }, 'Orphan')];
    const rows = annotationRows(notes, [mark('h', 3, 10)]);
    expect(rows.map((row) => row.kind)).toEqual(['note', 'highlight']);
  });
});
