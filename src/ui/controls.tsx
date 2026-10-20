// Small shared controls for the toolbars (phase 14).
import { useSyncExternalStore, type ButtonHTMLAttributes, type Ref } from 'react';
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
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName;
  label: string;
  filled?: boolean;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <button ref={ref} type="button" className={`tool-button ${className}`} {...props}>
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
