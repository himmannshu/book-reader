// Phase 10: reading comfort. Resume where I left off, themes, zoom and fit.
import { expect, test, type Page } from '@playwright/test';
import { fixturePath, importBook, offsetFromReaderTop, openFixture, pageSlot } from './helpers';

const LONG = 'long-300-pages';
/** Letter pages at fit width on the 1280 px test window: 900 × 1164.7 px. */
const FIT_WIDTH = 900;
const LETTER_RATIO = 792 / 612;
const ACTUAL = 96 / 72;

function reader(page: Page) {
  return page.getByTestId('reader');
}

async function backToLibrary(page: Page) {
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Your books' })).toBeVisible();
}

async function openFromLibrary(page: Page, title: string) {
  await page
    .getByRole('list', { name: 'Your books' })
    .getByRole('button', { name: title, exact: true })
    .click();
}

/** Scrolls the reader so that `pixels` of page `index` are above the window's top edge. */
async function scrollInto(page: Page, index: number, pixels: number) {
  await pageSlot(page, index).evaluate((slot, by) => {
    const scroller = slot.closest<HTMLElement>('[data-testid="reader"]');
    if (!scroller) throw new Error('no reader');
    scroller.scrollTop = (slot as HTMLElement).offsetTop + by;
  }, pixels);
}

/** The reading state saved in IndexedDB for the only book, or null. */
async function savedState(page: Page): Promise<{
  position: { pageIndex: number; fraction: number };
  zoom: unknown;
} | null> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('book-reader');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      if (!db.objectStoreNames.contains('readingState')) return null;
      const all = await new Promise<unknown[]>((resolve, reject) => {
        const request = db.transaction('readingState').objectStore('readingState').getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      return (all[0] ?? null) as never;
    } finally {
      db.close();
    }
  });
}

/** The page drawn first since the book started opening (from the viewer's timing marks). */
async function firstDrawnPage(page: Page): Promise<number | undefined> {
  return page.evaluate(() => {
    const [mark] = performance.getEntriesByName('page:rendered') as PerformanceMark[];
    return (mark?.detail as { pageIndex: number } | undefined)?.pageIndex;
  });
}

async function pageWidth(page: Page, index = 0): Promise<number> {
  return (await pageSlot(page, index).boundingBox())?.width ?? 0;
}

