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

/**
 * Opens a fixture through the app's own "Open PDF" file input. It is in the library only (phase
 * 19), so with a book open this goes back to the library first, as a reader would.
 */
export async function openFixture(page: Page, file: string): Promise<void> {
  const library = page.getByRole('toolbar', { name: 'Reader' }).getByRole('button', {
    name: 'Library',
  });
  if (await library.isVisible()) await library.click();
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
 * Loads the app (unless the page already shows it), waits until its service worker has activated,
 * and reloads so the worker controls the page (offline tests). Loading the page again while the
 * worker is still installing can leave WebKit's install stuck for good, so it never reloads
 * before activation. Polls the registration instead of awaiting `serviceWorker.ready`.
 */
export async function loadControlled(page: Page) {
  if (page.url() === 'about:blank') await page.goto('/');
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

// Reading settings (phase 19) replaced the reader's Theme and Zoom pickers. These helpers open
// it, act, close it with Escape and put keyboard focus back where it was, so a test that then
// presses keys in the pages still reaches them.

const readingSettings = (page: Page) => page.getByRole('dialog', { name: 'Reading settings' });

async function withReadingSettings<T>(
  page: Page,
  act: (dialog: ReturnType<typeof readingSettings>) => Promise<T>,
): Promise<T> {
  const wasOpen = await readingSettings(page).isVisible();
  if (!wasOpen) {
    await page.evaluate(() => {
      (window as unknown as { focusBeforeSettings: Element | null }).focusBeforeSettings =
        document.activeElement;
    });
    await page.getByRole('button', { name: 'Reading settings' }).click();
  }
  const dialog = readingSettings(page);
  await expect(dialog).toBeVisible();
  const result = await act(dialog);
  if (!wasOpen) {
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await page.evaluate(() => {
      const before = (window as unknown as { focusBeforeSettings: Element | null })
        .focusBeforeSettings;
      if (before instanceof HTMLElement) before.focus({ preventScroll: true });
    });
  }
  return result;
}

/** The reader's zoom as the old Zoom picker's value: 'fit-width', 'fit-page' or '150'. */
export async function readerZoom(page: Page): Promise<string> {
  return withReadingSettings(page, async (dialog) => {
    const fit = await dialog
      .getByRole('radiogroup', { name: 'Fit' })
      .locator('[aria-checked="true"]')
      .textContent();
    if (fit?.trim() === 'Width') return 'fit-width';
    if (fit?.trim() === 'Page') return 'fit-page';
    return ((await dialog.getByTestId('zoom-value').textContent()) ?? '').replace('%', '');
  });
}

/** One step with Reading settings' Zoom in or Zoom out. */
export async function stepReaderZoom(page: Page, direction: 'in' | 'out'): Promise<void> {
  await withReadingSettings(page, (dialog) =>
    dialog.getByRole('button', { name: direction === 'in' ? 'Zoom in' : 'Zoom out' }).click(),
  );
}

/** Sets the zoom as the old picker did: a fit mode, or a level reached with Zoom in and out. */
export async function setReaderZoom(page: Page, zoom: 'fit-width' | 'fit-page' | number) {
  await withReadingSettings(page, async (dialog) => {
    if (typeof zoom === 'string') {
      const name = zoom === 'fit-width' ? 'Width' : 'Page';
      await dialog.getByRole('radiogroup', { name: 'Fit' }).getByRole('radio', { name }).click();
      return;
    }
    const value = dialog.getByTestId('zoom-value');
    for (let step = 0; step < 20; step++) {
      const shown = parseInt((await value.textContent()) ?? '', 10);
      if (shown === zoom) return;
      const before = await value.textContent();
      await dialog.getByRole('button', { name: shown < zoom ? 'Zoom in' : 'Zoom out' }).click();
      await expect(value).not.toHaveText(before ?? '');
    }
    throw new Error(`zoom ${zoom}% is not a level`);
  });
}

/** Chooses a theme: in Reading settings while reading, in the library's picker otherwise. */
export async function chooseTheme(page: Page, label: 'Light' | 'Sepia' | 'Dark') {
  const reading = await page.getByRole('button', { name: 'Reading settings' }).isVisible();
  if (!reading) {
    await page.getByRole('combobox', { name: 'Theme' }).selectOption({ label });
    return;
  }
  await withReadingSettings(page, (dialog) =>
    dialog.getByRole('radiogroup', { name: 'Theme' }).getByRole('radio', { name: label }).click(),
  );
}

/** Opens or closes a reader panel: its toolbar button, or under More on phones (phase 19). */
export async function openPanel(page: Page, name: 'Contents' | 'Bookmarks' | 'Notes' | 'Search') {
  const button = page
    .getByRole('toolbar', { name: 'Reader' })
    .getByRole('button', { name, exact: true });
  if (await button.isVisible()) {
    await button.click();
    return;
  }
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('menu', { name: 'More' }).getByRole('menuitem', { name }).click();
}
