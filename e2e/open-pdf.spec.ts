import { expect, test } from '@playwright/test';
import {
  bandColor,
  bandColorOnCanvas,
  expectColorClose,
  manifest,
  openFixture,
  pageSlot,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('opening a PDF draws its first page', async ({ page }) => {
  await openFixture(page, 'basic-3-pages.pdf');
  await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');
  const color = await bandColorOnCanvas(page, 0);
  expect(expectColorClose(color, bandColor(0)), `page 1 band color was ${color}`).toBe(true);
});

test('scrolling to the bottom draws the last page of a short book', async ({ page }) => {
  await openFixture(page, 'basic-3-pages.pdf');
  await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');
  await page.getByTestId('reader').evaluate((el) => (el.scrollTop = el.scrollHeight));
  await expect(pageSlot(page, 2)).toHaveAttribute('data-state', 'rendered');
  const color = await bandColorOnCanvas(page, 2);
  expect(expectColorClose(color, bandColor(2)), `page 3 band color was ${color}`).toBe(true);
});

test('scrolling through a 300-page book keeps at most 8 canvases and draws the last page', async ({
  page,
}) => {
  // Each stop starts real page draws on the main thread, which is slow in headless WebKit on CI.
  test.slow();
  await openFixture(page, 'long-300-pages.pdf');
  await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');

  const stats = await page.getByTestId('reader').evaluate(async (el) => {
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    let maxCanvases = 0;
    let maxActive = 0;
    // 20 stops spread evenly from the first page to the last; each lands on pages not drawn
    // before. A fixed count keeps the test's cost independent of how slow the browser is.
    const stops = 20;
    const maxTop = el.scrollHeight - el.clientHeight;
    for (let i = 0; i <= stops; i++) {
      el.scrollTop = (maxTop * i) / stops;
      await frame();
      await frame();
      maxCanvases = Math.max(maxCanvases, el.querySelectorAll('canvas').length);
      maxActive = Math.max(
        maxActive,
        el.querySelectorAll('[data-state="rendered"], [data-state="rendering"]').length,
      );
    }
    el.scrollTop = el.scrollHeight;
    return { maxCanvases, maxActive };
  });

  expect(stats.maxCanvases).toBeGreaterThan(0);
  expect(stats.maxCanvases).toBeLessThanOrEqual(8);
  expect(stats.maxActive).toBeLessThanOrEqual(8);
  await expect(pageSlot(page, 299)).toHaveAttribute('data-state', 'rendered');
  const color = await bandColorOnCanvas(page, 299);
  expect(expectColorClose(color, bandColor(299)), `page 300 band color was ${color}`).toBe(true);
  // Pages far from the viewport have released their canvas.
  await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'placeholder');
  await expect(pageSlot(page, 0).locator('canvas')).toHaveCount(0);
});

test('pages of different sizes keep their own shape', async ({ page }) => {
  await openFixture(page, 'mixed-sizes.pdf');
  const expected = manifest['mixed-sizes']?.pages ?? [];
  expect(expected).toHaveLength(3);
  for (const [index, size] of expected.entries()) {
    await expect
      .poll(async () => {
        const box = await pageSlot(page, index).boundingBox();
        return box ? box.width / box.height : 0;
      })
      .toBeCloseTo(size.width / size.height, 2);
  }
  const landscape = await pageSlot(page, 1).boundingBox();
  expect(landscape && landscape.width > landscape.height).toBe(true);
});

