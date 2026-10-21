// Shared controls (phase 14), restyled and extended from the Book Reader design system in phase 18
// (harness/context/design-system/components/). Class names follow the design's `br-` prefix.
import {
  useSyncExternalStore,
  type KeyboardEvent,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { THEMES, validTheme, type Theme } from '../core/reading-state';
import { Icon, type IconName } from './icons';
import { THEME_LABELS } from './theme';

/** Below this width the reader's toolbar is compact (panels under More, phase 19) and Reading
 * settings is a bottom sheet. */
export const NARROW_QUERY = '(max-width: 699px)';

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

const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ');

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
