import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { HighlightColor } from '../core/highlights';
import { Icon, type IconName } from './icons';
import { IconButton, cx } from './controls';

/** One action in a list row's More menu. A `color` item is one of a set of colour choices. */
export type RowMenuItem =
  | { label: string; icon: IconName; onSelect(): void; disabled?: boolean }
  | {
      label: string;
      color: HighlightColor;
      checked: boolean;
      onSelect(): void;
      disabled?: boolean;
    };

const ITEMS = '[role="menuitem"]:not(:disabled), [role="menuitemradio"]:not(:disabled)';

/**
 * A list row's More menu (phase 21, the design's AnnotationRow): a round button that opens a short
 * menu of the row's actions. Arrow keys move through it, Escape and Tab close it, and a click
 * outside closes it. Focus goes back to the button before an action runs, so an action that opens
 * something (an editor, a confirmation) takes focus from there.
 */
export function RowMenu({ items, disabled = false }: { items: RowMenuItem[]; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  // Opens upward when there is no room below (rows near the bottom of the panel).
  useLayoutEffect(() => {
    if (!open || !menu.current) return;
    const box = menu.current.getBoundingClientRect();
    if (box.bottom > window.innerHeight - 8 && box.height < box.top) setUp(true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>(ITEMS)?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !wrapper.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function close() {
    setOpen(false);
    setUp(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const entries = [...(menu.current?.querySelectorAll<HTMLButtonElement>(ITEMS) ?? [])];
    const at = entries.indexOf(document.activeElement as HTMLButtonElement);
    const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
    // The panel's own keys (arrows between rows, Escape to close it) must not also run.
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
      button.current?.focus();
    } else if (step !== undefined) {
      event.preventDefault();
      event.stopPropagation();
      entries[(at + step + entries.length) % entries.length]?.focus();
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      event.stopPropagation();
      entries[event.key === 'Home' ? 0 : entries.length - 1]?.focus();
    } else if (event.key === 'Tab') {
      close();
    }
  }

  function choose(item: RowMenuItem) {
    close();
    button.current?.focus();
    item.onSelect();
  }

  const colors = items.filter((item) => 'color' in item);
  const actions = items.filter((item) => !('color' in item));
  return (
    <div ref={wrapper} className="row-menu">
      <IconButton
        ref={button}
        icon="more"
        label="More actions"
        className={cx('row-more', open && 'is-pressed')}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
      />
      {open && (
        <div
          ref={menu}
          className={cx('br-menu', 'row-menu__list', up && 'row-menu__list--up')}
          role="menu"
          aria-label="More actions"
          onKeyDown={onKeyDown}
        >
          {colors.length > 0 && (
            <div className="row-menu__colors" role="group" aria-label="Colour">
              {colors.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitemradio"
                  aria-checked={'checked' in item && item.checked}
                  aria-label={item.label}
                  title={item.label}
                  className={cx(
                    'br-swatch',
                    'color' in item && `br-swatch--${item.color}`,
                    'checked' in item && item.checked && 'is-selected',
                  )}
                  disabled={item.disabled}
                  onClick={() => choose(item)}
                />
              ))}
            </div>
          )}
          {actions.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className="br-menu__item"
              disabled={item.disabled}
              onClick={() => choose(item)}
            >
              {'icon' in item && <Icon name={item.icon} />}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
