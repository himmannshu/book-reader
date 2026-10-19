import { expect, test } from '@playwright/test';
import { bandColor, bandColorOnCanvas, expectColorClose, openFixture, pageSlot } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('opening a PDF draws its first page', async ({ page }) => {
  await openFixture(page, 'basic-3-pages.pdf');
  await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');
  const color = await bandColorOnCanvas(page, 0);
  expect(expectColorClose(color, bandColor(0)), `page 1 band color was ${color}`).toBe(true);
});
