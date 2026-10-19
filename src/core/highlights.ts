// The highlight model. Pure logic, no storage or DOM access (see phase-06 context file).
// Rectangles are in PDF points in the page's displayed orientation, origin at the top-left corner:
// the same space as the engine's PageSize. Screen pixels are never stored.

/** A box on one page, in PDF points. */
export interface HighlightRect {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Highlight {
  /** Random; a page can hold many highlights. */
  id: string;
  /** The book's id (SHA-256 of its file). */
  bookId: string;
  /** The first page the highlight touches (0-based). */
  pageIndex: number;
  /** One box per line, on every page the highlight touches, in reading order. */
  rects: HighlightRect[];
  /** The highlighted text, whitespace collapsed. */
  quote: string;
  /** Milliseconds since the epoch. */
  createdAt: number;
}

/** A rectangle on screen, in CSS pixels (as from getBoundingClientRect). */
export interface ScreenRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Where a page is drawn on screen, and at how many CSS pixels per PDF point. */
export interface PageOnScreen extends ScreenRect {
  pageIndex: number;
  scale: number;
}

/** Boxes smaller than this (CSS px) are artefacts such as line breaks, not text. */
const MIN_PX = 1;

const round = (value: number) => Math.round(value * 100) / 100;

function overlap(a0: number, a1: number, b0: number, b1: number): number {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

/** The page a screen box belongs to: the one holding its centre, else the one it overlaps most. */
function pageFor(rect: ScreenRect, pages: readonly PageOnScreen[]): PageOnScreen | undefined {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const holding = pages.find(
    (p) => cx >= p.left && cx <= p.left + p.width && cy >= p.top && cy <= p.top + p.height,
  );
  if (holding) return holding;
  let best: PageOnScreen | undefined;
  let bestArea = 0;
  for (const p of pages) {
    const area =
      overlap(rect.left, rect.left + rect.width, p.left, p.left + p.width) *
      overlap(rect.top, rect.top + rect.height, p.top, p.top + p.height);
    if (area > bestArea) {
      best = p;
      bestArea = area;
    }
  }
  return best;
}

/** Same page, overlapping vertically by at least half the shorter box, and at most a line apart. */
function sameLine(a: HighlightRect, b: HighlightRect): boolean {
  if (a.pageIndex !== b.pageIndex) return false;
  const vertical = overlap(a.y, a.y + a.height, b.y, b.y + b.height);
  if (vertical < Math.min(a.height, b.height) / 2) return false;
  const gap = Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width);
  return gap <= Math.max(a.height, b.height);
}

function union(a: HighlightRect, b: HighlightRect): HighlightRect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    pageIndex: a.pageIndex,
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
}

const byPosition = (a: HighlightRect, b: HighlightRect) =>
  a.pageIndex - b.pageIndex || a.y - b.y || a.x - b.x;

/**
 * Turns the screen boxes of a text selection into page boxes in PDF points: each box is assigned to
 * its page, clipped to it and converted with the page's scale, then pieces of one line are merged.
 * Result is in reading order (page, top, left).
 */
export function toPageRects(
  rects: readonly ScreenRect[],
  pages: readonly PageOnScreen[],
): HighlightRect[] {
  const converted: HighlightRect[] = [];
  for (const rect of rects) {
    if (rect.width < MIN_PX || rect.height < MIN_PX) continue;
    const page = pageFor(rect, pages);
    if (!page) continue;
    const left = Math.max(rect.left, page.left);
    const top = Math.max(rect.top, page.top);
    const right = Math.min(rect.left + rect.width, page.left + page.width);
    const bottom = Math.min(rect.top + rect.height, page.top + page.height);
    if (right - left < MIN_PX || bottom - top < MIN_PX) continue;
    converted.push({
      pageIndex: page.pageIndex,
      x: (left - page.left) / page.scale,
      y: (top - page.top) / page.scale,
      width: (right - left) / page.scale,
      height: (bottom - top) / page.scale,
    });
  }

  const lines: HighlightRect[] = [];
  for (const rect of converted.sort(byPosition)) {
    const index = lines.findIndex((line) => sameLine(line, rect));
    const line = lines[index];
    if (line) lines[index] = union(line, rect);
    else lines.push(rect);
  }
  return lines.sort(byPosition).map((r) => ({
    pageIndex: r.pageIndex,
    x: round(r.x),
    y: round(r.y),
    width: round(r.width),
    height: round(r.height),
  }));
}

/** A selected piece of page text and where it sits on screen. */
export interface TextPiece {
  text: string;
  pageIndex: number;
  top: number;
  height: number;
}

/**
 * The selected text, in order. The text layer has no whitespace between lines or pages, so a
 * space goes wherever the next piece starts on another page or lower than the previous one's middle.
 * Pieces of one line join as they are, since PDF text can split a word across pieces.
 */
export function joinTextPieces(pieces: readonly TextPiece[]): string {
  let text = '';
  pieces.forEach((piece, i) => {
    const before = pieces[i - 1];
    const newLine =
      before !== undefined &&
      (piece.pageIndex !== before.pageIndex || piece.top > before.top + before.height / 2);
    text += (newLine ? ' ' : '') + piece.text;
  });
  return text;
}

/** The quote as stored: runs of whitespace (including line and page breaks) become one space. */
export function normalizeQuote(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** In reading order: first page, then top, then left. Returns a new array. */
export function sortByPosition<T extends Pick<Highlight, 'pageIndex' | 'rects'>>(
  highlights: readonly T[],
): T[] {
  const first = (h: T) => h.rects[0] ?? { pageIndex: h.pageIndex, x: 0, y: 0 };
  return [...highlights].sort(
    (a, b) => a.pageIndex - b.pageIndex || first(a).y - first(b).y || first(a).x - first(b).x,
  );
}

/** The newest highlight with a box under the point (PDF points on page `pageIndex`). */
export function highlightAt(
  highlights: readonly Highlight[],
  pageIndex: number,
  x: number,
  y: number,
): Highlight | undefined {
  let found: Highlight | undefined;
  for (const highlight of highlights) {
    const hit = highlight.rects.some(
      (r) =>
        r.pageIndex === pageIndex &&
        x >= r.x &&
        x <= r.x + r.width &&
        y >= r.y &&
        y <= r.y + r.height,
    );
    if (hit && (!found || highlight.createdAt > found.createdAt)) found = highlight;
  }
  return found;
}
