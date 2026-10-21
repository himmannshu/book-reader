import { describe, expect, it } from 'vitest';
import {
  HIGHLIGHT_COLORS,
  highlightAt,
  highlightColor,
  joinTextPieces,
  normalizeQuote,
  sortByPosition,
  toPageRects,
  type Highlight,
  type PageOnScreen,
} from './highlights';

// Two Letter pages (612 × 792 pt) shown at 1.5 px per point, 20 px apart.
const page = (pageIndex: number, top: number, scale = 1.5): PageOnScreen => ({
  pageIndex,
  left: 100,
  top,
  width: 612 * scale,
  height: 792 * scale,
  scale,
});
const pages = [page(0, 50), page(1, 50 + 792 * 1.5 + 20)];
const rect = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  width,
  height,
});

describe('toPageRects', () => {
  it('converts screen pixels to PDF points from the page corner', () => {
    // 72 pt from the left and 180 pt from the top, 300 × 14 pt.
    const shown = rect(100 + 72 * 1.5, 50 + 180 * 1.5, 300 * 1.5, 14 * 1.5);
    expect(toPageRects([shown], pages)).toEqual([
      { pageIndex: 0, x: 72, y: 180, width: 300, height: 14 },
    ]);
  });

  it('gives the same points at any scale', () => {
    const at = (scale: number) =>
      toPageRects(
        [rect(100 + 72 * scale, 50 + 180 * scale, 300 * scale, 14 * scale)],
        [page(0, 50, scale)],
      );
    expect(at(0.8)).toEqual(at(2));
  });

  it('merges pieces of the same line into one box', () => {
    // Three word spans on one line, a few pixels apart, with slightly different heights.
    const line = [rect(208, 320, 60, 21), rect(272, 319, 90, 22), rect(366, 320, 40, 21)];
    const [merged, ...rest] = toPageRects(line, pages);
    expect(rest).toEqual([]);
    expect(merged?.x).toBeCloseTo((208 - 100) / 1.5);
    expect(merged?.width).toBeCloseTo((406 - 208) / 1.5);
    expect(merged?.y).toBeCloseTo((319 - 50) / 1.5);
    expect(merged?.height).toBeCloseTo((341 - 319) / 1.5);
  });

  it('keeps one box per line for a selection over several lines, top to bottom', () => {
    const lines = [rect(208, 359, 300, 21), rect(208, 320, 400, 21), rect(208, 398, 120, 21)];
    const result = toPageRects(lines, pages);
    expect(result.map((r) => Math.round(r.y))).toEqual([180, 206, 232]);
  });

  it('splits a selection across a page break by page', () => {
    const bottomOfFirst = rect(208, 50 + 740 * 1.5, 300, 21);
    const topOfSecond = rect(208, 50 + 792 * 1.5 + 20 + 160 * 1.5, 280, 21);
    const result = toPageRects([topOfSecond, bottomOfFirst], pages);
    expect(result.map((r) => r.pageIndex)).toEqual([0, 1]);
    expect(result[1]?.y).toBeCloseTo(160);
  });

  it('drops empty boxes and boxes outside every page, and clips to the page', () => {
    const result = toPageRects(
      [
        rect(300, 400, 0, 21), // empty
        rect(300, 400, 40, 0.5), // too thin
        rect(5, 400, 40, 21), // left of the page
        rect(100 + 600 * 1.5, 50 + 300 * 1.5, 60, 21), // runs past the right edge
      ],
      pages,
    );
    expect(result).toHaveLength(1);
    const [clipped] = result;
    expect(clipped?.x).toBeCloseTo(600);
    expect((clipped?.x ?? 0) + (clipped?.width ?? 0)).toBeCloseTo(612);
  });

  it('rounds to hundredths of a point', () => {
    const [r] = toPageRects([rect(100.333, 50.777, 33.3333, 20.0001)], pages);
    for (const value of [r?.x, r?.y, r?.width, r?.height]) {
      expect(Math.round((value ?? 0) * 100) / 100).toBe(value);
    }
  });
});

describe('joinTextPieces', () => {
  const piece = (text: string, pageIndex: number, top: number) => ({
    text,
    pageIndex,
    top,
    height: 20,
  });

  it('puts a space between lines and between pages, where the text layer has none', () => {
    expect(
      joinTextPieces([
        piece('foot of page one', 0, 1100),
        piece('and the top', 1, 1400),
        piece('of the next line', 1, 1430),
      ]),
    ).toBe('foot of page one and the top of the next line');
  });

  it('joins pieces of one line as they are, so split words stay whole', () => {
    expect(joinTextPieces([piece('high', 0, 300), piece('lights', 0, 301)])).toBe('highlights');
  });
});

describe('normalizeQuote', () => {
  it('collapses whitespace and line breaks, and trims', () => {
    expect(normalizeQuote('  foot of page one\n\nand Juliet\tten  ')).toBe(
      'foot of page one and Juliet ten',
    );
  });

  it('is empty for whitespace only', () => {
    expect(normalizeQuote(' \n\t ')).toBe('');
  });
});

const highlight = (id: string, pageIndex: number, y: number, x = 72, createdAt = 1): Highlight => ({
  id,
  bookId: 'book',
  pageIndex,
  rects: [{ pageIndex, x, y, width: 100, height: 14 }],
  quote: id,
  createdAt,
});

describe('sortByPosition', () => {
  it('orders by page, then top, then left, and returns a new array', () => {
    const list = [
      highlight('c', 1, 50),
      highlight('b', 0, 300),
      highlight('a2', 0, 100, 200),
      highlight('a1', 0, 100, 72),
    ];
    expect(sortByPosition(list).map((h) => h.id)).toEqual(['a1', 'a2', 'b', 'c']);
    expect(list[0]?.id).toBe('c');
  });
});

describe('highlightAt', () => {
  it('finds the highlight under a point on a page', () => {
    const list = [highlight('top', 0, 100), highlight('lower', 0, 300)];
    expect(highlightAt(list, 0, 120, 105)?.id).toBe('top');
    expect(highlightAt(list, 0, 120, 200)).toBeUndefined();
    expect(highlightAt(list, 1, 120, 105)).toBeUndefined();
  });

  it('picks the newest of overlapping highlights', () => {
    const list = [highlight('old', 0, 100, 72, 1), highlight('new', 0, 100, 72, 2)];
    expect(highlightAt(list, 0, 100, 105)?.id).toBe('new');
  });

  it('finds a highlight by any of its pages', () => {
    const spanning: Highlight = {
      ...highlight('both', 0, 740),
      rects: [
        { pageIndex: 0, x: 72, y: 740, width: 100, height: 14 },
        { pageIndex: 1, x: 72, y: 160, width: 100, height: 14 },
      ],
    };
    expect(highlightAt([spanning], 1, 100, 165)?.id).toBe('both');
  });
});

describe('highlightColor', () => {
  const base: Highlight = {
    id: 'h',
    bookId: 'b',
    pageIndex: 0,
    rects: [],
    quote: 'q',
    createdAt: 1,
  };

  it('offers the design’s four colours, yellow first', () => {
    expect([...HIGHLIGHT_COLORS]).toEqual(['yellow', 'green', 'blue', 'pink']);
  });

  it('is the highlight’s colour, and yellow for one saved before colours or with an unknown one', () => {
    expect(highlightColor({ ...base, color: 'blue' })).toBe('blue');
    expect(highlightColor(base)).toBe('yellow');
    expect(highlightColor({ ...base, color: 'purple' } as unknown as Highlight)).toBe('yellow');
  });
});
