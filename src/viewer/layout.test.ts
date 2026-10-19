import { describe, expect, it } from 'vitest';
import {
  anchorAt,
  computeLayout,
  pageAt,
  scrollTopFor,
  visibleRange,
  type LayoutOptions,
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
    expect(computeLayout([], 1000, opts)).toEqual({ pages: [], totalHeight: 0 });
  });
});

describe('visibleRange', () => {
  // Pages are 100px tall at width 100 (square pages), 10px gaps, 20px padding.
  const square = Array.from({ length: 50 }, () => ({ width: 100, height: 100 }));
  const layout = computeLayout(square, 140, { gap: 10, padding: 20, maxPageWidth: 100 });
  const range = (scrollTop: number, viewport: number, overscan = 0, maxPages = 100) =>
    visibleRange(layout, scrollTop, viewport, overscan, maxPages);

  it('returns null for an empty layout', () => {
    expect(visibleRange({ pages: [], totalHeight: 0 }, 0, 500, 1, 8)).toBeNull();
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

  it('never returns more than maxPages, trimming overscan first', () => {
    const r = range(555, 150, 10, 5);
    if (!r) throw new Error('expected a range');
    expect(r.last - r.first + 1).toBe(5);
    expect(r.first).toBeLessThanOrEqual(4);
    expect(r.last).toBeGreaterThanOrEqual(6);
  });

  it('handles a single page book', () => {
    const one = computeLayout([LETTER], 1000, opts);
    expect(visibleRange(one, 0, 500, 2, 8)).toEqual({ first: 0, last: 0 });
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

  it('anchors to the next page when the offset falls in a gap', () => {
    const layout = computeLayout([LETTER, LETTER], 2000, opts);
    const gapY = pageAt(layout, 0).top + pageAt(layout, 0).height + 5;
    expect(anchorAt(layout, gapY)).toEqual({ pageIndex: 1, fraction: 0 });
  });

  it('returns null for an empty layout', () => {
    expect(anchorAt({ pages: [], totalHeight: 0 }, 0)).toBeNull();
  });
});

describe('pageAt', () => {
  it('throws for an index outside the book', () => {
    expect(() => pageAt({ pages: [] }, 0)).toThrow(RangeError);
  });
});
