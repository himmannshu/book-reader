import { expect, test, type Page } from '@playwright/test';
import { expectPageAtTop, importBook, pageSlot } from './helpers';

function panel(page: Page) {
  return page.getByRole('navigation', { name: 'Bookmarks' });
}

function panelButton(page: Page) {
  return page.getByRole('button', { name: 'Bookmarks', exact: true });
}

function toggle(page: Page) {
  return page.getByRole('button', { name: 'Bookmark page', exact: true });
}

function entry(page: Page, label: string) {
  return panel(page).getByRole('button', { name: label, exact: true });
}

/** The labels listed in the Bookmarks panel, top to bottom. */
async function listed(page: Page): Promise<string[]> {
  return panel(page).locator('.bookmark-jump').allTextContents();
}

/** Scrolls the reader so page `index` is at the top, as a reader scrolling by hand would. */
async function scrollToPage(page: Page, index: number) {
  await pageSlot(page, index).evaluate((slot: HTMLElement) => {
    const reader = slot.closest('[data-testid="reader"]');
    if (reader) reader.scrollTop = slot.offsetTop;
  });
  await expectPageAtTop(page, index);
}

/** Bookmarks page `index` (0-based) and waits until it is saved. */
async function bookmarkPage(page: Page, index: number) {
  await scrollToPage(page, index);
  await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false');
  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
}

async function openPanel(page: Page) {
  if ((await panel(page).count()) === 0) await panelButton(page).click();
  await expect(panel(page)).toBeVisible();
}

/** Reloads, then reopens the book from the Library. */
async function reloadAndReopen(page: Page, title: string) {
  await page.reload();
  await page
    .getByRole('list', { name: 'Your books' })
    .getByRole('button', { name: title, exact: true })
    .click();
  // The book reopens where it was left (phase 10), so wait for whichever page is shown.
  await expect(page.locator('[data-page-index][data-state="rendered"]').first()).toBeVisible();
  await expect(toggle(page)).toBeEnabled();
}

