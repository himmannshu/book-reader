import { expect, test, type Page } from '@playwright/test';
import { bandColor, bandColorOnCanvas, expectColorClose, openFixture, pageSlot } from './helpers';

function library(page: Page) {
  return page.getByRole('list', { name: 'Your books' });
}

function bookItem(page: Page, title: string) {
  return library(page).getByRole('listitem').filter({ hasText: title });
}

/** Imports a fixture through the picker and waits until it is saved on the device. */
async function importBook(page: Page, file: string) {
  await openFixture(page, file);
  await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');
  await expect(page.getByRole('status')).toHaveText('Saved on this device.');
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
