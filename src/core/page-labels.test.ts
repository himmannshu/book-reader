import { describe, expect, it } from 'vitest';
import { pageLabel, pagePillText } from './page-labels';

describe('pageLabel', () => {
  it('uses the page number from 1 when the book defines no labels', () => {
    expect(pageLabel(0, null)).toBe('1');
    expect(pageLabel(41, null)).toBe('42');
  });

  it('uses the PDF’s label, and the number where a label is missing or blank', () => {
    const labels = ['i', 'ii', '', null, '1'];
    expect(pageLabel(1, labels)).toBe('ii');
    expect(pageLabel(2, labels)).toBe('3');
    expect(pageLabel(3, labels)).toBe('4');
    expect(pageLabel(4, labels)).toBe('1');
  });
});

describe('pagePillText', () => {
  it('reads "Page N of M · P%" by physical pages', () => {
    expect(pagePillText(0, 4, null)).toBe('Page 1 of 4 · 25%');
    expect(pagePillText(141, 380, null)).toBe('Page 142 of 380 · 37%');
  });

  it('counts to the last printed page number when the book has labels', () => {
    const labels = ['i', 'ii', 'iii', '1', '2', '3'];
    expect(pagePillText(1, 6, labels)).toBe('Page ii of 3 · 33%');
    expect(pagePillText(5, 6, labels)).toBe('Page 3 of 3 · 100%');
  });

  it('counts physical pages when the last label is not a number', () => {
    expect(pagePillText(0, 3, ['A-1', 'A-2', 'Index'])).toBe('Page A-1 of 3 · 33%');
  });
});