async function storedBookmarks(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('book-reader');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const count = await new Promise<number>((resolve, reject) => {
      const request = db.transaction('bookmarks').objectStore('bookmarks').count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return count;
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('bookmarking a page marks it and lists it with its chapter', async ({ page }) => {
  await importBook(page, 'outline-12-pages.pdf');
  await expect(toggle(page)).toBeEnabled();
  await bookmarkPage(page, 5);

  await openPanel(page);
  expect(await listed(page)).toEqual(['Page 6 · Chapter 2']);
});

test('the toggle follows the page in view', async ({ page }) => {
  await importBook(page, 'outline-12-pages.pdf');
  await bookmarkPage(page, 5);

  await scrollToPage(page, 2);
  await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false');
  await scrollToPage(page, 5);
  await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
});

test('choosing a bookmark brings its page to the top', async ({ page }) => {
  await importBook(page, 'outline-12-pages.pdf');
  await bookmarkPage(page, 9);
  await scrollToPage(page, 0);

  await openPanel(page);
  await entry(page, 'Page 10 · Chapter 3').click();
  await expectPageAtTop(page, 9);
  await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
});

test('bookmarks are listed in page order, whatever order they were added', async ({ page }) => {
  await importBook(page, 'outline-12-pages.pdf');
  await bookmarkPage(page, 8);
  await bookmarkPage(page, 1);
  await bookmarkPage(page, 11);
  await bookmarkPage(page, 4);

  await openPanel(page);
  expect(await listed(page)).toEqual([
    'Page 2 · Chapter 1',
    'Page 5 · Chapter 2',
    'Page 9 · Chapter 3',
    'Page 12 · Appendix',
  ]);
});

test('bookmarks are still listed, in page order, after a reload', async ({ page }) => {
  await importBook(page, 'outline-12-pages.pdf');
  // Stored ids sort as strings ("…:10" before "…:2"); the list must still be in page order.
  await bookmarkPage(page, 10);
  await bookmarkPage(page, 2);
  await bookmarkPage(page, 7);

  await reloadAndReopen(page, 'outline-12-pages');
  await openPanel(page);
  expect(await listed(page)).toEqual([
    'Page 3 · Chapter 1',
    'Page 8 · Part Two',
    'Page 11 · Chapter 3',
  ]);
  await entry(page, 'Page 8 · Part Two').click();
  await expectPageAtTop(page, 7);
});

test('a removed bookmark stays removed after a reload', async ({ page }) => {
  await importBook(page, 'outline-12-pages.pdf');
  await bookmarkPage(page, 1);
  await bookmarkPage(page, 4);
  await bookmarkPage(page, 8);

  // From the panel.
  await openPanel(page);
  await panel(page).getByRole('button', { name: 'Remove bookmark Page 5 · Chapter 2' }).click();
  await expect.poll(() => listed(page)).toEqual(['Page 2 · Chapter 1', 'Page 9 · Chapter 3']);
  // By un-toggling the page in view.
  await scrollToPage(page, 8);
  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => listed(page)).toEqual(['Page 2 · Chapter 1']);

  await reloadAndReopen(page, 'outline-12-pages');
  await openPanel(page);
  expect(await listed(page)).toEqual(['Page 2 · Chapter 1']);
});

test('removing a book deletes its bookmarks; importing it again starts with none', async ({
  page,
}) => {
  await importBook(page, 'outline-12-pages.pdf');
  await bookmarkPage(page, 3);
  expect(await storedBookmarks(page)).toBe(1);

  await page.getByRole('button', { name: 'Library', exact: true }).click();
  const item = page.getByRole('list', { name: 'Your books' }).getByRole('listitem');
  await item.getByRole('button', { name: 'Remove outline-12-pages' }).click();
  await item.getByRole('button', { name: 'Delete everywhere' }).click();
  await expect(page.getByText('No books yet. Open a PDF to start.')).toBeVisible();
  expect(await storedBookmarks(page)).toBe(0);

  await importBook(page, 'outline-12-pages.pdf');
  await expect(toggle(page)).toBeEnabled();
  await openPanel(page);
  await expect(panel(page)).toContainText('No bookmarks yet.');
});

test('a book without an outline names bookmarks by page alone', async ({ page }) => {
  await importBook(page, 'basic-3-pages.pdf');
  await expect(toggle(page)).toBeEnabled();
  await openPanel(page);
  await expect(panel(page)).toContainText('No bookmarks yet.');

  await bookmarkPage(page, 1);
  await expect.poll(() => listed(page)).toEqual(['Page 2']);
});

test('Bookmarks works from the keyboard, and Escape returns focus to the button', async ({
  page,
}) => {
  await importBook(page, 'outline-12-pages.pdf');
  await bookmarkPage(page, 1);
  await bookmarkPage(page, 8);
  await scrollToPage(page, 0);

  await panelButton(page).focus();
  await page.keyboard.press('Enter');
  await expect(entry(page, 'Page 2 · Chapter 1')).toBeFocused();
  // Arrow keys move through each entry and its Remove button, in order.
  await page.keyboard.press('ArrowDown');
  await expect(
    panel(page).getByRole('button', { name: 'Remove bookmark Page 2 · Chapter 1' }),
  ).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(entry(page, 'Page 9 · Chapter 3')).toBeFocused();
  await page.keyboard.press('Enter');
  await expectPageAtTop(page, 8);

  await page.keyboard.press('Escape');
  await expect(panel(page)).toHaveCount(0);
  await expect(panelButton(page)).toBeFocused();
  await expect(panelButton(page)).toHaveAttribute('aria-expanded', 'false');
});

test('removing a bookmark with the keyboard keeps focus in the list', async ({ page }) => {
  await importBook(page, 'outline-12-pages.pdf');
  await bookmarkPage(page, 1);
  await bookmarkPage(page, 8);

  await panelButton(page).focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter'); // Remove "Page 2 · Chapter 1"
  await expect(entry(page, 'Page 9 · Chapter 3')).toBeFocused();
  expect(await listed(page)).toEqual(['Page 9 · Chapter 3']);
});

test('only one side panel is open at a time', async ({ page }) => {
  await importBook(page, 'outline-12-pages.pdf');
  await page.getByRole('button', { name: 'Contents' }).click();
  await expect(page.getByRole('navigation', { name: 'Table of contents' })).toBeVisible();
  await panelButton(page).click();
  await expect(panel(page)).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Table of contents' })).toHaveCount(0);
});

test('in a narrow window the panel covers the pages and closes after a choice', async ({
  page,
}) => {
  await page.setViewportSize({ width: 600, height: 800 });
  await importBook(page, 'outline-12-pages.pdf');
  await bookmarkPage(page, 8);
  await scrollToPage(page, 0);
  const reader = page.getByTestId('reader');
  const widthBefore = (await reader.boundingBox())?.width ?? 0;

  await openPanel(page);
  const box = await panel(page).boundingBox();
  const readerBox = await reader.boundingBox();
  expect(readerBox?.width).toBe(widthBefore);
  expect(box && readerBox && box.x < readerBox.x + readerBox.width / 2).toBe(true);
  expect(box && readerBox && box.x + box.width > readerBox.x).toBe(true);

  await entry(page, 'Page 9 · Chapter 3').click();
  await expect(panel(page)).toHaveCount(0);
  await expectPageAtTop(page, 8);
});

test('with several whole pages on screen, the page at the top is the one bookmarked', async ({
  page,
}) => {
  // Two whole pages fit in the reader; page tops are fractional (review finding B1).
  await page.setViewportSize({ width: 420, height: 1150 });
  await importBook(page, 'outline-12-pages.pdf');
  for (const index of [2, 4, 7, 9]) await bookmarkPage(page, index);

  await openPanel(page);
  expect(await listed(page)).toEqual([
    'Page 3 · Chapter 1',
    'Page 5 · Chapter 2',
    'Page 8 · Part Two',
    'Page 10 · Chapter 3',
  ]);
});

test('with many thin pages on screen, a jump to a bookmark shows it as bookmarked', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await importBook(page, 'strips-40-pages.pdf');
  await bookmarkPage(page, 5);
  await bookmarkPage(page, 20);
  await scrollToPage(page, 0);

  await openPanel(page);
  expect(await listed(page)).toEqual(['Page 6', 'Page 21']);
  await entry(page, 'Page 21').click();
  await expectPageAtTop(page, 20);
  await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
});
