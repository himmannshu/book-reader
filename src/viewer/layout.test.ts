import { describe, expect, it } from 'vitest';
import {
  anchorAt,
  computeLayout,
  currentPageAt,
  pageAt,
  planRender,
  scrollTopFor,
  type LayoutOptions,
  type ViewOptions,
} from './layout';

const LETTER = { width: 612, height: 792 };
const opts: LayoutOptions = { gap: 10, padding: 20, maxPageWidth: 900 };

describe('computeLayout', () => {
  it('fits every page to the same width, capped at maxPageWidth', () => {
    const layout = computeLayout([LETTER, { width: 792, height: 612 }], 2000, opts);
    expect(layout.pages.map((p) => p.width)).toEqual([900, 900]);
    expect(layout.pages[0]?.scale).toBeCloseTo(900 / 612);
    expect(layout.pages[1]?.height).toBeCloseTo(612 * (900 / 792));
  });

  it('uses the container width minus padding when that is narrower', () => {
    const layout = computeLayout([LETTER], 400, opts);
    expect(layout.pages[0]?.width).toBe(360);
  });

  it('stacks pages with padding at the ends and gaps between', () => {
    const layout = computeLayout([LETTER, LETTER, LETTER], 2000, opts);
    const h = 792 * (900 / 612);
    expect(layout.pages.map((p) => p.top)).toEqual([20, 20 + h + 10, 20 + 2 * (h + 10)]);
    expect(layout.totalHeight).toBeCloseTo(20 + 3 * h + 2 * 10 + 20);
  });

  it('returns an empty layout for no pages', () => {
    expect(computeLayout([], 1000, opts)).toEqual({ pages: [], totalHeight: 0, width: 0 });
  });

  it('centres pages in a content box as wide as the container', () => {
    const layout = computeLayout([LETTER], 1000, opts);
    expect(layout.width).toBe(1000);
    expect(layout.pages[0]?.left).toBe(50);
  });
});

describe('computeLayout zoom modes', () => {
  const view = (options: ViewOptions) => options;
  const LANDSCAPE = { width: 792, height: 612 };

  it('fit width is the default and keeps the capped reading column', () => {
    const fit = computeLayout(
      [LETTER],
      2000,
      opts,
      view({ zoom: 'fit-width', viewportHeight: 700 }),
    );
    expect(fit).toEqual(computeLayout([LETTER], 2000, opts));
    expect(fit.pages[0]?.width).toBe(900);
  });

  it('fit page fits each whole page inside the window', () => {
    // 1000 × 700 window: 660 px of height for a letter page → 510 px wide.
    const layout = computeLayout(
      [LETTER, LANDSCAPE],
      1000,
      opts,
      view({ zoom: 'fit-page', viewportHeight: 700 }),
    );
    const [portrait, wide] = layout.pages;
    expect(portrait?.height).toBeCloseTo(660);
    expect(portrait?.width).toBeCloseTo(660 * (612 / 792));
    // A landscape page is limited by the width first (the 900 px column).
    expect(wide?.width).toBeCloseTo(Math.min(900, 660 * (792 / 612)));
    expect(wide?.height).toBeLessThanOrEqual(660 + 1e-9);
    // Narrower pages are centred.
    expect(portrait?.left).toBeCloseTo((1000 - (portrait?.width ?? 0)) / 2);
  });

  it('fit page is never wider than fit width', () => {
    const layout = computeLayout(
      [LETTER],
      400,
      opts,
      view({ zoom: 'fit-page', viewportHeight: 5000 }),
    );
    expect(layout.pages[0]?.width).toBe(360);
  });

  it('a percentage draws pages at that share of actual size, keeping their own widths', () => {
    const layout = computeLayout(
      [LETTER, LANDSCAPE],
      1000,
      opts,
      view({ zoom: 150, viewportHeight: 700 }),
    );
    expect(layout.pages[0]?.scale).toBeCloseTo(1.5 * (96 / 72));
    expect(layout.pages[0]?.width).toBeCloseTo(612 * 2);
    expect(layout.pages[1]?.width).toBeCloseTo(792 * 2);
  });

  it('widens the content beyond the container when a page is wider, so its left edge can be reached', () => {
    // 200% of a landscape page is 2112 px wide; with 20 px margins the content is 2152 px.
    const layout = computeLayout(
      [LETTER, LANDSCAPE],
      1000,
      opts,
      view({ zoom: 200, viewportHeight: 700 }),
    );
    expect(layout.width).toBeCloseTo(792 * (8 / 3) + 40);
    expect(layout.pages[1]?.left).toBeCloseTo(20);
    expect(layout.pages[0]?.left).toBeCloseTo((layout.width - 612 * (8 / 3)) / 2);
    for (const page of layout.pages) expect(page.left).toBeGreaterThanOrEqual(20 - 1e-9);
  });
});

