// Generates the app icons in public/icons/. Run with `npm run icons`.
// Deterministic (no randomness), so regenerating produces no diff.
// The design: an open book (two cream pages, text lines, a ribbon) on the app's accent blue.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePng } from './png.mjs';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

// Colours from src/ui/app.css.
const ACCENT = [0x3d, 0x5a, 0x80];
const PAGE = [0xff, 0xfd, 0xf8];
const LINE = [0xc9, 0xc1, 0xb0];
const RIBBON = [0xc0, 0x58, 0x3f];

/** True if (x, y) is inside the convex polygon (points in order). */
function inside(points, x, y) {
  let sign = 0;
  for (let i = 0; i < points.length; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[(i + 1) % points.length];
    const cross = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    if (cross !== 0) {
      if (sign === 0) sign = Math.sign(cross);
      else if (Math.sign(cross) !== sign) return false;
    }
  }
  return true;
}

// The book in unit coordinates (0..1), centred.
const LEFT_PAGE = [
  [0.17, 0.3],
  [0.485, 0.35],
  [0.485, 0.76],
  [0.17, 0.71],
];
const RIGHT_PAGE = LEFT_PAGE.map(([x, y]) => [1 - x, y]).reverse();
const RIBBON_SHAPE = [
  [0.6, 0.315],
  [0.66, 0.325],
  [0.66, 0.5],
  [0.63, 0.47],
  [0.6, 0.495],
];

/** The colour of the book drawing at (x, y), or null for background. */
function bookColour(x, y) {
  if (inside(RIBBON_SHAPE, x, y)) return RIBBON;
  for (const [page, left] of [
    [LEFT_PAGE, true],
    [RIGHT_PAGE, false],
  ]) {
    if (!inside(page, x, y)) continue;
    // Text lines follow the page's slant: the page top rises toward the outer edge.
    const t = left ? (x - 0.17) / 0.315 : (0.83 - x) / 0.315;
    const top = 0.3 + 0.05 * t;
    const v = (y - top) / 0.41;
    const inMargin = t > 0.12 && t < 0.88;
    const onLine = v > 0.15 && v < 0.86 && (v * 9) % 1 < 0.28;
    return inMargin && onLine ? LINE : PAGE;
  }
  return null;
}

/**
 * Renders a size × size icon. `content` scales the book (1 = full, smaller leaves a margin for
 * maskable icons); `radius` rounds the corners with transparency (0 = square, fully opaque).
 */
function renderIcon(size, { content = 1, radius = 0 } = {}) {
  const pixels = Buffer.alloc(size * size * 4);
  const samples = 4;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let alpha = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const x = (px + (sx + 0.5) / samples) / size;
          const y = (py + (sy + 0.5) / samples) / size;
          // Rounded-corner mask.
          const cx = Math.min(x, 1 - x);
          const cy = Math.min(y, 1 - y);
          if (radius > 0 && cx < radius && cy < radius) {
            const dx = radius - cx;
            const dy = radius - cy;
            if (dx * dx + dy * dy > radius * radius) continue;
          }
          const colour = bookColour(0.5 + (x - 0.5) / content, 0.5 + (y - 0.5) / content) ?? ACCENT;
          r += colour[0];
          g += colour[1];
          b += colour[2];
          alpha += 1;
        }
      }
      const offset = (py * size + px) * 4;
      if (alpha > 0) {
        pixels[offset] = Math.round(r / alpha);
        pixels[offset + 1] = Math.round(g / alpha);
        pixels[offset + 2] = Math.round(b / alpha);
      }
      pixels[offset + 3] = Math.round((alpha / (samples * samples)) * 255);
    }
  }
  return encodePng(size, size, 4, pixels);
}

mkdirSync(outDir, { recursive: true });
const icons = {
  'icon-192.png': renderIcon(192, { radius: 0.2 }),
  'icon-512.png': renderIcon(512, { radius: 0.2 }),
  // Maskable: full-bleed background, book inside the central safe zone (80%).
  'icon-maskable-512.png': renderIcon(512, { content: 0.78 }),
  // iOS rounds the corners itself and wants an opaque square.
  'apple-touch-icon-180.png': renderIcon(180),
  'favicon-32.png': renderIcon(32, { radius: 0.2 }),
};
for (const [name, bytes] of Object.entries(icons)) writeFileSync(join(outDir, name), bytes);
console.log(`Wrote ${Object.keys(icons).length} icons to ${outDir}`);
