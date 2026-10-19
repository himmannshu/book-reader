import type { SyntheticEvent } from 'react';

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
}

// Pressing the button must not move focus or clear the reader's text selection.
const keepSelection = (event: SyntheticEvent) => event.preventDefault();

/** The floating "Highlight" button under a selection, or "Remove highlight" for a chosen one. */
export function SelectionActions({
  action,
  unsavedReason,
  onHighlight,
  onRemove,
}: SelectionActionsProps) {
  if (!action) return null;
  return (
    <div
      className="selection-actions"
      style={{ left: action.left, top: action.top }}
      onPointerDown={keepSelection}
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
        <button type="button" className="button" onClick={() => onRemove(action.id)}>
          Remove highlight
        </button>
      )}
    </div>
  );
}
