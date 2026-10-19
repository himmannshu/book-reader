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

interface Node {
  title: string;
  children: Node[];
}

/** Reads the panel's nested lists back as a tree of titles. */
async function outlineTree(page: Page): Promise<Node[]> {
  return contents(page).evaluate((nav) => {
    const read = (list: Element | null): Node[] =>
      list
        ? [...list.children].map((li) => ({
            title: li.querySelector(':scope > button')?.textContent ?? '',
            children: read(li.querySelector(':scope > ul')),
          }))
        : [];
    return read(nav.querySelector(':scope > ul'));
  });
}

test('Contents lists the outline in order, with chapters nested in their parts', async ({
  page,
}) => {
  await openFixture(page, 'outline-12-pages.pdf');
  await page.getByRole('button', { name: 'Contents' }).click();
  await expect(entry(page, 'Appendix')).toBeVisible();
  expect(await outlineTree(page)).toEqual([
    {
      title: 'Part One',
      children: [
        { title: 'Chapter 1', children: [] },
        { title: 'Chapter 2', children: [] },
      ],
    },
    {
      title: 'Part Two',
      children: [
        { title: 'Chapter 3', children: [] },
        { title: 'Missing section', children: [] },
      ],
    },
    { title: 'Appendix', children: [] },
  ]);
});

test('an entry with a named destination jumps to the right page', async ({ page }) => {
  await openFixture(page, 'outline-12-pages.pdf');
  await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');
  await page.getByRole('button', { name: 'Contents' }).click();
  await entry(page, 'Chapter 3').click();
  await expectPageAtTop(page, 8);
});

test('an entry without a usable destination is disabled, without an error', async ({ page }) => {
  await openFixture(page, 'outline-12-pages.pdf');
  await page.getByRole('button', { name: 'Contents' }).click();
  await expect(entry(page, 'Missing section')).toBeDisabled();
  await expect(entry(page, 'Chapter 3')).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('a book without an outline says so', async ({ page }) => {
  await openFixture(page, 'basic-3-pages.pdf');
  await page.getByRole('button', { name: 'Contents' }).click();
  await expect(contents(page)).toContainText('This book has no table of contents.');
  await expect(contents(page).getByRole('button')).toHaveCount(0);
});

test('Contents works from the keyboard, and Escape returns focus to the button', async ({
  page,
}) => {
  await openFixture(page, 'outline-12-pages.pdf');
  await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');
  const button = page.getByRole('button', { name: 'Contents' });
  await button.focus();
  await page.keyboard.press('Enter');

  await expect(entry(page, 'Part One')).toBeFocused();
  // Arrow keys, because Safari's Tab skips buttons by default.
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(entry(page, 'Chapter 2')).toBeFocused();
  // Disabled entries are skipped; End goes to the last entry, Home back to the first.
  await page.keyboard.press('End');
  await expect(entry(page, 'Appendix')).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(entry(page, 'Chapter 3')).toBeFocused();
  await page.keyboard.press('Home');
  await expect(entry(page, 'Part One')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expectPageAtTop(page, 4);

  await page.keyboard.press('Escape');
  await expect(contents(page)).toHaveCount(0);
  await expect(button).toBeFocused();
  await expect(button).toHaveAttribute('aria-expanded', 'false');
});

test('in a narrow window the panel covers the pages and closes after a choice', async ({
  page,
}) => {
  await page.setViewportSize({ width: 600, height: 800 });
  await openFixture(page, 'outline-12-pages.pdf');
  await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');
  const reader = page.getByTestId('reader');
  const widthBefore = (await reader.boundingBox())?.width ?? 0;

  await page.getByRole('button', { name: 'Contents' }).click();
  await expect(entry(page, 'Chapter 3')).toBeVisible();
  const panel = await contents(page).boundingBox();
  const readerBox = await reader.boundingBox();
  // The reader keeps its full width; the panel sits on top of it.
  expect(readerBox?.width).toBe(widthBefore);
  expect(panel && readerBox && panel.x < readerBox.x + readerBox.width / 2).toBe(true);
  expect(panel && readerBox && panel.x + panel.width > readerBox.x).toBe(true);

  await entry(page, 'Chapter 3').click();
  await expect(contents(page)).toHaveCount(0);
  await expectPageAtTop(page, 8);
});
