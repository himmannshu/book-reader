// Phase 11: the library shelf. Covers, reading progress, sort and filter.
import { expect, test, type Page } from '@playwright/test';
import { bandColor, expectColorClose, importBook, openFixture, pageSlot } from './helpers';

function shelf(page: Page) {
  return page.getByRole('list', { name: 'Your books' });
}

function bookItem(page: Page, title: string) {
  return shelf(page).getByRole('listitem').filter({ hasText: title });
}

async function backToLibrary(page: Page) {
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await expect(shelf(page)).toBeVisible();
}

/** The colour at the middle of the band near the top of a book's cover image. */
async function coverBandColor(page: Page, title: string): Promise<number[]> {
  const cover = bookItem(page, title).locator('img.cover');
  await expect(cover).toBeVisible();
  await expect
    .poll(() => cover.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  return cover.evaluate((img: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('no 2d context');
    context.drawImage(img, 0, 0);
    const pixel = context.getImageData(
      Math.floor(canvas.width / 2),
      Math.floor(canvas.height * 0.1),
      1,
      1,
    ).data;
    return [pixel[0] ?? -1, pixel[1] ?? -1, pixel[2] ?? -1];
  });
}

const titles = async (page: Page) =>
  shelf(page).getByRole('listitem').locator('.library-title').allInnerTexts();

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('a book read here gets a cover from its first page', async ({ page }) => {
  await importBook(page, 'basic-3-pages.pdf');
  await backToLibrary(page);
  const color = await coverBandColor(page, 'basic-3-pages');
  // JPEG is lossy, so allow a little more than for canvas pixels.
  expect(expectColorClose(color, bandColor(0), 12), `cover band ${color}`).toBe(true);
});

test('a book imported but never closed gets its cover in the background after a reload', async ({
  page,
}) => {
  await importBook(page, 'long-300-pages.pdf');
  await page.reload();
  await expect(bookItem(page, 'long-300-pages')).toHaveCount(1);
  const color = await coverBandColor(page, 'long-300-pages');
  expect(expectColorClose(color, bandColor(0), 12), `cover band ${color}`).toBe(true);
  // Still there after another reload: covers are kept.
  await page.reload();
  await expect(bookItem(page, 'long-300-pages').locator('img.cover')).toBeVisible();
});

test('a book only on other devices shows a placeholder cover with its title', async ({ page }) => {
  await importBook(page, 'basic-3-pages.pdf');
  await backToLibrary(page);
  await bookItem(page, 'basic-3-pages')
    .getByRole('button', { name: 'Remove basic-3-pages' })
    .click();
  await bookItem(page, 'basic-3-pages')
    .getByRole('button', { name: 'Remove from this device' })
    .click();
  // The cover drawn while it was here stays.
  await expect(bookItem(page, 'basic-3-pages').locator('img.cover')).toBeVisible();

  // A record that never had a file here (as if synced from another device).
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('book-reader');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction('books', 'readwrite');
    tx.objectStore('books').put({
      id: 'f'.repeat(64),
      fileName: 'Far Away.pdf',
      title: 'Far Away',
      byteSize: 1000,
      addedAt: 1,
      lastOpenedAt: 1,
    });
    await new Promise((resolve) => (tx.oncomplete = resolve));
    db.close();
  });
  await page.reload();
  const far = bookItem(page, 'Far Away');
  await expect(far.locator('.cover-placeholder')).toHaveText('Far Away');
  await expect(far.locator('img.cover')).toHaveCount(0);
});

