import { describe, expect, it } from 'vitest';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  ZOOM_LEVELS,
  scaleForPercent,
  validReadingState,
  zoomIn,
  zoomLabel,
  zoomOut,
  zoomPercent,
  type ReadingState,
} from './reading-state';

describe('zoom percentages', () => {
  it('treat 100% as actual size: one PDF point is 96/72 CSS pixels', () => {
    expect(scaleForPercent(100)).toBeCloseTo(96 / 72);
    expect(zoomPercent(96 / 72)).toBeCloseTo(100);
    expect(zoomPercent(scaleForPercent(250))).toBeCloseTo(250);
  });

  it('are listed in increasing order between the minimum and the maximum', () => {
    expect([...ZOOM_LEVELS].sort((a, b) => a - b)).toEqual([...ZOOM_LEVELS]);
    expect(ZOOM_LEVELS[0]).toBe(MIN_ZOOM);
    expect(ZOOM_LEVELS.at(-1)).toBe(MAX_ZOOM);
  });
});

describe('zoomIn / zoomOut', () => {
  it('step to the next level from a level', () => {
    expect(zoomIn(100)).toBe(110);
    expect(zoomOut(100)).toBe(90);
  });

  it('step from a zoom between levels, such as fit width', () => {
    expect(zoomIn(117)).toBe(125);
    expect(zoomOut(117)).toBe(110);
    // On a phone, fit width can be about 42%.
    expect(zoomOut(42)).toBe(33);
    expect(zoomIn(42)).toBe(50);
  });

  it('treat a zoom within half a percent of a level as that level', () => {
    // Fit width on a 1280 px window shows a letter page at about 110.3%.
    expect(zoomOut(110.3)).toBe(100);
    expect(zoomIn(99.7)).toBe(110);
    expect(zoomOut(100.4)).toBe(90);
  });

  it('return null at the ends', () => {
    expect(zoomIn(MAX_ZOOM)).toBeNull();
    expect(zoomIn(MAX_ZOOM + 50)).toBeNull();
    expect(zoomOut(MIN_ZOOM)).toBeNull();
    expect(zoomOut(10)).toBeNull();
  });
});

describe('zoomLabel', () => {
  it('names fit modes and shows percentages', () => {
    expect(zoomLabel('fit-width')).toBe('Fit width');
    expect(zoomLabel('fit-page')).toBe('Fit page');
    expect(zoomLabel(150)).toBe('150%');
  });
});

describe('validReadingState', () => {
  const good: ReadingState = {
    bookId: 'abc',
    position: { pageIndex: 3, fraction: 0.25, pixelsAbove: 0 },
    zoom: 'fit-page',
    savedAt: 1,
  };

  it('accepts a saved state with a fit mode or a percentage', () => {
    expect(validReadingState(good)).toBe(true);
    expect(validReadingState({ ...good, zoom: 150 })).toBe(true);
    expect(validReadingState({ ...good, pageCount: 300 })).toBe(true);
  });

  it('rejects damaged records', () => {
    for (const bad of [
      null,
      'x',
      { ...good, bookId: 3 },
      { ...good, position: null },
      { ...good, position: { ...good.position, pageIndex: -1 } },
      { ...good, position: { ...good.position, pageIndex: 1.5 } },
      { ...good, position: { ...good.position, fraction: 2 } },
      { ...good, position: { ...good.position, fraction: Number.NaN } },
      { ...good, position: { ...good.position, pixelsAbove: -3 } },
      { ...good, zoom: 'huge' },
      { ...good, zoom: 0 },
      { ...good, zoom: MAX_ZOOM + 1 },
      { ...good, savedAt: '1' },
      { ...good, pageCount: 0 },
      { ...good, pageCount: 2.5 },
      { ...good, pageCount: '300' },
    ]) {
      expect(validReadingState(bad), JSON.stringify(bad)).toBe(false);
    }
  });
});