describe('planRender', () => {
  // Pages are 100px tall at width 100 (square pages), 10px gaps, 20px padding.
  // At pixel ratio 1 each page's canvas is 100 × 100 × 4 = 40,000 bytes.
  const square = Array.from({ length: 50 }, () => ({ width: 100, height: 100 }));
  const layout = computeLayout(square, 140, { gap: 10, padding: 20, maxPageWidth: 100 });
  const PAGE_BYTES = 40_000;
  const plan = (scrollTop: number, viewport: number, overscan = 0, maxCanvasBytes = 1e12) =>
    planRender(layout, scrollTop, viewport, { overscan, pixelRatio: 1, maxCanvasBytes });
  const range = (...args: Parameters<typeof plan>) => {
    const p = plan(...args);
    return p && { first: p.first, last: p.last };
  };

  it('returns null for an empty layout', () => {
    const empty = { pages: [], totalHeight: 0, width: 0 };
    expect(
      planRender(empty, 0, 500, { overscan: 1, pixelRatio: 1, maxCanvasBytes: 1e9 }),
    ).toBeNull();
  });

  it('starts at the first page at the top', () => {
    expect(range(0, 150)).toEqual({ first: 0, last: 1 });
  });

  it('finds the pages overlapping the viewport in the middle', () => {
    // Page i spans [20 + 110i, 120 + 110i]. Viewport [555, 705] overlaps pages 4 (460-560), 5, 6 (680-780).
    expect(range(555, 150)).toEqual({ first: 4, last: 6 });
  });

  it('treats the gap between pages as belonging to no page', () => {
    // [565, 675] lies entirely inside page 5 (570-670) plus gaps.
    expect(range(565, 110)).toEqual({ first: 5, last: 5 });
  });

  it('ends at the last page at the bottom', () => {
    expect(range(layout.totalHeight - 150, 150)).toEqual({ first: 48, last: 49 });
  });

  it('adds overscan pages on both sides, clamped to the book', () => {
    expect(range(555, 150, 2)).toEqual({ first: 2, last: 8 });
    expect(range(0, 150, 3)).toEqual({ first: 0, last: 4 });
    expect(range(layout.totalHeight - 150, 150, 3)).toEqual({ first: 45, last: 49 });
  });

  it('reports which pages are visible, separately from overscan', () => {
    const p = plan(555, 150, 2);
    expect(p).toMatchObject({ first: 2, last: 8, visibleFirst: 4, visibleLast: 6 });
  });

  it('adds overscan only while the canvas memory budget allows it', () => {
    // 3 visible pages (120 KB) + room for 2 more under a 200 KB budget.
    const p = plan(555, 150, 10, 5 * PAGE_BYTES);
    if (!p) throw new Error('expected a plan');
    expect(p.last - p.first + 1).toBe(5);
    expect(p.first).toBeLessThanOrEqual(4);
    expect(p.last).toBeGreaterThanOrEqual(6);
    expect(p.pixelRatio).toBe(1);
  });

  it('always includes every visible page, lowering resolution when they exceed the budget', () => {
    // 3 visible pages need 120 KB at full resolution; the budget is 60 KB.
    const p = plan(555, 150, 2, 60_000);
    if (!p) throw new Error('expected a plan');
    expect({ first: p.first, last: p.last }).toEqual({ first: 4, last: 6 });
    expect(p.pixelRatio).toBeLessThan(1);
    expect(3 * PAGE_BYTES * p.pixelRatio ** 2).toBeLessThanOrEqual(60_000);
  });

  it('draws more than 8 pages when they are all visible and fit the budget', () => {
    // A 1000px viewport shows 9 square pages.
    const p = plan(0, 1000, 0, 100 * PAGE_BYTES);
    expect(p && p.last - p.first + 1).toBe(9);
  });

  it('keeps every canvas under the per-canvas pixel cap', () => {
    // A 100 × 100 page at ratio 2 is 40,000 px; a 10,000 px cap allows ratio 1.
    const p = planRender(layout, 555, 150, {
      overscan: 1,
      pixelRatio: 2,
      maxCanvasBytes: 1e12,
      maxCanvasPixels: 10_000,
    });
    if (!p) throw new Error('expected a plan');
    expect(p.pixelRatio).toBeLessThanOrEqual(1);
    expect(100 * p.pixelRatio * (100 * p.pixelRatio)).toBeLessThanOrEqual(10_000);
  });

  it('keeps the same lowered resolution while scrolling over budget (phase 02 F1)', () => {
    // A 150 px viewport shows 2 or 3 of these pages depending on where it is.
    const ratios = new Set<number>();
    for (let top = 400; top < 900; top += 7) {
      const p = plan(top, 150, 2, 60_000);
      if (!p) throw new Error('expected a plan');
      ratios.add(p.pixelRatio);
      const visible = p.visibleLast - p.visibleFirst + 1;
      expect(visible * PAGE_BYTES * p.pixelRatio ** 2).toBeLessThanOrEqual(60_000);
    }
    expect([...ratios]).toHaveLength(1);
  });

  it('handles a single page book', () => {
    const one = computeLayout([LETTER], 1000, opts);
    const p = planRender(one, 0, 500, { overscan: 2, pixelRatio: 2, maxCanvasBytes: 1e9 });
    expect(p).toEqual({ first: 0, last: 0, visibleFirst: 0, visibleLast: 0, pixelRatio: 2 });
  });
});

