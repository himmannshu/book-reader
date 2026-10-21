// Shared controls (phase 14), restyled and extended from the Book Reader design system in phase 18
// (harness/context/design-system/components/). Class names follow the design's `br-` prefix.
import {
  useEffect,
  useRef,
  useSyncExternalStore,
  type ComponentProps,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { THEMES, validTheme, type Theme } from '../core/reading-state';
import { Icon, type IconName } from './icons';
import { THEME_LABELS } from './theme';

/** Below the design's 720 px the reader's toolbar is compact (panels under More), and panels and
 * Reading settings are bottom sheets (phases 19, 20). */
export const NARROW_QUERY = '(max-width: 719px)';

/** Whether a media query matches, following changes (for example rotating an iPad). */
export function useMediaQuery(query: string): boolean {
  // jsdom (unit tests) has no matchMedia: treat it as a wide screen.
  const supported = typeof window.matchMedia === 'function';
  return useSyncExternalStore(
    (onChange) => {
      if (!supported) return () => undefined;
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => supported && window.matchMedia(query).matches,
    () => false,
  );
}

export function ThemePicker({ theme, onChange }: { theme: Theme; onChange(theme: Theme): void }) {
  return (
    <label className="picker-label">
      <span className="picker-caption">Theme</span>
      <select
        className="picker"
        value={theme}
        onChange={(event) => {
          const next = event.currentTarget.value;
          if (validTheme(next)) onChange(next);
        }}
      >
        {THEMES.map((option) => (
          <option key={option} value={option}>
            {THEME_LABELS[option]}
          </option>
        ))}
      </select>
    </label>
  );
}

export const cx = (...names: (string | false | null | undefined)[]) =>
  names.filter(Boolean).join(' ');

export interface SegmentOption<V extends string> {
  value: V;
  label: string;
  icon?: IconName;
  /** A theme whose paper colour the option previews (the theme picker). */
  swatch?: Theme;
}

/**
 * Two to four exclusive options side by side (phase 19). A radio group: the arrow keys move the
 * choice, and only the chosen option is a Tab stop. `iconOnly` still names each option.
 */
export function SegmentedControl<V extends string>({
  options,
  value,
  onChange,
  label,
  iconOnly = false,
  block = false,
}: {
  options: readonly SegmentOption<V>[];
  value: V;
  onChange(value: V): void;
  label: string;
  iconOnly?: boolean;
  block?: boolean;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const index = options.findIndex((option) => option.value === value);
    const next = options[(index + step + options.length) % options.length];
    if (!next) return;
    onChange(next.value);
    const group = event.currentTarget.parentElement;
    group?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[options.indexOf(next)]?.focus();
  }

  return (
    <div role="radiogroup" aria-label={label} className={cx('br-seg', block && 'br-seg--block')}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={iconOnly ? option.label : undefined}
            title={iconOnly ? option.label : undefined}
            tabIndex={selected ? 0 : -1}
            className={cx('br-seg__opt', selected && 'is-selected')}
            onClick={() => onChange(option.value)}
            onKeyDown={onKeyDown}
          >
            {option.swatch && (
              <span className={`br-seg__swatch br-seg__swatch--${option.swatch}`} />
            )}
            {option.icon && <Icon name={option.icon} size={18} />}
            {!iconOnly && <span>{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A text button. `primary` at most once per screen, `secondary` by default, `ghost` for quiet
 * actions inside panels, `danger` only to confirm a destructive step.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  className,
  children,
  type = 'button',
  ...props
}: ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  icon?: IconName;
}) {
  return (
    <button
      type={type}
      className={cx('br-btn', `br-btn--${variant}`, `br-btn--${size}`, className)}
      {...props}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      {children}
    </button>
  );
}

/** A round, icon-only button. `label` is its accessible name and its tooltip. */
export function IconButton({
  icon,
  label,
  pressed,
  filled = false,
  variant = 'plain',
  size = 'md',
  className,
  type = 'button',
  ...props
}: Omit<ComponentProps<'button'>, 'children'> & {
  icon: IconName;
  label: string;
  /** Makes it a toggle (aria-pressed). */
  pressed?: boolean;
  /** Fills the icon in (a pressed bookmark). */
  filled?: boolean;
  variant?: 'plain' | 'filled' | 'accent';
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={cx('br-iconbtn', `br-iconbtn--${variant}`, `br-iconbtn--${size}`, className)}
      {...props}
    >
      <Icon name={icon} size={size === 'lg' ? 24 : size === 'sm' ? 18 : 20} filled={filled} />
    </button>
  );
}

/** A 4 px reading-progress bar; `value` is 0 to 1. */
export function ProgressBar({
  value,
  label = 'Reading progress',
  showValue = false,
}: {
  value: number;
  label?: string;
  showValue?: boolean;
}) {
  const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <span className="br-progress">
      <span
        className="br-progress__track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <span className="br-progress__fill" style={{ width: `${percent}%` }} />
      </span>
      {showValue && <span className="br-progress__val">{percent}%</span>}
    </span>
  );
}

/**
 * A filter toggle above the library shelf (phase 22). Selected shows a check and the accent, so the
 * state never relies on colour alone; `count` is how many books match.
 */
export function Chip({
  selected,
  count,
  onClick,
  children,
}: {
  selected: boolean;
  count?: number;
  onClick(): void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cx('br-chip', selected && 'is-selected')}
      onClick={onClick}
    >
      {selected && <Icon name="check" size={16} />}
      <span>{children}</span>
      {count !== undefined && <span className="br-chip__count">{count}</span>}
    </button>
  );
}

/** One or two words of status on a book card (phase 22). Never more than one per card. */
export function Badge({
  tone = 'neutral',
  icon,
  children,
}: {
  tone?: 'neutral' | 'accent' | 'positive' | 'danger';
  icon?: IconName;
  children: ReactNode;
}) {
  return (
    <span className={cx('br-badge', `br-badge--${tone}`)}>
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  );
}

/**
 * A short message at the bottom of the screen. `danger` is for failures the reader can act on and
 * stays until dismissed; the others leave on their own after about 4 s (app.css).
 */
export function Toast({
  tone = 'neutral',
  children,
  onDismiss,
}: {
  tone?: 'neutral' | 'positive' | 'danger';
  children: ReactNode;
  onDismiss?: () => void;
}) {
  const icon: IconName = tone === 'danger' ? 'alert' : tone === 'positive' ? 'check' : 'info';
  return (
    <div
      className={cx('br-toast', `br-toast--${tone}`)}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <span className="br-toast__icon">
        <Icon name={icon} />
      </span>
      <span className="br-toast__msg">{children}</span>
      {onDismiss && <IconButton icon="close" label="Dismiss" size="sm" onClick={onDismiss} />}
    </div>
  );
}

/**
 * What fills a screen or panel with nothing in it yet: what will appear and how. In panels
 * (`compact`) there is no heading and no action.
 */
export function EmptyState({
  icon,
  title,
  children,
  action,
  compact = false,
}: {
  icon: IconName;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cx('br-empty', compact && 'br-empty--compact')}>
      <span className="br-empty__icon">
        <Icon name={icon} size={compact ? 20 : 28} />
      </span>
      {title && <h2 className="title-lg">{title}</h2>}
      <p className="br-empty__body">{children}</p>
      {action && <div className="br-empty__action">{action}</div>}
    </div>
  );
}

