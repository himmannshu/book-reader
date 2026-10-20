// Applies a theme to the document: the CSS variables in app.css key off `data-theme`, and the
// installed app's status bar follows `theme-color` (phase 10). index.html does the same at startup.
import type { Theme } from '../core/reading-state';

export const THEME_COLORS: Record<Theme, string> = {
  light: '#3d5a80',
  sepia: '#7a4f24',
  dark: '#1d1d1f',
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
