import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
  type SyntheticEvent,
} from 'react';
import { HIGHLIGHT_COLORS, type HighlightColor } from '../core/highlights';
import { IconButton } from './controls';

/**
 * What the menu offers, and where (CSS px inside the reader body): `top` is just below the
 * selection or highlight, `above` just above it. The menu goes above when it fits there.
 */
export type SelectionAction =
  | { kind: 'create'; left: number; top: number; above: number }
  | { kind: 'remove'; id: string; left: number; top: number; above: number };

export const COLOR_LABELS: Record<HighlightColor, string> = {
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
  pink: 'Pink',
};

interface SelectionActionsProps {
  action: SelectionAction | null;
  /** The chosen highlight's colour (absent over a fresh selection). */
  color?: HighlightColor;
  /** Why highlights can't be saved, or null when they can. Shown, not only as a tooltip. */
  unsavedReason: string | null;
  /** Over a selection: highlight it in this colour. Over a highlight: recolour it. */
  onColor(color: HighlightColor): void;
  onRemove(id: string): void;
  /** Over a selection: highlight it (yellow) and open its note. Over a highlight: open its note. */
  onNote?(): void;
  noteLabel?: string;
  onCopy?(): void;
  /** Shares the passage with another app (phase 17). */
  onShare?(): void;
  /** Reads aloud from the sentence where the passage starts. */
  onListen?(): void;
  /** Records a voice note on the chosen highlight (phase 15; kept here until phase 23). */
  onVoiceNote?(id: string): void;
  noteUnavailableReason?: string | null;
  removeUnavailableReason?: string | null;
  /** The pages, which the menu stays inside (not over a docked panel). Default: its whole area. */
  bounds?: RefObject<HTMLElement | null>;
}

const MARGIN = 8;
/** The one-row menu's padding, gaps and separator around its two parts (app.css). */
const ONE_ROW_EXTRA = 2 * 4 + 2 * 2 + 1 + 2 * 4;

// Keep desktop selections on mouse press. Touch pointerdown must remain uncancelled so WebKit
// dispatches the tap's click; useHighlights keeps a range copy if touch focus clears selection.
const keepSelection = (event: SyntheticEvent) => event.preventDefault();

/**
 * The menu over a text selection or a chosen highlight (phase 21, the design's HighlightMenu):
 * colour swatches, a note, copy, share and listen from here, and Remove highlight on a highlight.
 */
export function SelectionActions({
  action,
  color,
  unsavedReason,
  onColor,
  onRemove,
  onNote,
  noteLabel = 'Add note',
  onCopy,
  onShare,
  onListen,
  onVoiceNote,
  noteUnavailableReason = null,
  removeUnavailableReason = null,
  bounds,
}: SelectionActionsProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Two rows (the colours, then the actions) where one row doesn't fit, as on a phone.
  const [stacked, setStacked] = useState(false);
  const reason =
    action?.kind === 'create' ? unsavedReason : noteUnavailableReason || removeUnavailableReason;
  useLayoutEffect(() => {
    const element = ref.current;
    const area = element?.offsetParent;
    if (!action || !element || !(area instanceof HTMLElement)) return;
    const areaBox = area.getBoundingClientRect();
    const pages = bounds?.current?.getBoundingClientRect() ?? areaBox;
    const minLeft = Math.max(MARGIN, pages.left - areaBox.left + MARGIN);
    const maxRight = Math.min(area.clientWidth, pages.right - areaBox.left) - MARGIN;
    const room = Math.max(0, maxRight - minLeft);
    // The one-row width, from its parts (they keep their natural width in either layout).
    const menu = element.querySelector<HTMLElement>('.br-hlmenu');
    const [swatches = 0, actions = 0] = ['.br-hlmenu__swatches', '.br-hlmenu__actions'].map(
      (part) => menu?.querySelector<HTMLElement>(part)?.scrollWidth ?? 0,
    );
    const oneRow = swatches + actions + ONE_ROW_EXTRA;
    if (oneRow > room !== stacked) {
      setStacked(oneRow > room);
      return;
    }
    element.style.maxWidth = `${room}px`;
    // Above the selection when it fits, else below: never over the selected words. Measure the
    // actual menu (with any reason under it) so it stays inside the pages.
    const box = element.getBoundingClientRect();
    const top = action.above - box.height >= MARGIN ? action.above - box.height : action.top;
    element.style.left = `${Math.max(minLeft, Math.min(action.left, maxRight - box.width))}px`;
    element.style.top = `${Math.max(MARGIN, Math.min(top, area.clientHeight - box.height - MARGIN))}px`;
  }, [action, reason, noteLabel, color, stacked, bounds]);
  if (!action) return null;

  const existing = action.kind === 'remove';
  function onSwatchKey(event: KeyboardEvent<HTMLButtonElement>) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const radios = [
      ...(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
        '[role="radio"]',
      ) ?? []),
    ];
    const at = radios.indexOf(event.currentTarget);
    radios[(at + step + radios.length) % radios.length]?.focus();
  }

  return (
    <div
      ref={ref}
      className="selection-actions"
      style={{ left: action.left, top: action.top }}
      onMouseDown={keepSelection}
    >
      <div
        className={`br-hlmenu${stacked ? ' br-hlmenu--stacked' : ''}`}
        role="toolbar"
        aria-label="Highlight"
      >
        <div className="br-hlmenu__swatches" role="radiogroup" aria-label="Highlight colour">
          {HIGHLIGHT_COLORS.map((option, index) => {
            const chosen = existing && color === option;
            // One Tab stop: the chosen colour, or the first over a fresh selection.
            const stop = existing && color ? chosen : index === 0;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={chosen}
                aria-label={COLOR_LABELS[option]}
                title={COLOR_LABELS[option]}
                tabIndex={stop ? 0 : -1}
                className={`br-swatch br-swatch--${option}${chosen ? ' is-selected' : ''}`}
                disabled={existing ? removeUnavailableReason !== null : unsavedReason !== null}
                onClick={() => onColor(option)}
                onKeyDown={onSwatchKey}
              />
            );
          })}
        </div>
        <span className="br-hlmenu__sep" aria-hidden="true" />
        <div className="br-hlmenu__actions">
          {onNote && (
            <IconButton
              icon="note"
              label={noteLabel}
              disabled={(existing ? noteUnavailableReason : unsavedReason) !== null}
              onClick={onNote}
            />
          )}
          {existing && onVoiceNote && (
            <IconButton
              icon="mic"
              label="Voice note"
              disabled={noteUnavailableReason !== null}
              onClick={() => onVoiceNote(action.id)}
            />
          )}
          {onCopy && <IconButton icon="copy" label="Copy" onClick={onCopy} />}
          {onShare && <IconButton icon="share" label="Share" onClick={onShare} />}
          {onListen && <IconButton icon="listen" label="Listen from here" onClick={onListen} />}
          {existing && (
            <IconButton
              icon="delete"
              label="Remove highlight"
              disabled={removeUnavailableReason !== null}
              onClick={() => onRemove(action.id)}
            />
          )}
        </div>
      </div>
      {reason && <p className="selection-note">{reason}</p>}
    </div>
  );
}
