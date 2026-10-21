// Where a book was left, and how it was zoomed (phase 10). Pure logic, no storage or DOM access.
// Kept per device, never synced (see the phase-10 context file).

export type Theme = 'light' | 'sepia' | 'dark';
export const THEMES: readonly Theme[] = ['light', 'sepia', 'dark'];

export function validTheme(value: unknown): value is Theme {
  return THEMES.includes(value as Theme);
}

/** Fit the reading column's width, fit the whole page in the window, or a percentage of actual size. */
export type ZoomSetting = 'fit-width' | 'fit-page' | number;

/** The design's zoom steps (Reading settings, phase 19). A saved zoom between them still opens. */
export const ZOOM_LEVELS = [
  25, 50, 67, 75, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400,
] as const;
export const MIN_ZOOM = ZOOM_LEVELS[0];
export const MAX_ZOOM = ZOOM_LEVELS[ZOOM_LEVELS.length - 1] ?? 400;

/** CSS pixels per PDF point at 100%: a point is 1/72 inch and a CSS pixel 1/96 inch. */
const ACTUAL_SIZE_SCALE = 96 / 72;
/**
 * Stepping skips a level within this share of the zoom shown: from fit page at 66.4%, Zoom in
 * goes to 75%, not to a 67% that looks like nothing happened (phase 19 review).
 */
const STEP_TOLERANCE = 0.02;

export function scaleForPercent(percent: number): number {
  return (percent / 100) * ACTUAL_SIZE_SCALE;
}

/** The zoom percentage shown at `scale` CSS pixels per point. */
export function zoomPercent(scale: number): number {
  return (scale / ACTUAL_SIZE_SCALE) * 100;
}

/** The next level above the zoom now shown, or null at the largest. */
export function zoomIn(currentPercent: number): number | null {
  return ZOOM_LEVELS.find((level) => level > currentPercent * (1 + STEP_TOLERANCE)) ?? null;
}

/** The next level below the zoom now shown, or null at the smallest. */
export function zoomOut(currentPercent: number): number | null {
  return ZOOM_LEVELS.findLast((level) => level < currentPercent * (1 - STEP_TOLERANCE)) ?? null;
}

/** The level closest to a zoom reached by pinching (closest by ratio, so 118% → 125%). */
export function nearestZoomLevel(percent: number): number {
  let best: number = MIN_ZOOM;
  for (const level of ZOOM_LEVELS) {
    if (Math.abs(Math.log(level / percent)) < Math.abs(Math.log(best / percent))) best = level;
  }
  return best;
}

/** How pages are sized (Reading settings' Fit): to the column, to the window, or a percentage. */
export type FitMode = 'width' | 'page' | 'custom';

export function fitModeOf(zoom: ZoomSetting): FitMode {
  return zoom === 'fit-width' ? 'width' : zoom === 'fit-page' ? 'page' : 'custom';
}

/** The zoom a Fit choice means. Custom keeps the percentage now shown, as a whole percent. */
export function zoomForFit(fit: FitMode, shownPercent: number): ZoomSetting {
  if (fit === 'width') return 'fit-width';
  if (fit === 'page') return 'fit-page';
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(shownPercent)));
}

export function validZoom(value: unknown): value is ZoomSetting {
  if (value === 'fit-width' || value === 'fit-page') return true;
  return (
    typeof value === 'number' && Number.isFinite(value) && value >= MIN_ZOOM && value <= MAX_ZOOM
  );
}

/** The place at the top of the window (same shape as the viewer's layout anchor). */
export interface ReadingPosition {
  /** 0-based page. */
  pageIndex: number;
  /** 0 at the top edge of the page, 1 at the bottom edge. */
  fraction: number;
  /** CSS pixels above the page's top edge (in the margin or the gap before it). */
  pixelsAbove: number;
}

export interface ReadingState {
  bookId: string;
  position: ReadingPosition;
  zoom: ZoomSetting;
  /** Milliseconds since the epoch. */
  savedAt: number;
  /** The book's page count, for the library's progress (phase 11; absent in older states). */
  pageCount?: number;
  /**
   * The horizontal middle of the view, as a share of the content width (phase 14), so a book read
   * zoomed in reopens at the same side of the page. Absent: centred.
   */
  centreX?: number;
}

const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** True for a well-formed saved state; storage may hold damaged or older records. */
export function validReadingState(value: unknown): value is ReadingState {
  if (typeof value !== 'object' || value === null) return false;
  const state = value as Record<string, unknown>;
  const position = state.position as Record<string, unknown> | null | undefined;
  if (typeof state.bookId !== 'string' || !finite(state.savedAt) || !validZoom(state.zoom)) {
    return false;
  }
  const { pageCount, centreX } = state;
  if (centreX !== undefined && !(finite(centreX) && centreX >= 0 && centreX <= 1)) return false;
  if (pageCount !== undefined && !(Number.isInteger(pageCount) && (pageCount as number) >= 1)) {
    return false;
  }
  if (typeof position !== 'object' || position === null) return false;
  const { pageIndex, fraction, pixelsAbove } = position;
  return (
    finite(pageIndex) &&
    Number.isInteger(pageIndex) &&
    pageIndex >= 0 &&
    finite(fraction) &&
    fraction >= 0 &&
    fraction <= 1 &&
    finite(pixelsAbove) &&
    pixelsAbove >= 0
  );
}
