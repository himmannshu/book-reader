import type { Highlight } from './highlights';

export type NoteTarget =
  | { kind: 'page'; pageIndex: number }
  | { kind: 'highlight'; pageIndex: number; highlightId: string };

/** A plain-text thought associated with a page or an existing PDF-coordinate highlight. */
export interface Note {
  id: string;
  bookId: string;
  target: NoteTarget;
  text: string;
  createdAt: number;
  updatedAt: number;
}

/** A stable, unambiguous identity: each book/target has one editable note. */
export function noteId(bookId: string, target: NoteTarget): string {
  return JSON.stringify([
    bookId,
    target.kind,
    target.kind === 'page' ? target.pageIndex : target.highlightId,
  ]);
}

export const validNoteText = (text: string): boolean => text.trim().length > 0;

export function validNote(note: Note): boolean {
  return (
    note.bookId.length > 0 &&
    Number.isInteger(note.target.pageIndex) &&
    note.target.pageIndex >= 0 &&
    (note.target.kind === 'page' || note.target.highlightId.length > 0) &&
    note.id === noteId(note.bookId, note.target) &&
    validNoteText(note.text) &&
    Number.isFinite(note.createdAt) &&
    Number.isFinite(note.updatedAt)
  );
}

/** Page notes lead their page; passage notes follow the first rectangle of their highlight. */
export function sortNotes(notes: readonly Note[], highlights: readonly Highlight[]): Note[] {
  const byId = new Map(highlights.map((h) => [h.id, h]));
  const position = (note: Note) =>
    note.target.kind === 'highlight' ? byId.get(note.target.highlightId)?.rects[0] : undefined;
  return [...notes].sort(
    (a, b) =>
      a.target.pageIndex - b.target.pageIndex ||
      (position(a)?.y ?? -1) - (position(b)?.y ?? -1) ||
      (position(a)?.x ?? -1) - (position(b)?.x ?? -1) ||
      a.id.localeCompare(b.id),
  );
}
