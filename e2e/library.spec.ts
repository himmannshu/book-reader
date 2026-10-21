import { expect, test, type Page } from '@playwright/test';
import { bandColor, bandColorOnCanvas, expectColorClose, importBook, pageSlot } from './helpers';

function library(page: Page) {
  return page.getByRole('list', { name: 'Your books' });
}

function bookItem(page: Page, title: string) {
  return library(page).getByRole('listitem').filter({ hasText: title });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('an imported book is listed after a reload and opens from the list', async ({ page }) => {
  await importBook(page, 'basic-3-pages.pdf');
  await page.reload();

  await expect(bookItem(page, 'basic-3-pages')).toHaveCount(1);
  await bookItem(page, 'basic-3-pages')
    .getByRole('button', { name: 'basic-3-pages', exact: true })
    .click();

  await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');
  const color = await bandColorOnCanvas(page, 0);
  expect(expectColorClose(color, bandColor(0)), `page 1 band color was ${color}`).toBe(true);
});

async function backToLibrary(page: Page) {
  await page.getByRole('button', { name: 'Library', exact: true }).click();
}

/** Counts entries in both IndexedDB object stores, straight from the browser. */
async function storedCounts(page: Page): Promise<{ books: number; files: number }> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('book-reader');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const count = (name: string) =>
      new Promise<number>((resolve, reject) => {
        const request = db.transaction(name).objectStore(name).count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    const result = { books: await count('books'), files: await count('bookFiles') };
    db.close();
    return result;
  });
}

test('removing a book asks first, then deletes it for good', async ({ page }) => {
  await importBook(page, 'basic-3-pages.pdf');
  await backToLibrary(page);

  // Cancelling keeps the book.
  await bookItem(page, 'basic-3-pages')
    .getByRole('button', { name: 'More for basic-3-pages' })
    .click();
  await page.getByRole('menuitem', { name: 'Delete everywhere' }).click();
  await bookItem(page, 'basic-3-pages').getByRole('button', { name: 'Cancel' }).click();
  await expect(bookItem(page, 'basic-3-pages')).toHaveCount(1);

  await bookItem(page, 'basic-3-pages')
    .getByRole('button', { name: 'More for basic-3-pages' })
    .click();
  await page.getByRole('menuitem', { name: 'Delete everywhere' }).click();
  await bookItem(page, 'basic-3-pages').getByRole('button', { name: 'Delete everywhere' }).click();
  await expect(page.getByRole('heading', { name: 'Your library is empty' })).toBeVisible();
  expect(await storedCounts(page)).toEqual({ books: 0, files: 0 });

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your library is empty' })).toBeVisible();
});

test('the list shows the most recently opened book first', async ({ page }) => {
  const titles = () => library(page).locator('.library-title').allTextContents();
  await importBook(page, 'basic-3-pages.pdf');
  await importBook(page, 'mixed-sizes.pdf');
  await backToLibrary(page);
  await expect.poll(titles).toEqual(['mixed-sizes', 'basic-3-pages']);

  await bookItem(page, 'basic-3-pages')
    .getByRole('button', { name: 'basic-3-pages', exact: true })
    .click();
  await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');
  await backToLibrary(page);
  await expect.poll(titles).toEqual(['basic-3-pages', 'mixed-sizes']);
});

test('the Library button closes the book and shows the list', async ({ page }) => {
  await importBook(page, 'basic-3-pages.pdf');
  await backToLibrary(page);
  await expect(library(page)).toBeVisible();
  await expect(page.locator('[data-page-index]')).toHaveCount(0);
  await expect(page.getByTestId('book-title')).toHaveCount(0);
});