describe('anchorAt / scrollTopFor', () => {
  it('keeps the same spot on the same page after the layout changes', () => {
    const before = computeLayout([LETTER, LETTER, LETTER], 2000, opts);
    const second = pageAt(before, 1);
    const anchor = anchorAt(before, second.top + second.height / 4);
    expect(anchor?.pageIndex).toBe(1);
    expect(anchor?.fraction).toBeCloseTo(0.25);

    const after = computeLayout([LETTER, LETTER, LETTER], 500, opts);
    const afterSecond = pageAt(after, 1);
    if (!anchor) throw new Error('expected an anchor');
    expect(scrollTopFor(after, anchor)).toBeCloseTo(afterSecond.top + afterSecond.height / 4);
  });

  it('anchors an offset in a gap to the next page, a fixed distance above its top edge', () => {
    const layout = computeLayout([LETTER, LETTER], 2000, opts);
    const gapY = pageAt(layout, 0).top + pageAt(layout, 0).height + 5;
    // The gap is 10px, so 5px into it is 5px above page 2.
    expect(anchorAt(layout, gapY)).toEqual({ pageIndex: 1, fraction: 0, pixelsAbove: 5 });
  });

  it('round-trips any offset in the same layout, including the padding above page 1', () => {
    const layout = computeLayout([LETTER, LETTER, LETTER], 2000, opts);
    const first = pageAt(layout, 0);
    const gapY = first.top + first.height + 5;
    for (const y of [0, 10, first.top, first.top + 100, gapY]) {
      const anchor = anchorAt(layout, y);
      if (!anchor) throw new Error('expected an anchor');
      expect(scrollTopFor(layout, anchor)).toBeCloseTo(y);
    }
  });

  it('keeps the top of the book at the top after the layout changes', () => {
    const before = computeLayout([LETTER, LETTER], 2000, opts);
    const after = computeLayout([LETTER, LETTER], 500, opts);
    const anchor = anchorAt(before, 0);
    if (!anchor) throw new Error('expected an anchor');
    expect(scrollTopFor(after, anchor)).toBeCloseTo(0);
  });

  it('returns null for an empty layout', () => {
    expect(anchorAt({ pages: [], totalHeight: 0, width: 0 }, 0)).toBeNull();
  });
});

