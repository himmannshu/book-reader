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

/** A row in the Notes tab (phase 21): a highlight with its note, if any, or a note of its own. */
export type AnnotationRow =
  { kind: 'highlight'; highlight: Highlight; note?: Note } | { kind: 'note'; note: Note };

/**
 * The Notes tab's rows in book order (phase 21, the user's choice): every highlight, with the note
 * attached to it, and every other note (page notes, and notes whose highlight is gone). Page notes
 * lead their page, then highlights from the top of the page down (as sortNotes orders notes).
 */
export function annotationRows(
  notes: readonly Note[],
  highlights: readonly Highlight[],
): AnnotationRow[] {
  const known = new Set(highlights.map((highlight) => highlight.id));
  const attached = new Map<string, Note>();
  const rows: AnnotationRow[] = [];
  for (const note of notes) {
    const target = note.target;
    if (target.kind === 'highlight' && known.has(target.highlightId)) {
      attached.set(target.highlightId, note);
    } else {
      rows.push({ kind: 'note', note });
    }
  }
  for (const highlight of highlights) {
    rows.push({ kind: 'highlight', highlight, note: attached.get(highlight.id) });
  }
  const place = (row: AnnotationRow) => {
    if (row.kind === 'note')
      return { page: row.note.target.pageIndex, y: -1, x: -1, id: row.note.id };
    const first = row.highlight.rects[0];
    return {
      page: row.highlight.pageIndex,
      y: first?.y ?? 0,
      x: first?.x ?? 0,
      id: row.highlight.id,
    };
  };
  return rows.sort((a, b) => {
    const p = place(a);
    const q = place(b);
    return p.page - q.page || p.y - q.y || p.x - q.x || p.id.localeCompare(q.id);
  });
}
