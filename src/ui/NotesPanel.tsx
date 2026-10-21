import { useEffect, useRef, type ReactNode } from 'react';
import type { Highlight } from '../core/highlights';
import { validNoteText, type Note, type NoteTarget } from '../core/notes';
import type { useNotes } from './useNotes';
import { PANEL_ENTRY, usePanelKeys } from './usePanelKeys';
import { Button, EmptyState } from './controls';

function NoteEditor({
  notes,
  quote,
}: {
  notes: ReturnType<typeof useNotes>;
  quote: string | undefined;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    input.current?.focus();
  }, []);
  const editor = notes.editor;
  if (!editor) return null;
  return (
    <form
      className="note-editor"
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        // Safari may skip buttons in its native tab order. Keep editor controls reachable there too.
        const controls = [
          ...event.currentTarget.querySelectorAll<HTMLElement>('textarea, button:not(:disabled)'),
        ];
        const next =
          controls.indexOf(document.activeElement as HTMLElement) + (event.shiftKey ? -1 : 1);
        if (controls[next]) {
          event.preventDefault();
          controls[next].focus();
        }
      }}
      onSubmit={(event) => {
        event.preventDefault();
        void notes.save();
      }}
    >
      <h3>
        {editor.target.kind === 'page' ? 'Page' : 'Highlight on page'} {editor.target.pageIndex + 1}
      </h3>
      {quote && <blockquote>{quote}</blockquote>}
      <label htmlFor="note-text">Note text</label>
      <textarea
        ref={input}
        id="note-text"
        value={editor.text}
        disabled={notes.changing}
        onChange={(event) => notes.setText(event.target.value)}
        rows={6}
      />
      <div className="note-buttons">
        <Button
          variant="primary"
          type="submit"
          disabled={notes.changing || !validNoteText(editor.text)}
        >
          Save note
        </Button>
        <Button disabled={notes.changing} onClick={notes.cancel}>
          Cancel
        </Button>
        {editor.original && (
          <Button
            disabled={notes.changing}
            onClick={() => {
              if (editor.original) notes.remove(editor.original);
            }}
          >
            Delete note
          </Button>
        )}
      </div>
    </form>
  );
}

export function NotesPanel({
  id,
  notes,
  highlights,
  currentPage,
  onOpen,
  onChoose,
  onExport,
  exportUnavailableReason = null,
  children,
}: {
  id: string;
  notes: ReturnType<typeof useNotes>;
  highlights: readonly Highlight[];
  currentPage: number;
  onOpen(target: NoteTarget): void;
  onChoose(note: Note): void;
  /** Downloads the book's highlights and notes as Markdown (phase 12). */
  onExport?(): void;
  /** Why export can't run yet, shown under the button; null when it can. */
  exportUnavailableReason?: string | null;
  /** More sections after the notes (voice notes, phase 15). */
  children?: ReactNode;
}) {
  const { ref, onKeyDown } = usePanelKeys<HTMLElement>(
    notes.items !== null && notes.editor === null,
  );
  useEffect(() => {
    // A confirmed deletion can remove the focused row. Do not leave focus on the document body.
    if (!notes.editor && !notes.confirmation && document.activeElement === document.body)
      ref.current?.querySelector<HTMLButtonElement>(PANEL_ENTRY)?.focus();
  }, [notes.items, notes.editor, notes.confirmation, ref]);
  const quoteFor = (target: NoteTarget) =>
    target.kind === 'highlight'
      ? highlights.find((highlight) => highlight.id === target.highlightId)?.quote
      : undefined;
  return (
    <nav
      id={id}
      ref={ref}
      className="notes-panel"
      aria-label="Notes"
      tabIndex={-1}
      onKeyDown={(event) => {
        if (!(event.target instanceof HTMLTextAreaElement)) onKeyDown(event);
      }}
    >
      {notes.unavailableReason && <p className="panel-note">{notes.unavailableReason}</p>}
      {notes.failed && <Button onClick={notes.retry}>Retry notes</Button>}
      <button
        type="button"
        className="panel-entry"
        disabled={notes.unavailableReason !== null || notes.changing}
        onClick={() => onOpen({ kind: 'page', pageIndex: currentPage })}
      >
        Add note to this page
      </button>
      {notes.error && (
        <p className="error" role="alert">
          {notes.error}
        </p>
      )}
      {notes.editor && (
        <NoteEditor
          key={JSON.stringify(notes.editor.target)}
          notes={notes}
          quote={quoteFor(notes.editor.target)}
        />
      )}
      {notes.items?.length === 0 && (
        <EmptyState icon="note" compact>
          No notes yet.
        </EmptyState>
      )}
      {notes.items && notes.items.length > 0 && (
        <ul aria-label="Book notes">
          {notes.items.map((note) => (
            <li key={note.id} className="note-row" data-note-id={note.id}>
              <button
                type="button"
                className="panel-entry note-jump"
                onClick={() => onChoose(note)}
              >
                <strong>
                  {note.target.kind === 'page' ? 'Page note' : 'Highlight'} · Page{' '}
                  {note.target.pageIndex + 1}
                </strong>
                {quoteFor(note.target) && (
                  <span className="note-quote">“{quoteFor(note.target)}”</span>
                )}
                <span className="note-text">{note.text}</span>
              </button>
              <div className="note-buttons">
                <button
                  type="button"
                  className="panel-entry"
                  onClick={() => onOpen(note.target)}
                  disabled={notes.changing}
                >
                  Edit note
                </button>
                <button
                  type="button"
                  className="panel-entry"
                  onClick={() => notes.remove(note)}
                  disabled={notes.changing}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {children}
      {/* Last, so arrow keys go from Add note straight to the notes. */}
      {onExport && (
        <>
          <button
            type="button"
            className="panel-entry"
            disabled={exportUnavailableReason !== null}
            onClick={onExport}
          >
            Export highlights and notes
          </button>
          {exportUnavailableReason && <p className="panel-note">{exportUnavailableReason}</p>}
        </>
      )}
    </nav>
  );
}
