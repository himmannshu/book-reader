import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from '@playwright/test';

const fixturesDir = join(import.meta.dirname, '..', 'tests', 'fixtures');

export type FixtureName = 'basic-3-pages' | 'mixed-sizes' | 'long-300-pages';

interface Manifest {
  [name: string]: { file: string; pages: { width: number; height: number }[] };
}

export const manifest = JSON.parse(
  readFileSync(join(fixturesDir, 'manifest.json'), 'utf8'),
) as Manifest;

export function fixturePath(file: string): string {
  return join(fixturesDir, file);
}

// Keep in sync with bandColor() in scripts/generate-fixtures.mjs.
export function bandColor(index: number): [number, number, number] {
  return [40 + ((index * 67) % 180), 40 + ((index * 131) % 180), 40 + ((index * 29) % 180)];
}

/** Opens a fixture through the app's own "Open PDF" file input. */
export async function openFixture(page: Page, file: string): Promise<void> {
  await page.getByLabel('Open PDF').setInputFiles(fixturePath(file));
}

export function pageSlot(page: Page, index: number) {
  return page.locator(`[data-page-index="${index}"]`);
}

/** Reads the pixel color inside the band at the top of a drawn page's canvas. */
export async function bandColorOnCanvas(page: Page, index: number): Promise<number[]> {
  return pageSlot(page, index)
    .locator('canvas')
    .evaluate((canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas has no 2d context');
      const [r, g, b] = ctx.getImageData(
        Math.floor(canvas.width / 2),
        Math.floor(canvas.height * 0.1),
        1,
        1,
      ).data;
      return [r ?? -1, g ?? -1, b ?? -1];
    });
}

export function expectColorClose(actual: number[], expected: number[], tolerance = 3): boolean {
  return (
    actual.length === 3 && actual.every((v, i) => Math.abs(v - (expected[i] ?? -999)) <= tolerance)
  );
}
