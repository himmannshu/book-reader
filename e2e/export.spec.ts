// Phase 12: export a book's highlights and notes to a Markdown file.
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { importBook } from './helpers';

declare global {
  interface Window {
    selectWords(pageIndex: number, text: string): void;
  }
}

async function highlightWords(page: Page, pageIndex: number, text: string) {
  await expect(
    page.locator(`[data-page-index="${pageIndex}"] .textLayer span`, { hasText: text }),
  ).toHaveCount(1);
  await page.evaluate(
    ({ pageIndex, text }) => {
      const spans = document.querySelectorAll(`[data-page-index="${pageIndex}"] .textLayer span`);
      for (const span of spans) {
        const node = span.firstChild;
        const at = node instanceof Text ? node.data.indexOf(text) : -1;
        if (!node || at < 0) continue;
        const range = document.createRange();
        range.setStart(node, at);
        range.setEnd(node, at + text.length);
        const selection = document.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        return;
      }
      throw new Error(`no text ${text}`);
    },
    { pageIndex, text },
  );
  const before = await page.locator('.highlight-box').count();
  await page.getByRole('button', { name: 'Highlight', exact: true }).click();
  await expect.poll(() => page.locator('.highlight-box').count()).toBeGreaterThan(before);
}

test('a book’s highlights and notes download as a Markdown file in book order', async ({
  page,
}) => {
  await page.goto('/');
  await importBook(page, 'text-4-pages.pdf');
  await highlightWords(page, 0, 'Charlie three');

  // A note on the highlight, and one on the page.
  const box = await page.locator('.highlight-box').first().boundingBox();
  if (!box) throw new Error('no highlight box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.getByRole('button', { name: 'Add note' }).click();
  await page.getByLabel('Note text').fill('A thought about Charlie.');
  await page.getByRole('button', { name: 'Save note' }).click();
  await page.getByRole('button', { name: 'Add note to this page' }).click();
  await page.getByLabel('Note text').fill('About the whole first page.');
  await page.getByRole('button', { name: 'Save note' }).click();
  await expect(page.getByRole('list', { name: 'Book notes' }).getByRole('listitem')).toHaveCount(2);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export highlights and notes' }).click(),
  ]);
  // Playwright's WebKit build turns spaces in download names into underscores; Safari keeps them.
  expect(download.suggestedFilename().replace(/_/g, ' ')).toBe(
    'text-4-pages - highlights and notes.md',
  );
  const path = await download.path();
  const markdown = await readFile(path, 'utf8');
  expect(markdown).toMatch(/^# text-4-pages\n/);
  expect(markdown).toContain(': 1 highlight, 2 notes.');
  const pageNote = markdown.indexOf('**Page note:** About the whole first page.');
  const quote = markdown.indexOf('> Charlie three');
  const note = markdown.indexOf('**Note:** A thought about Charlie.');
  expect(markdown.indexOf('### Page 1')).toBeGreaterThan(0);
  expect(pageNote).toBeGreaterThan(markdown.indexOf('### Page 1'));
  expect(quote).toBeGreaterThan(pageNote);
  expect(note).toBeGreaterThan(quote);
});

test('export is unavailable until the book is saved, and says why', async ({ page }) => {
  await page.goto('/');
  // Saving the book is slowed down, so the reader shows before it has a stored id.
  await page.addInitScript(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: Parameters<typeof original>) {
      if (this.name === 'bookFiles') throw new DOMException('slow', 'UnknownError');
      return Reflect.apply(original, this, args);
    };
  });
  await page.reload();
  await page.getByLabel('Open PDF').setInputFiles('tests/fixtures/text-4-pages.pdf');
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Notes' }).click();
  await expect(page.getByRole('button', { name: 'Export highlights and notes' })).toBeDisabled();
  await expect(page.getByText('Export works once the book is saved on this device.')).toBeVisible();
});
