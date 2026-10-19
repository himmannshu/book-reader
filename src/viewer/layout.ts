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

/**
 * Pages that overlap the viewport, widened by `overscan` pages on each side, never more than
 * `maxPages` in total. When the cap bites, visible pages are kept and overscan is trimmed.
 */
export function visibleRange(
  layout: Layout,
  scrollTop: number,
  viewportHeight: number,
  overscan: number,
  maxPages: number,
): PageRange | null {
  const { pages } = layout;
  if (pages.length === 0) return null;
  const lastIndex = pages.length - 1;
  const viewBottom = scrollTop + viewportHeight;

  const first = Math.min(firstPageEndingAfter(layout, scrollTop), lastIndex);
  let last = first;
  while (last < lastIndex && pageAt(layout, last + 1).top < viewBottom) last++;

  if (last - first + 1 >= maxPages) return { first, last: first + maxPages - 1 };

  // Grow alternately below and above so both directions get overscan.
  let lo = first;
  let hi = last;
  let budget = maxPages - (last - first + 1);
  for (let step = 0; step < overscan && budget > 0; step++) {
    if (hi < lastIndex && budget > 0) {
      hi++;
      budget--;
    }
    if (lo > 0 && budget > 0) {
      lo--;
      budget--;
    }
  }
  return { first: lo, last: hi };
}

/** The reading position at vertical offset y. Gaps belong to the page that follows them. */
export function anchorAt(layout: Layout, y: number): Anchor | null {
  const { pages } = layout;
  if (pages.length === 0) return null;
  const index = firstPageEndingAfter(layout, y);
  if (index >= pages.length) return { pageIndex: pages.length - 1, fraction: 1 };
  const page = pageAt(layout, index);
  if (y < page.top) return { pageIndex: index, fraction: 0 };
  return { pageIndex: index, fraction: (y - page.top) / page.height };
}

/** The scroll offset that puts `anchor` at the top of the viewport. */
export function scrollTopFor(layout: Layout, anchor: Anchor): number {
  const page = layout.pages[Math.min(anchor.pageIndex, layout.pages.length - 1)];
  if (!page) return 0;
  return page.top + anchor.fraction * page.height;
}
