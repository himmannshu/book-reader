// Pure layout math for the continuous-scroll viewer. No DOM access, so it is unit-testable.
// All sizes are CSS pixels except PageSize, which is in PDF points.

export interface PageSize {
  width: number;
  height: number;
}

export interface PageBox {
  top: number;
  width: number;
  height: number;
  /** CSS pixels per PDF point. */
  scale: number;
}

export interface Layout {
  pages: PageBox[];
  totalHeight: number;
}

export interface LayoutOptions {
  /** Vertical space between pages. */
  gap: number;
  /** Space above the first page, below the last, and on each side. */
  padding: number;
  maxPageWidth: number;
}

export interface PageRange {
  first: number;
  last: number;
}

/** Where the reader is inside the book, independent of zoom or window size. */
export interface Anchor {
  pageIndex: number;
  /** 0 at the top edge of the page, 1 at the bottom edge. */
  fraction: number;
  /**
   * CSS pixels above the page's top edge, for offsets in the padding or a gap before it.
   * Kept in pixels, not as a fraction, because padding and gaps don't scale with the page.
   */
  pixelsAbove: number;
}

/** Fit every page to the same width and stack them vertically. */
export function computeLayout(
  sizes: readonly PageSize[],
  containerWidth: number,
  { gap, padding, maxPageWidth }: LayoutOptions,
): Layout {
  if (sizes.length === 0) return { pages: [], totalHeight: 0 };
  const width = Math.max(1, Math.min(containerWidth - 2 * padding, maxPageWidth));
  let top = padding;
  const pages = sizes.map((size) => {
    const scale = width / size.width;
    const box = { top, width, height: size.height * scale, scale };
    top += box.height + gap;
    return box;
  });
  return { pages, totalHeight: top - gap + padding };
}

/** The page at `index`. Throws instead of returning undefined, so a bad index fails loudly. */
export function pageAt(layout: Pick<Layout, 'pages'>, index: number): PageBox {
  const page = layout.pages[index];
  if (!page) throw new RangeError(`No page at index ${index} (page count ${layout.pages.length})`);
  return page;
}

/** Index of the first page whose bottom edge is below y, or pages.length if none. */
function firstPageEndingAfter(layout: Layout, y: number): number {
  let lo = 0;
  let hi = layout.pages.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const page = pageAt(layout, mid);
    if (page.top + page.height > y) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

export interface RenderOptions {
  /** Extra pages to draw above and below the viewport, if memory allows. */
  overscan: number;
  /** Device pixels per CSS pixel to draw at (already capped by the caller). */
  pixelRatio: number;
  /** Budget for the total size of all page canvases (width × height × 4 bytes). */
  maxCanvasBytes: number;
}

export interface RenderPlan extends PageRange {
  /** The pages actually inside the viewport; draw these before the overscan pages. */
  visibleFirst: number;
  visibleLast: number;
  /** The pixel ratio to draw at. Lower than requested only if the visible pages alone exceed the budget. */
  pixelRatio: number;
}

/** Canvas bytes for one page drawn at `pixelRatio`. */
export function canvasBytes(box: PageBox, pixelRatio: number): number {
  return Math.floor(box.width * pixelRatio) * Math.floor(box.height * pixelRatio) * 4;
}

/**
 * Which pages to draw, and at what resolution. Every page overlapping the viewport is always
 * included. Overscan pages are added alternately below and above while the total canvas size
 * stays within budget. If the visible pages alone exceed the budget, they are drawn at a lower
 * pixel ratio instead of being left blank.
 */
export function planRender(
  layout: Layout,
  scrollTop: number,
  viewportHeight: number,
  { overscan, pixelRatio, maxCanvasBytes }: RenderOptions,
): RenderPlan | null {
  const { pages } = layout;
  if (pages.length === 0) return null;
  const lastIndex = pages.length - 1;
  const viewBottom = scrollTop + viewportHeight;

  const first = Math.min(firstPageEndingAfter(layout, scrollTop), lastIndex);
  let last = first;
  while (last < lastIndex && pageAt(layout, last + 1).top < viewBottom) last++;

  let used = 0;
  for (let i = first; i <= last; i++) used += canvasBytes(pageAt(layout, i), pixelRatio);
  if (used > maxCanvasBytes) {
    // Area scales with the square of the pixel ratio; round down so the result stays in budget.
    const reduced = Math.floor(pixelRatio * Math.sqrt(maxCanvasBytes / used) * 100) / 100;
    return {
      first,
      last,
      visibleFirst: first,
      visibleLast: last,
      pixelRatio: Math.max(reduced, 0.01),
    };
  }

  let lo = first;
  let hi = last;
  const fits = (index: number) => {
    const bytes = canvasBytes(pageAt(layout, index), pixelRatio);
    if (used + bytes > maxCanvasBytes) return false;
    used += bytes;
    return true;
  };
  for (let step = 0; step < overscan; step++) {
    const grewDown = hi < lastIndex && fits(hi + 1);
    if (grewDown) hi++;
    const grewUp = lo > 0 && fits(lo - 1);
    if (grewUp) lo--;
    if (!grewDown && !grewUp) break;
  }
  return { first: lo, last: hi, visibleFirst: first, visibleLast: last, pixelRatio };
}

/** The page covering the most of the viewport; ties go to the earlier page. Null if there are none. */
export function currentPageAt(
  layout: Layout,
  scrollTop: number,
  viewportHeight: number,
): number | null {
  const { pages } = layout;
  if (pages.length === 0) return null;
  const viewBottom = scrollTop + viewportHeight;
  let best = Math.min(firstPageEndingAfter(layout, scrollTop), pages.length - 1);
  let bestShown = -1;
  for (let i = best; i < pages.length; i++) {
    const page = pageAt(layout, i);
    if (page.top >= viewBottom && bestShown >= 0) break;
    const shown = Math.min(page.top + page.height, viewBottom) - Math.max(page.top, scrollTop);
    if (shown > bestShown) {
      best = i;
      bestShown = shown;
    }
  }
  return best;
}

/** The reading position at vertical offset y. Gaps belong to the page that follows them. */
export function anchorAt(layout: Layout, y: number): Anchor | null {
  const { pages } = layout;
  if (pages.length === 0) return null;
  const index = firstPageEndingAfter(layout, y);
  if (index >= pages.length) return { pageIndex: pages.length - 1, fraction: 1, pixelsAbove: 0 };
  const page = pageAt(layout, index);
  if (y < page.top) return { pageIndex: index, fraction: 0, pixelsAbove: page.top - y };
  return { pageIndex: index, fraction: (y - page.top) / page.height, pixelsAbove: 0 };
}

/** The scroll offset that puts `anchor` at the top of the viewport. */
export function scrollTopFor(layout: Layout, anchor: Anchor): number {
  const page = layout.pages[Math.min(anchor.pageIndex, layout.pages.length - 1)];
  if (!page) return 0;
  return page.top + anchor.fraction * page.height - anchor.pixelsAbove;
}
