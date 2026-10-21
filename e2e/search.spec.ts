// Phase 13: search inside the open book.
import { expect, test, type Page } from '@playwright/test';
import { importBook } from './helpers';

function results(page: Page) {
  return page.getByRole('list', { name: 'Search results' }).getByRole('button');
}

async function searchFor(page: Page, query: string) {
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search in book' }).fill(query);
}

/** Whether a box is inside the reader's visible area. */
async function inView(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((sel) => {
    const box = document.querySelector(sel)?.getBoundingClientRect();
    const view = document.querySelector('[data-testid="reader"]')?.getBoundingClientRect();
    if (!box || !view) return false;
    return box.top >= view.top && box.bottom <= view.bottom && box.width > 0;
  }, selector);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await importBook(page, 'text-4-pages.pdf');
});

test('searching a word lists every match, on every page it appears on', async ({ page }) => {
  await searchFor(page, 'PAGE');
  await expect(page.getByRole('status').filter({ hasText: 'matches' })).toHaveText(
    '8 matches on 4 pages',
  );
  // Each result starts with its page, "p. 1" (phase 20, the design's SearchResult).
  const pages = (
    await results(page).locator('.br-result__meta > span:first-child').allInnerTexts()
  ).map((t) => t.trim().replace(/^p\. /, 'Page '));
  expect(pages).toEqual([
    'Page 1',
    'Page 1',
    'Page 2',
    'Page 2',
    'Page 2',
    'Page 3',
    'Page 4',
    'Page 4',
  ]);
  await expect(results(page).nth(6).locator('mark')).toHaveText('page');
  await expect(results(page).nth(6)).toContainText('Hotel eight: and page four');
});

test('choosing a result jumps to it and marks the match on the page', async ({ page }) => {
  await searchFor(page, 'last page');
  await expect(results(page)).toHaveCount(1);
  await results(page).first().click();
  const current = '[data-page-index="3"] .search-hit.current';
  await expect(page.locator(current)).toHaveCount(1);
  await expect.poll(() => inView(page, current)).toBe(true);
  // The box sits on the matched words of the text layer.
  const [hit, words] = await page.evaluate(() => {
    const box = document
      .querySelector('[data-page-index="3"] .search-hit.current')
      ?.getBoundingClientRect();
    const span = [...document.querySelectorAll('[data-page-index="3"] .textLayer span')].find((s) =>
      s.textContent?.includes('last page'),
    );
    const node = span?.firstChild;
    const range = document.createRange();
    if (node instanceof Text) {
      const at = node.data.indexOf('last page');
      range.setStart(node, at);
      range.setEnd(node, at + 'last page'.length);
    }
    const r = range.getBoundingClientRect();
    return [
      box && { left: box.left, right: box.right, top: box.top, bottom: box.bottom },
      { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
    ];
  });
  expect(hit).toBeTruthy();
  for (const side of ['left', 'right', 'top', 'bottom'] as const) {
    expect(Math.abs((hit?.[side] ?? 0) - words[side]), side).toBeLessThanOrEqual(2);
  }
});

test('next and previous step through the matches, and Enter goes to the next one', async ({
  page,
}) => {
  await searchFor(page, 'page');
  await expect(results(page)).toHaveCount(8);
  await page.getByRole('button', { name: 'Next match' }).click();
  await expect(page.getByText('1 of 8')).toBeVisible();
  await page.getByRole('button', { name: 'Previous match' }).click();
  await expect(page.getByText('8 of 8')).toBeVisible();
  await expect(page.locator('[data-page-index="3"] .search-hit.current')).toHaveCount(1);
  await page.getByRole('searchbox', { name: 'Search in book' }).press('Enter');
  await expect(page.getByText('1 of 8')).toBeVisible();
  await expect(page.locator('[data-page-index="0"] .search-hit.current')).toHaveCount(1);
});

test('Cmd or Ctrl+F opens the search with the cursor in the box; no match says so', async ({
  page,
}) => {
  await page.getByTestId('reader').focus();
  await page.keyboard.press('ControlOrMeta+f');
  const box = page.getByRole('searchbox', { name: 'Search in book' });
  await expect(box).toBeFocused();
  await box.fill('zebra crossing');
  await expect(page.getByText('No matches.')).toBeVisible();
  await box.fill('');
  await expect(page.locator('.search-hit')).toHaveCount(0);
});