test('a file that is not a PDF shows an error, and a real PDF still opens afterwards', async ({
  page,
}) => {
  await openFixture(page, 'not-a-pdf.pdf');
  await expect(page.getByRole('alert')).toHaveText("This file isn't a readable PDF.");
  await openFixture(page, 'basic-3-pages.pdf');
  await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('opening a second book replaces the first', async ({ page }) => {
  await openFixture(page, 'long-300-pages.pdf');
  // The title is in the toolbar and the page count in the page pill (phase 19).
  await expect(page.getByTestId('book-title')).toHaveText('long-300-pages');
  await expect(page.getByTestId('page-announcement')).toHaveText(/ of 300 /);
  await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');

  await openFixture(page, 'basic-3-pages.pdf');
  await expect(page.getByTestId('book-title')).toHaveText('basic-3-pages');
  await expect(page.getByTestId('page-announcement')).toHaveText(/ of 3 /);
  await expect(page.locator('[data-page-index]')).toHaveCount(3);
  await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');
  const color = await bandColorOnCanvas(page, 0);
  expect(expectColorClose(color, bandColor(0))).toBe(true);
});

test('resizing the window re-fits pages and keeps the current page in view', async ({ page }) => {
  await openFixture(page, 'long-300-pages.pdf');
  const reader = page.getByTestId('reader');
  await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');
  const widthBefore = (await pageSlot(page, 0).boundingBox())?.width ?? 0;

  // Bring page 50 to the top of the reader.
  await pageSlot(page, 49).evaluate((slot) => {
    const scroller = slot.closest('[data-testid="reader"]');
    if (scroller) scroller.scrollTop = (slot as HTMLElement).offsetTop;
  });
  await expect(pageSlot(page, 49)).toHaveAttribute('data-state', 'rendered');

  await page.setViewportSize({ width: 700, height: 720 });

  await expect
    .poll(async () => (await pageSlot(page, 49).boundingBox())?.width ?? 0)
    .toBeLessThan(widthBefore);
  const fitted = await reader.evaluate((el) => el.clientWidth - 48);
  await expect
    .poll(async () => Math.round((await pageSlot(page, 49).boundingBox())?.width ?? 0))
    .toBe(Math.round(fitted));
  await expect(pageSlot(page, 49)).toBeInViewport();
  await expect(pageSlot(page, 49)).toHaveAttribute('data-state', 'rendered');
});

test('making the window taller draws the newly visible pages without scrolling', async ({
  page,
}) => {
  await page.setViewportSize({ width: 600, height: 400 });
  await openFixture(page, 'long-300-pages.pdf');
  await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');

  await page.setViewportSize({ width: 600, height: 2000 });

  await expect(pageSlot(page, 2)).toBeInViewport();
  await expect(pageSlot(page, 2)).toHaveAttribute('data-state', 'rendered');
});

test('after opening a book, the keyboard scrolls it without clicking first', async ({ page }) => {
  await openFixture(page, 'long-300-pages.pdf');
  const reader = page.getByTestId('reader');
  await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');
  await expect(reader).toBeFocused();

  await page.keyboard.press('PageDown');
  await expect.poll(() => reader.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
});

test('the gap above page 1 stays visible after the book finishes loading', async ({ page }) => {
  await openFixture(page, 'long-300-pages.pdf');
  const reader = page.getByTestId('reader');
  await expect(reader).toHaveAttribute('data-layout', 'measured');
  expect(await reader.evaluate((el) => el.scrollTop)).toBe(0);
  const gap = await pageSlot(page, 0).evaluate(
    (slot) =>
      slot.getBoundingClientRect().top -
      (slot.closest('[data-testid="reader"]')?.getBoundingClientRect().top ?? 0),
  );
  expect(gap).toBeGreaterThan(10);
});

test(
  'opening a book records timing marks for profiling and benchmarks',
  { tag: '@any-engine' },
  async ({ page }) => {
    await openFixture(page, 'basic-3-pages.pdf');
    await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');
    const marks = await page.evaluate(() =>
      performance
        .getEntriesByType('mark')
        .map((m) => ({ name: m.name, at: m.startTime, detail: (m as PerformanceMark).detail })),
    );
    const start = marks.find((m) => m.name === 'book:open-start');
    const opened = marks.find((m) => m.name === 'book:opened');
    const firstPage = marks.find(
      (m) => m.name === 'page:rendered' && (m.detail as { pageIndex?: number })?.pageIndex === 0,
    );
    if (!start) throw new Error('missing book:open-start mark');
    if (!opened) throw new Error('missing book:opened mark');
    if (!firstPage) throw new Error('missing page:rendered mark for page 1');
    expect(start.at).toBeLessThanOrEqual(opened.at);
    expect(opened.at).toBeLessThanOrEqual(firstPage.at);
  },
);

test('when more than 8 pages fit on screen, every visible page is drawn', async ({ page }) => {
  // About 13 strip pages fit in a 1200px-tall window.
  await page.setViewportSize({ width: 1280, height: 1200 });
  await openFixture(page, 'strips-40-pages.pdf');
  const reader = page.getByTestId('reader');
  await expect(reader).toHaveAttribute('data-layout', 'measured');
  await expect
    .poll(() =>
      reader.evaluate((scroller) => {
        const view = scroller.getBoundingClientRect();
        const visible = [...scroller.querySelectorAll<HTMLElement>('[data-page-index]')].filter(
          (slot) => {
            const r = slot.getBoundingClientRect();
            return r.bottom > view.top && r.top < view.bottom;
          },
        );
        const drawn = visible.filter((slot) => slot.dataset.state === 'rendered').length;
        return { visible: visible.length > 8, allDrawn: drawn === visible.length };
      }),
    )
    .toEqual({ visible: true, allDrawn: true });
});
