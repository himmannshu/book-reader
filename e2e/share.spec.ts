// Phase 17: share a highlighted passage. The system share sheet and the clipboard are replaced
// by stand-ins that record what they were given.
import { expect, test, type Page } from '@playwright/test';
import { importBook } from './helpers';

declare global {
  interface Window {
    shared: { title?: string; text?: string }[];
    copied: string[];
  }
}

async function highlightAndChoose(page: Page, words: string) {
  await expect(
    page.locator('[data-page-index="0"] .textLayer span', { hasText: words }),
  ).toHaveCount(1);
  await page.evaluate((text) => {
    const span = [...document.querySelectorAll('[data-page-index="0"] .textLayer span')].find((s) =>
      s.textContent?.includes(text),
    );
    const node = span?.firstChild;
    if (!(node instanceof Text)) throw new Error('no text');
    const at = node.data.indexOf(text);
    const range = document.createRange();
    range.setStart(node, at);
    range.setEnd(node, at + text.length);
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(range);
  }, words);
  await page.getByRole('radio', { name: 'Yellow', exact: true }).click();
  await expect(page.locator('.highlight-box')).toHaveCount(1);
  const box = await page.locator('.highlight-box').first().boundingBox();
  if (!box) throw new Error('no highlight');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test('Share hands the passage, the book title and the page to the system share sheet', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.shared = [];
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: { title?: string; text?: string }) => {
        window.shared.push(data);
      },
    });
  });
  await page.goto('/');
  await importBook(page, 'text-4-pages.pdf');
  await highlightAndChoose(page, 'Charlie three');
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.shared))
    .toEqual([{ title: 'text-4-pages', text: '“Charlie three”\n— text-4-pages, page 1' }]);
});

test('without a share sheet, Share copies the passage and says so', async ({ page }) => {
  await page.addInitScript(() => {
    window.copied = [];
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => void window.copied.push(text) },
    });
  });
  await page.goto('/');
  await importBook(page, 'text-4-pages.pdf');
  await highlightAndChoose(page, 'Bravo two');
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Copied' })).toHaveText(
    'Copied the passage to the clipboard.',
  );
  expect(await page.evaluate(() => window.copied)).toEqual(['“Bravo two”\n— text-4-pages, page 1']);
});

test('closing the share sheet is not an error', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async () => {
        throw new DOMException('Share canceled', 'AbortError');
      },
    });
  });
  await page.goto('/');
  await importBook(page, 'text-4-pages.pdf');
  await highlightAndChoose(page, 'Delta four');
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  await page.waitForTimeout(300);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'Copied' })).toHaveCount(0);
});
