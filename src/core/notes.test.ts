import { describe, expect, it } from 'vitest';
import type { Highlight } from './highlights';
import { noteId, sortNotes, validNoteText, type Note, type NoteTarget } from './notes';

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
