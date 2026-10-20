import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, type Page } from '@playwright/test';

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

/** Distance in px from the top of the reader to the top of page `index`. */
export async function offsetFromReaderTop(page: Page, index: number): Promise<number> {
  return pageSlot(page, index).evaluate((slot) => {
    const reader = slot.closest('[data-testid="reader"]');
    return slot.getBoundingClientRect().top - (reader?.getBoundingClientRect().top ?? 0);
  });
}

/** Page `index` sits at the top of the reader and is drawn (its band color matches). */
export async function expectPageAtTop(page: Page, index: number) {
  await expect.poll(() => offsetFromReaderTop(page, index)).toBeLessThanOrEqual(2);
  expect(await offsetFromReaderTop(page, index)).toBeGreaterThanOrEqual(-2);
  await expect(pageSlot(page, index)).toHaveAttribute('data-state', 'rendered');
  const color = await bandColorOnCanvas(page, index);
  expect(expectColorClose(color, bandColor(index)), `page ${index + 1} color was ${color}`).toBe(
    true,
  );
}

/** Imports a fixture through the picker and waits until it is saved on the device. */
export async function importBook(page: Page, file: string) {
  await openFixture(page, file);
  await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');
  await expect(page.getByRole('status')).toHaveText('Saved on this device.');
}

/**
 * Loads the app, waits until its service worker has activated, and reloads so the worker controls
 * the page (offline tests). Polls the registration instead of awaiting `serviceWorker.ready`,
 * which WebKit sometimes never resolves when the page was loaded twice in a row.
 */
export async function loadControlled(page: Page) {
  await page.goto('/');
  await expect
    .poll(() =>
      page.evaluate(
        async () =>
          (await navigator.serviceWorker.getRegistration())?.active?.state === 'activated',
      ),
    )
    .toBe(true);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);
}
