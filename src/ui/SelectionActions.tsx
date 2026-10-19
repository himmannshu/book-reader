import { useLayoutEffect, useRef, type SyntheticEvent } from 'react';

/** What the floating button offers, and where (CSS px inside the reader body). */
export type SelectionAction =
  | { kind: 'create'; left: number; top: number }
  | { kind: 'remove'; id: string; left: number; top: number };

interface SelectionActionsProps {
  action: SelectionAction | null;
  /** Why highlights can't be saved, or null when they can. Shown, not only as a tooltip. */
  unsavedReason: string | null;
  onHighlight(): void;
  onRemove(id: string): void;
  onNote?(id: string): void;
  noteLabel?: string;
  noteUnavailableReason?: string | null;
  removeUnavailableReason?: string | null;
}

// Keep desktop selections on mouse press. Touch pointerdown must remain uncancelled so WebKit
// dispatches the tap's click; useHighlights keeps a range copy if touch focus clears selection.
const keepSelection = (event: SyntheticEvent) => event.preventDefault();

/** The floating "Highlight" button under a selection, or "Remove highlight" for a chosen one. */
export function SelectionActions({
  action,
  unsavedReason,
  onHighlight,
  onRemove,
  onNote,
  noteLabel = 'Add note',
  noteUnavailableReason = null,
  removeUnavailableReason = null,
}: SelectionActionsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const hasNoteAction = onNote !== undefined;
  useLayoutEffect(() => {
    const element = ref.current;
    const area = element?.offsetParent;
    if (!action || !element || !(area instanceof HTMLElement)) return;
    // Notes add a second action. Measure the actual menu (including any error reason) only while
    // shown, so a highlight near an edge never puts an action outside the reader.
    const box = element.getBoundingClientRect();
    element.style.left = `${Math.max(8, Math.min(action.left, area.clientWidth - box.width - 8))}px`;
    element.style.top = `${Math.max(8, Math.min(action.top, area.clientHeight - box.height - 8))}px`;
  }, [
    action,
    unsavedReason,
    noteUnavailableReason,
    removeUnavailableReason,
    noteLabel,
    hasNoteAction,
  ]);
  if (!action) return null;
  return (
    <div
      ref={ref}
      className="selection-actions"
      style={{ left: action.left, top: action.top }}
      onMouseDown={keepSelection}
    >
      {action.kind === 'create' ? (
        <>
          <button
            type="button"
            className="button"
            disabled={unsavedReason !== null}
            onClick={onHighlight}
          >
            Highlight
          </button>
          {unsavedReason && <p className="selection-note">{unsavedReason}</p>}
        </>
      ) : (
        <>
          {onNote && (
            <button
              type="button"
              className="button"
              disabled={noteUnavailableReason !== null}
              onClick={() => onNote(action.id)}
            >
              {noteLabel}
            </button>
          )}
          <button
            type="button"
            className="button"
            disabled={removeUnavailableReason !== null}
            onClick={() => onRemove(action.id)}
          >
            Remove highlight
          </button>
          {(noteUnavailableReason || removeUnavailableReason) && (
            <p className="selection-note">{noteUnavailableReason || removeUnavailableReason}</p>
          )}
        </>
      )}
    </div>
  );
}
