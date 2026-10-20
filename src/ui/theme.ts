// Applies a theme to the document: the CSS variables in tokens.css key off `data-theme`, and the
// installed app's status bar follows `theme-color` (phase 10). index.html does the same at startup.
import type { Theme } from '../core/reading-state';

/**
 * The status bar takes each theme's `surface` colour from the design (phase 18), so it blends with
 * the toolbar. Keep in step with the boot script in index.html (tests/config/design-tokens.test.ts).
 */
export const THEME_COLORS: Record<Theme, string> = {
  light: '#faf7f2',
  sepia: '#f3ead6',
  dark: '#1a1815',
};

export const THEME_LABELS: Record<Theme, string> = {
  light: 'Light',
  sepia: 'Sepia',
  dark: 'Dark',
};

export function applyTheme(theme: Theme, root: Document = document): void {
  root.documentElement.dataset.theme = theme;
  root
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLORS[theme]);
}
