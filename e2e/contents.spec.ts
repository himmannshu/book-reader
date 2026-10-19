import { expect, test, type Page } from '@playwright/test';
import { bandColor, bandColorOnCanvas, expectColorClose, openFixture, pageSlot } from './helpers';

function contents(page: Page) {
  return page.getByRole('navigation', { name: 'Table of contents' });
}

function entry(page: Page, title: string) {
  return contents(page).getByRole('button', { name: title, exact: true });
}

/** Distance in px from the top of the reader to the top of page `index`. */
async function offsetFromReaderTop(page: Page, index: number): Promise<number> {
  return pageSlot(page, index).evaluate((slot) => {
    const reader = slot.closest('[data-testid="reader"]');
    return slot.getBoundingClientRect().top - (reader?.getBoundingClientRect().top ?? 0);
  });
}

async function expectPageAtTop(page: Page, index: number) {
  await expect.poll(() => offsetFromReaderTop(page, index)).toBeLessThanOrEqual(2);
  expect(await offsetFromReaderTop(page, index)).toBeGreaterThanOrEqual(-2);
  await expect(pageSlot(page, index)).toHaveAttribute('data-state', 'rendered');
  const color = await bandColorOnCanvas(page, index);
  expect(expectColorClose(color, bandColor(index)), `page ${index + 1} color was ${color}`).toBe(
    true,
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('choosing a chapter in Contents brings its page to the top', async ({ page }) => {
  await openFixture(page, 'outline-12-pages.pdf');
  await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');

  await page.getByRole('button', { name: 'Contents' }).click();
  await entry(page, 'Chapter 2').click();

  await expectPageAtTop(page, 4);
});