describe('currentPageAt', () => {
  // Square pages 100px tall, 10px gaps, 20px padding: page i spans [20 + 110i, 120 + 110i].
  const square = Array.from({ length: 5 }, () => ({ width: 100, height: 100 }));
  const layout = computeLayout(square, 140, { gap: 10, padding: 20, maxPageWidth: 100 });

  it('is the first page at the top of the book', () => {
    expect(currentPageAt(layout, 0, 150)).toBe(0);
  });

  it('is the page covering most of the viewport', () => {
    // Viewport [100, 200]: page 0 shows 20px, page 1 shows 70px.
    expect(currentPageAt(layout, 100, 100)).toBe(1);
    // Viewport [60, 160]: page 0 shows 60px, page 1 shows 30px.
    expect(currentPageAt(layout, 60, 100)).toBe(0);
  });

  it('is the page whose top is at the top of the viewport after a jump', () => {
    expect(currentPageAt(layout, pageAt(layout, 3).top, 150)).toBe(3);
  });

  it('gives a tie to the earlier page', () => {
    // Viewport [75, 175]: page 0 (20-120) shows 45px, page 1 (130-230) shows 45px.
    expect(currentPageAt(layout, 75, 100)).toBe(0);
  });

  it('counts visible heights less than a pixel apart as a tie', () => {
    // Viewport [74.8, 174.8]: page 0 shows 45.2px, page 1 shows 44.8px; [75.2, 175.2] the reverse.
    expect(currentPageAt(layout, 74.8, 100)).toBe(0);
    expect(currentPageAt(layout, 75.2, 100)).toBe(0);
  });

  // Real layouts have fractional tops and heights, and the reader often shows several whole pages.
  const viewerOpts: LayoutOptions = { gap: 16, padding: 24, maxPageWidth: 900 };
  const letters = Array.from({ length: 12 }, () => LETTER);

  it('is the page at the top when several whole pages are on screen', () => {
    // 420 px wide: pages are 372 × 481.41 px, so two whole pages fit in 1060 px.
    const narrow = computeLayout(letters, 420, viewerOpts);
    for (let index = 0; index < 10; index++) {
      const top = pageAt(narrow, index).top;
      for (const nudge of [-0.05, 0, 0.19, 0.6]) {
        expect(currentPageAt(narrow, top + nudge, 1060), `page ${index}, ${nudge}`).toBe(index);
      }
    }
  });

  it('is the page at the top when many thin pages are on screen', () => {
    // 792 × 60 pt strips at 1280 px wide: about 68 px tall, a dozen on screen.
    const strips = computeLayout(
      Array.from({ length: 40 }, () => ({ width: 792, height: 60 })),
      1280,
      viewerOpts,
    );
    for (const index of [5, 6, 20, 30]) {
      const top = pageAt(strips, index).top;
      for (const nudge of [-0.38, 0, 0.91]) {
        expect(currentPageAt(strips, top + nudge, 820), `page ${index}, ${nudge}`).toBe(index);
      }
    }
  });

  it('is the last page at the bottom of the book', () => {
    expect(currentPageAt(layout, layout.totalHeight - 150, 150)).toBe(4);
  });

  it('returns null for an empty layout', () => {
    expect(currentPageAt({ pages: [], totalHeight: 0, width: 0 }, 0, 100)).toBeNull();
  });
});

describe('pageAt', () => {
  it('throws for an index outside the book', () => {
    expect(() => pageAt({ pages: [] }, 0)).toThrow(RangeError);
  });
});
