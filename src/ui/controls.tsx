// Shared controls (phase 14), restyled and extended from the Book Reader design system in phase 18
// (harness/context/design-system/components/). Class names follow the design's `br-` prefix.
import {
  useSyncExternalStore,
  type ButtonHTMLAttributes,
  type ComponentProps,
  type ReactNode,
  type Ref,
} from 'react';
import { THEMES, validTheme, type Theme } from '../core/reading-state';
import { Icon, type IconName } from './icons';
import { THEME_LABELS } from './theme';

/** Below this width the reader shows icons only, and theme and zoom move into a Display menu. */
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

/**
 * A toolbar button with an icon and a label. The label is hidden on narrow screens (CSS), but
 * stays the button's accessible name.
 */
export function ToolButton({
  icon,
  label,
  filled = false,
  ref,
  className = '',
  title,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName;
  label: string;
  filled?: boolean;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    // The label is a tooltip too, for when only the icon shows (phase 14 review).
    <button
      ref={ref}
      type="button"
      className={`tool-button ${className}`}
      title={title ?? label}
      {...props}
    >
      <Icon name={icon} filled={filled} />
      <span className="tool-label">{label}</span>
    </button>
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