function zoomSelect(page: Page) {
  return page.getByRole('combobox', { name: 'Zoom' });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test.describe('resume where I left off', () => {
  test('reopening from the Library and after a reload returns to the same place, drawn first', async ({
    page,
  }) => {
    await importBook(page, `${LONG}.pdf`);
    await scrollInto(page, 40, 300);
    await expect.poll(async () => (await savedState(page))?.position.pageIndex).toBe(40);

    await backToLibrary(page);
    await openFromLibrary(page, LONG);
    await expect(pageSlot(page, 40)).toHaveAttribute('data-state', 'rendered');
    expect(Math.abs((await offsetFromReaderTop(page, 40)) + 300)).toBeLessThanOrEqual(2);
    expect(await firstDrawnPage(page)).toBe(40);

    await page.reload();
    await openFromLibrary(page, LONG);
    await expect(pageSlot(page, 40)).toHaveAttribute('data-state', 'rendered');
    expect(Math.abs((await offsetFromReaderTop(page, 40)) + 300)).toBeLessThanOrEqual(2);
    expect(await firstDrawnPage(page)).toBe(40);
  });

  test('the place is kept when I go to the Library right after scrolling', async ({ page }) => {
    await importBook(page, `${LONG}.pdf`);
    await scrollInto(page, 12, 100);
    await backToLibrary(page);
    await openFromLibrary(page, LONG);
    await expect(pageSlot(page, 12)).toHaveAttribute('data-state', 'rendered');
    expect(Math.abs((await offsetFromReaderTop(page, 12)) + 100)).toBeLessThanOrEqual(2);
  });

  test('the place is kept when the tab is hidden and then closed', async ({ page }) => {
    await importBook(page, `${LONG}.pdf`);
    await scrollInto(page, 20, 50);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect.poll(async () => (await savedState(page))?.position.pageIndex).toBe(20);
    await page.reload();
    await openFromLibrary(page, LONG);
    await expect(pageSlot(page, 20)).toHaveAttribute('data-state', 'rendered');
    expect(Math.abs((await offsetFromReaderTop(page, 20)) + 50)).toBeLessThanOrEqual(2);
  });

  test('opening the same PDF again with Open PDF resumes there too', async ({ page }) => {
    await importBook(page, `${LONG}.pdf`);
    await scrollInto(page, 30, 0);
    await expect.poll(async () => (await savedState(page))?.position.pageIndex).toBe(30);
    await backToLibrary(page);

    await openFixture(page, `${LONG}.pdf`);
    await expect(page.getByRole('status')).toHaveText('Saved on this device.');
    await expect.poll(() => offsetFromReaderTop(page, 30)).toBeLessThanOrEqual(2);
    expect(await offsetFromReaderTop(page, 30)).toBeGreaterThanOrEqual(-2);
    await expect(pageSlot(page, 30)).toHaveAttribute('data-state', 'rendered');
  });
});

/**
 * The colour shown (theme filters included) near the bottom right of the visible part of a drawn
 * page, away from its coloured band.
 */
async function shownPagePixel(page: Page, index: number): Promise<number[]> {
  await expect(pageSlot(page, index)).toHaveAttribute('data-state', 'rendered');
  const slot = await pageSlot(page, index).boundingBox();
  const view = await reader(page).boundingBox();
  if (!slot || !view) throw new Error('no boxes');
  const x = Math.max(slot.x, view.x);
  const y = Math.max(slot.y, view.y);
  const right = Math.min(slot.x + slot.width, view.x + view.width);
  const bottom = Math.min(slot.y + slot.height, view.y + view.height);
  const point = { x: x + (right - x) * 0.9, y: y + (bottom - y) * 0.8 };
  const png = (await page.screenshot({ clip: { ...point, width: 1, height: 1 } })).toString(
    'base64',
  );
  return page.evaluate(async (data) => {
    const blob = await (await fetch(`data:image/png;base64,${data}`)).blob();
    const image = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(image.width, image.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('no 2d context');
    context.drawImage(image, 0, 0);
    const pixel = context.getImageData(0, 0, 1, 1).data;
    return [pixel[0] ?? 0, pixel[1] ?? 0, pixel[2] ?? 0];
  }, png);
}

async function bodyColor(page: Page): Promise<string> {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor);
}

const themeSelect = (page: Page) => page.getByRole('combobox', { name: 'Theme' });

test.describe('themes', () => {
  test('Dark and Sepia change the chrome and the pages, and the choice survives a reload', async ({
    page,
  }) => {
    await importBook(page, 'basic-3-pages.pdf');
    const light = await shownPagePixel(page, 0);
    expect(Math.min(...light), `light page ${light}`).toBeGreaterThan(240);
    const lightBody = await bodyColor(page);

    await themeSelect(page).selectOption({ label: 'Dark' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const dark = await shownPagePixel(page, 0);
    expect(Math.max(...dark), `dark page ${dark}`).toBeLessThan(60);
    expect(await bodyColor(page)).not.toBe(lightBody);
    expect(await page.locator('meta[name="theme-color"]').getAttribute('content')).toBe('#1a1815');

    await themeSelect(page).selectOption({ label: 'Sepia' });
    const sepia = await shownPagePixel(page, 0);
    // The design's page-tint (#f0dcae at 30%) multiplied over white paper: warm, not white or grey
    // (phase 18; the tint was a stronger #f3e2bf before).
    const tint = [0xf0, 0xdc, 0xae].map((c) => Math.round(255 * 0.7 + c * 0.3));
    sepia.forEach((value, i) =>
      expect(Math.abs(value - (tint[i] ?? 0)), `sepia ${sepia}`).toBeLessThanOrEqual(4),
    );
    expect(sepia[0] ?? 0).toBeGreaterThan(sepia[2] ?? 0);

    await themeSelect(page).selectOption({ label: 'Dark' });
    await page.reload();
    await expect(themeSelect(page)).toHaveValue('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await openFromLibrary(page, 'basic-3-pages');
    expect(Math.max(...(await shownPagePixel(page, 0)))).toBeLessThan(60);

    await themeSelect(page).selectOption({ label: 'Light' });
    expect(Math.min(...(await shownPagePixel(page, 0)))).toBeGreaterThan(240);
    expect(await bodyColor(page)).toBe(lightBody);
  });

  test('a saved dark theme applies before the app has loaded (no light flash)', async ({
    page,
  }) => {
    await themeSelect(page).selectOption({ label: 'Dark' });
    const darkBody = await bodyColor(page);
    // Hold the app's script back, then look at the page while only HTML and CSS have loaded.
    let release = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route('**/assets/*.js', async (route) => {
      await held;
      await route.continue();
    });
    await page.goto('/', { waitUntil: 'commit' });
    await expect.poll(() => bodyColor(page)).toBe(darkBody);
    expect(await page.locator('#root').innerHTML()).toBe('');
    release();
    await expect(themeSelect(page)).toHaveValue('dark');
  });
});

test.describe('zoom and fit', () => {
  test('zoom in and out step through levels and keep the reading place', async ({ page }) => {
    await importBook(page, `${LONG}.pdf`);
    await expect(zoomSelect(page)).toHaveValue('fit-width');
    expect(await pageWidth(page)).toBeCloseTo(FIT_WIDTH, 0);
    await scrollInto(page, 5, 200);
    await expect(pageSlot(page, 5)).toHaveAttribute('data-state', 'rendered');
    const fraction = 200 / (FIT_WIDTH * LETTER_RATIO);

    // Fit width here is 110.3%, so the next level up is 125%.
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await expect(zoomSelect(page)).toHaveValue('125');
    await expect.poll(() => pageWidth(page, 5)).toBeCloseTo(612 * 1.25 * ACTUAL, 0);
    const height = 612 * 1.25 * ACTUAL * LETTER_RATIO;
    expect(Math.abs((await offsetFromReaderTop(page, 5)) + fraction * height)).toBeLessThanOrEqual(
      2,
    );
    await expect(pageSlot(page, 5)).toHaveAttribute('data-state', 'rendered');

    await page.getByRole('button', { name: 'Zoom out' }).click();
    await page.getByRole('button', { name: 'Zoom out' }).click();
    await expect(zoomSelect(page)).toHaveValue('100');
    await expect.poll(() => pageWidth(page, 5)).toBeCloseTo(612 * ACTUAL, 0);
    const actualHeight = 612 * ACTUAL * LETTER_RATIO;
    expect(
      Math.abs((await offsetFromReaderTop(page, 5)) + fraction * actualHeight),
    ).toBeLessThanOrEqual(2);
  });

  test('fit page shows the whole page in the window', async ({ page }) => {
    await importBook(page, 'basic-3-pages.pdf');
    await zoomSelect(page).selectOption('fit-page');
    const scroller = await reader(page).boundingBox();
    await expect
      .poll(async () => (await pageSlot(page, 0).boundingBox())?.height ?? 0)
      .toBeCloseTo((scroller?.height ?? 0) - 48, 0);
    const box = await pageSlot(page, 0).boundingBox();
    if (!box || !scroller) throw new Error('no boxes');
    expect(box.y).toBeGreaterThanOrEqual(scroller.y);
    expect(box.y + box.height).toBeLessThanOrEqual(scroller.y + scroller.height);
    await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');

    // A taller window makes the page taller.
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect
      .poll(async () => (await pageSlot(page, 0).boundingBox())?.height ?? 0)
      .toBeGreaterThan(box.height + 100);
  });

  test('the keys + - and 0 zoom from the pages', async ({ page }) => {
    await importBook(page, 'basic-3-pages.pdf');
    await reader(page).focus();
    await page.keyboard.press('+');
    await expect(zoomSelect(page)).toHaveValue('125');
    await page.keyboard.press('=');
    await expect(zoomSelect(page)).toHaveValue('150');
    await page.keyboard.press('-');
    await expect(zoomSelect(page)).toHaveValue('125');
    await page.keyboard.press('0');
    await expect(zoomSelect(page)).toHaveValue('fit-width');
    await expect.poll(() => pageWidth(page)).toBeCloseTo(FIT_WIDTH, 0);
  });

  test('a page wider than the window scrolls sideways to both edges', async ({ page }) => {
    await importBook(page, 'basic-3-pages.pdf');
    await zoomSelect(page).selectOption('200');
    await expect.poll(() => pageWidth(page)).toBeCloseTo(612 * 2 * ACTUAL, 0);
    const edges = async (scrollLeft: number) => {
      await reader(page).evaluate((element, left) => {
        element.scrollLeft = left;
      }, scrollLeft);
      const view = await reader(page).boundingBox();
      const slot = await pageSlot(page, 0).boundingBox();
      if (!view || !slot) throw new Error('no boxes');
      return { view, slot };
    };
    const start = await edges(0);
    expect(start.slot.x).toBeGreaterThanOrEqual(start.view.x);
    expect(start.slot.x).toBeLessThan(start.view.x + 48);
    const end = await edges(1e6);
    const viewRight = end.view.x + (await reader(page).evaluate((e) => e.clientWidth));
    expect(end.slot.x + end.slot.width).toBeLessThanOrEqual(viewRight);
    expect(end.slot.x + end.slot.width).toBeGreaterThan(viewRight - 48);
  });

  test('zoom is remembered per book and restored with the position', async ({ page }) => {
    await importBook(page, `${LONG}.pdf`);
    await zoomSelect(page).selectOption('150');
    await scrollInto(page, 8, 0);
    await expect.poll(async () => (await savedState(page))?.zoom).toBe(150);
    await expect.poll(async () => (await savedState(page))?.position.pageIndex).toBe(8);

    await backToLibrary(page);
    await page.getByLabel('Open PDF').setInputFiles(fixturePath('basic-3-pages.pdf'));
    await expect(page.getByRole('status')).toHaveText('Saved on this device.');
    await expect(zoomSelect(page)).toHaveValue('fit-width');
    expect(await pageWidth(page)).toBeCloseTo(FIT_WIDTH, 0);

    await backToLibrary(page);
    await openFromLibrary(page, LONG);
    await expect(zoomSelect(page)).toHaveValue('150');
    await expect.poll(() => pageWidth(page, 8)).toBeCloseTo(612 * 1.5 * ACTUAL, 0);
    await expect.poll(() => offsetFromReaderTop(page, 8)).toBeLessThanOrEqual(2);
    expect(await offsetFromReaderTop(page, 8)).toBeGreaterThanOrEqual(-2);
  });
});

test.describe('memory when zoomed in', () => {
  test.use({ deviceScaleFactor: 2 });

  test('at 400% canvases stay under the size cap and budget, and scrolling does not redraw pages over and over', async ({
    page,
  }, testInfo) => {
    // Linux CI WebKit paints these 12-megapixel canvases in software, which is slow (phase 10
    // review B2); the frame gaps are recorded below so a real freeze is told apart from that.
    test.slow();
    await importBook(page, `${LONG}.pdf`);
    await zoomSelect(page).selectOption('400');
    await expect.poll(() => pageWidth(page)).toBeCloseTo(612 * 4 * ACTUAL, 0);
    await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');

    const canvases = () =>
      page
        .locator('canvas')
        .evaluateAll((list) => (list as HTMLCanvasElement[]).map((c) => c.width * c.height));
    for (const pixels of await canvases()) expect(pixels).toBeLessThanOrEqual(16_777_216);

    // Scroll about half a page, 40 px per frame, counting how often pages start drawing and
    // the longest gap between frames.
    const { renders, gaps } = await reader(page).evaluate(async (element) => {
      let renders = 0;
      const observer = new MutationObserver((records) => {
        for (const record of records) {
          if ((record.target as HTMLElement).dataset.state === 'rendering') renders++;
        }
      });
      observer.observe(element, { subtree: true, attributeFilter: ['data-state'] });
      const frame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));
      const gaps: number[] = [];
      let last = await frame();
      for (let step = 0; step < 60; step++) {
        element.scrollTop += 40;
        const now = await frame();
        gaps.push(now - last);
        last = now;
      }
      observer.disconnect();
      return { renders, gaps };
    });
    const sorted = [...gaps].sort((a, b) => a - b);
    const summary = `median ${Math.round(sorted[30] ?? 0)} ms, max ${Math.round(sorted.at(-1) ?? 0)} ms`;
    testInfo.annotations.push({ type: 'frame gaps at 400%', description: summary });
    console.log(`[${testInfo.project.name}] frame gaps at 400%: ${summary}`);
    expect(renders).toBeLessThanOrEqual(4);
    // A freeze (as the review feared), not just slow painting, would show as a gap of seconds.
    expect(sorted.at(-1) ?? 0, summary).toBeLessThan(5000);
    const all = await canvases();
    for (const pixels of all) expect(pixels).toBeLessThanOrEqual(16_777_216);
    expect(all.reduce((sum, pixels) => sum + pixels * 4, 0)).toBeLessThanOrEqual(96_000_000);
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the theme and zoom controls fit without sideways scrolling', async ({ page }) => {
    const noSidewaysScroll = () =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      );
    await expect(themeSelect(page)).toBeInViewport();
    expect(await noSidewaysScroll()).toBe(true);

    await importBook(page, 'basic-3-pages.pdf');
    // Phase 14: on phones, theme and zoom are in the Display menu.
    await page.getByRole('button', { name: 'Display', exact: true }).click();
    for (const control of [
      themeSelect(page),
      zoomSelect(page),
      page.getByRole('button', { name: 'Zoom in' }),
      page.getByRole('button', { name: 'Zoom out' }),
    ]) {
      await expect(control).toBeInViewport();
    }
    expect(await noSidewaysScroll()).toBe(true);
  });
});
