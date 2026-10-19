import { expect, test, type Page } from '@playwright/test';
import { importBook, pageSlot } from './helpers';

async function reopen(page: Page) {
  await page.reload();
  await page.getByRole('button', { name: 'text-4-pages', exact: true }).click();
  await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await importBook(page, 'text-4-pages.pdf');
});

test('page notes save multiline text and survive reopening', async ({ page }) => {
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await page.getByRole('button', { name: 'Add note to this page', exact: true }).click();
  await page.getByRole('textbox', { name: 'Note text' }).fill('First thought\n第二行 📖');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Notes' })).toContainText('第二行 📖');
  await reopen(page);
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Notes' })).toContainText('第二行 📖');
});

test('an existing highlight accepts a passage note', async ({ page }) => {
  const span = page.locator('[data-page-index="0"] .textLayer span', { hasText: 'Bravo two' });
  await expect(span).toHaveCount(1);
  await span.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(range);
  });
  await page.getByRole('button', { name: 'Highlight', exact: true }).click();
  await expect(page.locator('.highlight-box')).toHaveCount(1);
  const box = await page.locator('.highlight-box').boundingBox();
  if (!box) throw new Error('No highlight');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.getByRole('button', { name: 'Add note', exact: true }).click();
  await page.getByRole('textbox', { name: 'Note text' }).fill('A passage thought');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Note text' })).toHaveCount(0);
  await expect(page.locator('.note-row')).toContainText('A passage thought');
  await reopen(page);
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Notes' })).toContainText('A passage thought');
  await expect(page.getByRole('navigation', { name: 'Notes' })).toContainText('Bravo two');
});