test('each book shows its reading progress', async ({ page }) => {
  await importBook(page, 'long-300-pages.pdf');
  await backToLibrary(page);
  await expect(bookItem(page, 'long-300-pages').getByText('Not started')).toBeVisible();

  await bookItem(page, 'long-300-pages')
    .getByRole('button', { name: 'long-300-pages', exact: true })
    .click();
  await pageSlot(page, 150).evaluate((slot: HTMLElement) => {
    const reader = slot.closest<HTMLElement>('[data-testid="reader"]');
    if (reader) reader.scrollTop = slot.offsetTop;
  });
  await expect(pageSlot(page, 150)).toHaveAttribute('data-state', 'rendered');
  await backToLibrary(page);
  const item = bookItem(page, 'long-300-pages');
  await expect(item.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  await expect(item.getByText('Page 151 of 300 · 50%')).toBeVisible();
});

test('sort and filter change what the shelf shows, and the sort is remembered', async ({
  page,
}) => {
  for (const file of ['outline-12-pages.pdf', 'basic-3-pages.pdf', 'text-4-pages.pdf']) {
    await importBook(page, file);
  }
  await backToLibrary(page);
  // Recent first by default.
  await expect
    .poll(() => titles(page))
    .toEqual(['text-4-pages', 'basic-3-pages', 'outline-12-pages']);

  await page.getByRole('combobox', { name: 'Sort' }).selectOption({ label: 'Title' });
  await expect
    .poll(() => titles(page))
    .toEqual(['basic-3-pages', 'outline-12-pages', 'text-4-pages']);

  const filter = page.getByRole('searchbox', { name: 'Filter books' });
  await filter.fill('OUTLINE');
  await expect.poll(() => titles(page)).toEqual(['outline-12-pages']);
  await filter.fill('nothing like this');
  await expect(page.getByText('No books match “nothing like this”.')).toBeVisible();
  await filter.fill('');
  await expect.poll(() => titles(page)).toHaveLength(3);

  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Sort' })).toHaveValue('title');
  await expect
    .poll(() => titles(page))
    .toEqual(['basic-3-pages', 'outline-12-pages', 'text-4-pages']);
});

test('with 100 books the shelf shows within 1 s and filtering keeps up with typing', async ({
  page,
}) => {
  // Seed 100 books with covers and progress straight into IndexedDB (the app made the database).
  await expect(page.getByText('No books yet. Open a PDF to start.')).toBeVisible();
  await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 155;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('no 2d context');
    context.fillStyle = '#7a4f24';
    context.fillRect(0, 0, 120, 155);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg'));
    const bytes = await blob?.arrayBuffer();
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('book-reader');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction(['books', 'covers', 'readingState'], 'readwrite');
    for (let i = 0; i < 100; i++) {
      const id = i.toString(16).padStart(64, '0');
      tx.objectStore('books').put({
        id,
        fileName: `Book ${i}.pdf`,
        title: `Book ${i}`,
        byteSize: 1000,
        addedAt: i,
        lastOpenedAt: i,
      });
      tx.objectStore('covers').put({ bookId: id, bytes, type: 'image/jpeg' });
      tx.objectStore('readingState').put({
        bookId: id,
        position: { pageIndex: i, fraction: 0, pixelsAbove: 0 },
        zoom: 'fit-width',
        savedAt: i,
        pageCount: 100,
      });
    }
    await new Promise((resolve) => (tx.oncomplete = resolve));
    db.close();
  });

  await page.reload();
  const shownAt = await page.waitForFunction(
    () =>
      document.querySelectorAll('[aria-label="Your books"] > li').length === 100
        ? performance.now()
        : false,
    undefined,
    { polling: 'raf' },
  );
  expect(await shownAt.jsonValue()).toBeLessThan(1000);

  const filter = page.getByRole('searchbox', { name: 'Filter books' });
  await filter.evaluate((input: HTMLInputElement) => {
    input.addEventListener('input', () => {
      (window as unknown as { typedAt: number }).typedAt = performance.now();
    });
  });
  await filter.fill('book 42');
  const updated = await page.waitForFunction(
    () =>
      document.querySelectorAll('[aria-label="Your books"] > li').length === 1
        ? performance.now() - (window as unknown as { typedAt: number }).typedAt
        : false,
    undefined,
    { polling: 'raf' },
  );
  expect(await updated.jsonValue()).toBeLessThan(100);
  await expect(bookItem(page, 'Book 42').getByText('Page 43 of 100 · 43%')).toBeVisible();
});

/** How many covers are stored, straight from IndexedDB. */
async function storedCovers(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('book-reader');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const count = await new Promise<number>((resolve, reject) => {
      const request = db.transaction('covers').objectStore('covers').count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return count;
  });
}

test('no cover is drawn while a book is open, even when opening one book after another', async ({
  page,
}) => {
  await importBook(page, 'basic-3-pages.pdf');
  // Open the next book straight from the reader, as when importing several in a row.
  await openFixture(page, 'text-4-pages.pdf');
  await expect(page.getByRole('status')).toHaveText('Saved on this device.');
  await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');
  // Longer than the worker's idle delay: nothing may happen while reading.
  await page.waitForTimeout(2500);
  expect(await storedCovers(page)).toBe(0);

  await backToLibrary(page);
  await expect.poll(() => storedCovers(page), { timeout: 15_000 }).toBe(2);
  await expect(bookItem(page, 'basic-3-pages').locator('img.cover')).toBeVisible();
  await expect(bookItem(page, 'text-4-pages').locator('img.cover')).toBeVisible();
});
