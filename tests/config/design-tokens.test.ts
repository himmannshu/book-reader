// @vitest-environment node
// Phase 18: the app's stylesheet follows the Book Reader design system (tokens.json in
// harness/context/design-system, copied from the Claude Design artifact).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { THEME_COLORS } from '../../src/ui/theme';

interface Token {
  name: string;
  value: string | Record<string, string>;
}

const root = join(import.meta.dirname, '../..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const design = JSON.parse(read('harness/context/design-system/tokens.json')) as {
  color: { themes: { id: string }[]; tokens: Token[] };
  shadow: { tokens: Token[] };
  spacing: { tokens: Token[] };
  radius: { tokens: Token[] };
  size: { tokens: Token[] };
  type: { fonts: { file: string }[]; families: Record<string, string> };
};
const tokensCss = read('src/ui/tokens.css');
const appCss = read('src/ui/app.css');

/** Prettier rewrites quotes and wraps long values, so compare values in one form. */
const normal = (value: string) => value.replace(/"/g, "'").replace(/\s+/g, ' ').trim();

/** The custom properties declared in the block whose selector is exactly `selector`. */
function block(css: string, selector: string): Map<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return new Map();
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  const values = new Map<string, string>();
  for (const match of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    values.set(match[1] ?? '', normal(match[2] ?? ''));
  }
  return values;
}

const selectors: Record<string, string> = {
  light: ':root',
  sepia: ":root[data-theme='sepia']",
  dark: ":root[data-theme='dark']",
};

/** A token's value in a theme, with `{other}` aliases written as `var(--other)`. */
function expected(token: Token, theme: string, first: string): string {
  const value =
    typeof token.value === 'string' ? token.value : (token.value[theme] ?? token.value[first]);
  return normal((value ?? '').replace(/^\{([\w-]+)\}$/, 'var(--$1)'));
}

describe('design tokens', () => {
  const themes = design.color.themes.map((theme) => theme.id);
  const first = themes[0] ?? 'light';

  it.each(themes)('every colour and shadow in the %s theme matches tokens.json', (theme) => {
    const declared = block(tokensCss, selectors[theme] ?? '');
    for (const token of [...design.color.tokens, ...design.shadow.tokens]) {
      expect(declared.get(token.name), `${theme} ${token.name}`).toBe(
        expected(token, theme, first),
      );
    }
  });

  it('spacing, radius, size and font tokens are declared as designed', () => {
    const declared = block(tokensCss, ':root');
    for (const token of [
      ...design.spacing.tokens,
      ...design.radius.tokens,
      ...design.size.tokens,
    ]) {
      expect(declared.get(token.name), token.name).toBe(normal(String(token.value)));
    }
    for (const [name, stack] of Object.entries(design.type.families)) {
      expect(declared.get(`font-${name}`), name).toBe(normal(stack));
    }
  });

  it('the theme swatches show each theme’s own paper, as in the design’s Reading settings', () => {
    const declared = block(tokensCss, ':root');
    const token = (name: string) =>
      design.color.tokens.find((candidate) => candidate.name === name) ?? { name, value: '' };
    // The design's ReadingSettings source: Light and Dark take surface-raised, Sepia surface.
    const swatches = { light: 'surface-raised', sepia: 'surface', dark: 'surface-raised' };
    for (const [theme, name] of Object.entries(swatches)) {
      expect(declared.get(`theme-swatch-${theme}`), theme).toBe(
        expected(token(name), theme, first),
      );
    }
    expect(declared.get('theme-swatch-light')).toBe('#fffdf9');
    expect(declared.get('theme-swatch-sepia')).toBe('#f3ead6');
    expect(declared.get('theme-swatch-dark')).toBe('#24211d');
  });

  it('the fonts are the app’s own files', () => {
    for (const font of design.type.fonts) {
      const file = font.file.replace(/^fonts\//, '');
      expect(tokensCss).toContain(`url('/fonts/${file}')`);
      expect(() => read(`public/fonts/${file}`)).not.toThrow();
    }
  });

  it('the rest of the stylesheet sets no colour of its own', () => {
    // Comments may name colours; declarations may not.
    const code = appCss.replace(/\/\*[\s\S]*?\*\//g, '');
    const literals = code.match(
      /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch)\(|:\s*(?:white|black)\b/gi,
    );
    expect(literals ?? []).toEqual([]);
  });

  it('the status bar takes each theme’s surface colour, before and after the app loads', () => {
    const surface = design.color.tokens.find((token) => token.name === 'surface');
    const html = read('index.html');
    for (const theme of themes) {
      const colour = expected(surface ?? { name: 'surface', value: '' }, theme, first);
      expect(THEME_COLORS[theme as keyof typeof THEME_COLORS], theme).toBe(colour);
      expect(html, `index.html ${theme}`).toContain(
        theme === first ? `name="theme-color" content="${colour}"` : `${theme}: '${colour}'`,
      );
    }
  });
});