export interface TabItem<V extends string> {
  value: V;
  label: string;
  /** Shown after the label (the number of bookmarks or notes); omitted when unknown. */
  count?: number;
  /** The id of the content the tab shows. */
  controls?: string;
}

/**
 * Tabs (phase 20), from the design's Tabs: the selected one is underlined in accent. The arrow
 * keys, Home and End move between tabs and choose them; only the selected tab is a Tab stop.
 */
export function Tabs<V extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: readonly TabItem<V>[];
  value: V;
  onChange(value: V): void;
  label: string;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const index = items.findIndex((item) => item.value === value);
    const last = items.length - 1;
    const next =
      event.key === 'ArrowRight'
        ? (index + 1) % items.length
        : event.key === 'ArrowLeft'
          ? (index - 1 + items.length) % items.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    const item = items[next];
    if (!item) return;
    onChange(item.value);
    const tabs =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    tabs?.[next]?.focus();
  }

  return (
    <div role="tablist" aria-label={label} className="br-tabs">
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={selected ? item.controls : undefined}
            tabIndex={selected ? 0 : -1}
            className={cx('br-tab', selected && 'is-selected')}
            onClick={() => onChange(item.value)}
            onKeyDown={onKeyDown}
          >
            {item.label}
            {item.count !== undefined && <span className="br-tab__count">{item.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** How far a sheet must be dragged down before letting go closes it. */
const SHEET_CLOSE_DRAG_PX = 80;

/**
 * The reader's panel (phase 20), from the design's SidePanel. `side` docks on the right beside the
 * page (720 px and wider); `sheet` rises from the bottom over a scrim (phones). A sheet closes with
 * its Close button, a tap on the scrim, or a drag down on its grabber or title (not on its lists,
 * which keep their own touch scrolling). Escape is the reader's (ReaderView).
 */
export function SidePanel({
  id,
  title,
  presentation,
  onClose,
  header,
  children,
}: {
  id?: string;
  title: string;
  presentation: 'side' | 'sheet';
  onClose(): void;
  /** Tabs or the search field, pinned under the title. */
  header?: ReactNode;
  children: ReactNode;
}) {
  const sheet = presentation === 'sheet';
  const panel = useRef<HTMLElement>(null);
  const drag = useRef<{ pointer: number; startY: number; by: number } | null>(null);

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (!sheet || event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest('button')) return;
    drag.current = { pointer: event.pointerId, startY: event.clientY, by: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId || !panel.current) return;
    current.by = Math.max(0, event.clientY - current.startY);
    // Straight to the element: a drag is not worth a React render per move.
    panel.current.style.transform = `translateY(${current.by}px)`;
  }

  function onPointerEnd(event: PointerEvent<HTMLElement>) {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    drag.current = null;
    if (panel.current) panel.current.style.transform = '';
    if (event.type === 'pointerup' && current.by >= SHEET_CLOSE_DRAG_PX) onClose();
  }

  // Opening (or switching tab), focus goes into the panel. Its content focuses its first entry
  // itself (effects run child first); a panel with nothing to focus gives it to the selected tab,
  // or the Close button, never leaving it on the page body (phase 20 review B2).
  useEffect(() => {
    const element = panel.current;
    if (!element || element.contains(document.activeElement)) return;
    const target =
      element.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]') ??
      element.querySelector<HTMLElement>('.br-panel__head button');
    target?.focus({ preventScroll: true });
  }, [title]);

  /** The Tab stops inside the panel, in order (unselected tabs are not stops). */
  function stops(): HTMLElement[] {
    return [
      ...(panel.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input, textarea, select, audio[controls], [tabindex]',
      ) ?? []),
    ].filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
  }

  // A sheet covers the reader: Tab and Shift+Tab wrap around inside it, so the keyboard never
  // reaches the controls under the scrim (review N1). Safari's own Tab skips buttons and so can
  // still step out from a field: focus that a Tab press takes out of the sheet comes back.
  const tabbing = useRef<'forward' | 'back' | null>(null);
  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!sheet || event.key !== 'Tab') return;
    tabbing.current = event.shiftKey ? 'back' : 'forward';
    setTimeout(() => (tabbing.current = null), 0);
    const all = stops();
    const first = all[0];
    const last = all.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function onBlur(event: FocusEvent<HTMLElement>) {
    const direction = tabbing.current;
    if (!sheet || !direction) return;
    const to = event.relatedTarget;
    if (to instanceof Node && panel.current?.contains(to)) return;
    setTimeout(() => {
      if (panel.current?.contains(document.activeElement)) return;
      const all = stops();
      (direction === 'forward' ? all[0] : all.at(-1))?.focus();
    }, 0);
  }

  const dragHandlers = sheet
    ? {
        onPointerDown,
        onPointerMove,
        onPointerUp: onPointerEnd,
        onPointerCancel: onPointerEnd,
      }
    : {};

  return (
    <>
      {sheet && <div className="br-scrim" aria-hidden="true" onClick={onClose} />}
      <aside
        ref={panel}
        id={id}
        className={cx('br-panel', `br-panel--${presentation}`)}
        aria-label={title}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      >
        {sheet && <span className="br-panel__grabber" aria-hidden="true" {...dragHandlers} />}
        <div className="br-panel__head" {...dragHandlers}>
          <h2 className="title-md">{title}</h2>
          <IconButton
            icon="close"
            label={`Close ${title}`}
            variant="filled"
            size="sm"
            onClick={onClose}
          />
        </div>
        {header && <div className="br-panel__sub">{header}</div>}
        <div className="br-panel__body">{children}</div>
      </aside>
    </>
  );
}
