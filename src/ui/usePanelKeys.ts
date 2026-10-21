import { useEffect, useRef, type KeyboardEvent } from 'react';

/**
 * True while focus is on a panel tab (phase 20): a reader moving through the tabs with the arrow
 * keys keeps focus there, so the newly shown panel does not take it.
 */
export const onTab = () => document.activeElement?.getAttribute('role') === 'tab';

/** The buttons a side panel's arrow keys move between, in document order (rows' More buttons too). */
export const PANEL_ENTRY = ':is(.panel-entry, .row-more):not(:disabled)';

/**
 * Keyboard behaviour shared by the reader's side panels. Focus moves to the first entry once the
 * panel's content is ready. Arrow keys, Home and End move between entries. Tab alone isn't enough:
 * Safari skips buttons when tabbing unless the reader has changed a system setting. (Escape is
 * handled by ReaderView, so it also works when no entry has focus.)
 */
export function usePanelKeys<T extends HTMLElement>(ready: boolean) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!ready || onTab()) return;
    ref.current?.querySelector<HTMLButtonElement>(PANEL_ENTRY)?.focus();
  }, [ready]);

  function onKeyDown(event: KeyboardEvent) {
    const entries = [...(ref.current?.querySelectorAll<HTMLButtonElement>(PANEL_ENTRY) ?? [])];
    if (entries.length === 0) return;
    const current = entries.indexOf(document.activeElement as HTMLButtonElement);
    const last = entries.length - 1;
    const next =
      event.key === 'ArrowDown'
        ? Math.min(current + 1, last)
        : event.key === 'ArrowUp'
          ? Math.max(current - 1, 0)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    entries[next]?.focus();
  }

  return { ref, onKeyDown };
}
