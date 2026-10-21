import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import {
  HIGHLIGHT_COLORS,
  highlightColor,
  type Highlight,
  type HighlightColor,
} from '../core/highlights';
import { annotationRows, validNoteText, type AnnotationRow, type NoteTarget } from '../core/notes';
import type { useNotes } from './useNotes';
import { PANEL_ENTRY, usePanelKeys } from './usePanelKeys';
import { Button, EmptyState } from './controls';
import { RowMenu, type RowMenuItem } from './RowMenu';
import { COLOR_LABELS } from './SelectionActions';

/** A passage a row's Copy or Share hands on. */
export interface RowPassage {
  quote: string;
  pageIndex: number;
}

function NoteEditor({
  notes,
  quote,
  onRecordVoice,
  voiceUnavailableReason,
}: {
  notes: ReturnType<typeof useNotes>;
  quote: string | undefined;
  /** Records a voice note for the editor's target instead (phase 23). */
  onRecordVoice?(target: NoteTarget): void;
  voiceUnavailableReason: string | null;
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
        {onRecordVoice && (
          <Button
            icon="mic"
            disabled={notes.changing || voiceUnavailableReason !== null}
            title={voiceUnavailableReason ?? undefined}
            onClick={() => onRecordVoice(editor.target)}
          >
            Record voice note
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
  onRecolour,
  onRemoveHighlight,
  onCopy,
  onShare,
  onExport,
  exportUnavailableReason = null,
  children,
  chapterFor,
  onRecordVoice,
  voiceUnavailableReason = null,
}: {
  id: string;
  notes: ReturnType<typeof useNotes>;
  highlights: readonly Highlight[];
  currentPage: number;
  onOpen(target: NoteTarget): void;
  /** Goes to a row's place in the book. */
  onChoose(target: NoteTarget): void;
  /** Changes a highlight's colour (phase 21). */
  onRecolour?(id: string, color: HighlightColor): void;
  onRemoveHighlight?(id: string): void;
  onCopy?(passage: RowPassage): void;
  onShare?(passage: RowPassage): void;
  /** Downloads the book's highlights and notes as Markdown (phase 12). */
  onExport?(): void;
  /** Why export can't run yet, shown under the button; null when it can. */
  exportUnavailableReason?: string | null;
  /** More sections after the notes (voice notes, phase 15). */
  children?: ReactNode;
  /** The chapter a page belongs to, for each row's metadata line (phase 20). */
  chapterFor?(pageIndex: number): string | undefined;
  /** Records a voice note from the note editor (phase 23). */
  onRecordVoice?(target: NoteTarget): void;
  /** Why voice notes can't be recorded now, or null. */
  voiceUnavailableReason?: string | null;
}) {
  const { ref, onKeyDown } = usePanelKeys<HTMLElement>(
    notes.items !== null && notes.editor === null,
  );
  // Every highlight has a row (the user's choice), with its note when it has one.
  const rows = useMemo(
    () => (notes.items === null ? null : annotationRows(notes.items, highlights)),
    [notes.items, highlights],
  );
  useEffect(() => {
    // A confirmed deletion can remove the focused row. Do not leave focus on the document body.
    if (!notes.editor && !notes.confirmation && document.activeElement === document.body)
      ref.current?.querySelector<HTMLButtonElement>(PANEL_ENTRY)?.focus();
  }, [rows, notes.editor, notes.confirmation, ref]);
  const quoteFor = (target: NoteTarget) =>
    target.kind === 'highlight'
      ? highlights.find((highlight) => highlight.id === target.highlightId)?.quote
      : undefined;

  function menuFor(row: AnnotationRow): RowMenuItem[] {
    const note = row.note;
    const busy = notes.changing || notes.unavailableReason !== null;
    if (row.kind === 'note') {
      // A page note (or one whose highlight is gone) hands on its own text, or the passage.
      const passage = {
        quote: quoteFor(row.note.target) ?? row.note.text,
        pageIndex: row.note.target.pageIndex,
      };
      const items: RowMenuItem[] = [
        {
          label: 'Edit note',
          icon: 'note',
          disabled: busy,
          onSelect: () => onOpen(row.note.target),
        },
      ];
      if (onShare) items.push({ label: 'Share', icon: 'share', onSelect: () => onShare(passage) });
      if (onCopy) items.push({ label: 'Copy', icon: 'copy', onSelect: () => onCopy(passage) });
      items.push({
        label: 'Delete',
        icon: 'delete',
        disabled: busy,
        onSelect: () => notes.remove(row.note),
      });
      return items;
    }
    const highlight = row.highlight;
    const passage = { quote: highlight.quote, pageIndex: highlight.pageIndex };
    const target: NoteTarget = {
      kind: 'highlight',
      pageIndex: highlight.pageIndex,
      highlightId: highlight.id,
    };
    const items: RowMenuItem[] = [
      {
        label: note ? 'Edit note' : 'Add note',
        icon: 'note',
        disabled: busy,
        onSelect: () => onOpen(target),
      },
    ];
    if (onRecolour)
      for (const color of HIGHLIGHT_COLORS)
        items.push({
          label: COLOR_LABELS[color],
          color,
          checked: highlightColor(highlight) === color,
          disabled: busy,
          onSelect: () => onRecolour(highlight.id, color),
        });
    if (onShare) items.push({ label: 'Share', icon: 'share', onSelect: () => onShare(passage) });
    if (onCopy) items.push({ label: 'Copy', icon: 'copy', onSelect: () => onCopy(passage) });
    // Delete removes the note; Remove highlight removes the highlight (and asks about its note).
    if (note)
      items.push({
        label: 'Delete',
        icon: 'delete',
        disabled: busy,
        onSelect: () => notes.remove(note),
      });
    if (onRemoveHighlight)
      items.push({
        label: 'Remove highlight',
        icon: 'highlight',
        disabled: busy,
        onSelect: () => onRemoveHighlight(highlight.id),
      });
    return items;
  }

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
          onRecordVoice={onRecordVoice}
          voiceUnavailableReason={voiceUnavailableReason}
        />
      )}
      {rows?.length === 0 && (
        <EmptyState icon="note" compact>
          No notes yet.
        </EmptyState>
      )}
      {rows && rows.length > 0 && (
        <ul aria-label="Book notes">
          {rows.map((row) => {
            const note = row.note;
            const pageIndex =
              row.kind === 'note' ? row.note.target.pageIndex : row.highlight.pageIndex;
            const quote = row.kind === 'note' ? quoteFor(row.note.target) : row.highlight.quote;
            const color = row.kind === 'highlight' ? highlightColor(row.highlight) : undefined;
            const chapter = chapterFor?.(pageIndex);
            return (
              <li
                key={row.kind === 'note' ? row.note.id : row.highlight.id}
                className="note-row annotation-row"
                data-note-id={note?.id}
                data-highlight-id={row.kind === 'highlight' ? row.highlight.id : undefined}
              >
                <button
                  type="button"
                  className="panel-entry note-jump"
                  onClick={() =>
                    onChoose(
                      row.kind === 'note'
                        ? row.note.target
                        : { kind: 'highlight', pageIndex, highlightId: row.highlight.id },
                    )
                  }
                >
                  <strong>
                    {row.kind === 'note' && row.note.target.kind === 'page'
                      ? 'Page note'
                      : 'Highlight'}{' '}
                    · Page {pageIndex + 1}
                    {chapter && ` · ${chapter}`}
                  </strong>
                  {quote && (
                    <span className="note-quote">
                      {color ? (
                        <mark className={`br-mark br-mark--${color}`}>{quote}</mark>
                      ) : (
                        `“${quote}”`
                      )}
                    </span>
                  )}
                  {note && <span className="note-text">{note.text}</span>}
                </button>
                <RowMenu items={menuFor(row)} />
              </li>
            );
          })}
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
