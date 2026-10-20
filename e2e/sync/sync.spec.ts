import { expect, test as base, type BrowserContext, type Page } from '@playwright/test';
import { expectPageAtTop, importBook, openFixture, pageSlot } from '../helpers';

/**
 * `device()` opens a device: its own browser context (so its own IndexedDB), signed in as this
 * test's user, so tests never see each other's data on the shared local server. Every device is
 * closed after the test; contexts left open keep rendering and syncing and slow WebKit down.
 */
const test = base.extend<{ device: () => Promise<Page> }>({
  device: async ({ browser, baseURL }, provide, testInfo) => {
    const user = `t-${testInfo.testId}-${testInfo.project.name}@localhost`;
    const contexts: BrowserContext[] = [];
    await provide(async () => {
      const context = await browser.newContext({
        baseURL,
        extraHTTPHeaders: { 'x-dev-user': user },
      });
      contexts.push(context);
      const page = await context.newPage();
      await page.goto('/');
      return page;
    });
    await Promise.all(contexts.map((context) => context.close()));
  },
});

const BOOK = 'basic-3-pages.pdf';
/** Has a text layer, for highlights. */
const TEXT_BOOK = 'text-4-pages.pdf';
const TITLE = 'basic-3-pages';

const status = (page: Page) => page.getByTestId('sync-status');

/**
 * Presses Sync now and waits for a sync request sent after the click, then for Synced. A request
 * already in flight (for example from the sync scheduled after an edit) may predate the latest
 * change; the app then runs once more, and that later request is the one to wait for.
 */
async function syncNow(page: Page) {
  const button = page.getByRole('button', { name: /^(Sync now|Retry)$/ });
  await expect(button).toBeEnabled();
  const sent = page.waitForRequest((r) => r.url().endsWith('/api/sync') && r.method() === 'POST');
  await button.click();
  const response = await (await sent).response();
  expect(response?.status()).toBe(200);
  await expect(status(page)).toHaveText('Synced');
}

const library = (page: Page) => page.getByRole('list', { name: 'Your books' });
const libraryItem = (page: Page, title = TITLE) =>
  library(page).getByRole('listitem').filter({ hasText: title });

async function openFromLibrary(page: Page, title = TITLE) {
  await libraryItem(page, title).getByRole('button', { name: title, exact: true }).click();
  await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');
}

async function backToLibrary(page: Page) {
  await page.getByRole('button', { name: 'Library', exact: true }).click();
}

const bookmarksPanel = (page: Page) => page.getByRole('navigation', { name: 'Bookmarks' });
const bookmarkToggle = (page: Page) =>
  page.getByRole('button', { name: 'Bookmark page', exact: true });

async function bookmarkPage(page: Page, index: number) {
  await pageSlot(page, index).evaluate((slot: HTMLElement) => {
    const reader = slot.closest('[data-testid="reader"]');
    if (reader) reader.scrollTop = slot.offsetTop;
  });
  await expectPageAtTop(page, index);
  await expect(bookmarkToggle(page)).toHaveAttribute('aria-pressed', 'false');
  await bookmarkToggle(page).click();
  await expect(bookmarkToggle(page)).toHaveAttribute('aria-pressed', 'true');
}

async function bookmarkLabels(page: Page): Promise<string[]> {
  if ((await bookmarksPanel(page).count()) === 0)
    await page.getByRole('button', { name: 'Bookmarks', exact: true }).click();
  await expect(bookmarksPanel(page)).toBeVisible();
  return bookmarksPanel(page).locator('.bookmark-jump').allTextContents();
}

const notesPanel = (page: Page) => page.getByRole('navigation', { name: 'Notes' });
const noteEditor = (page: Page) => page.getByRole('textbox', { name: 'Note text' });

async function openNotes(page: Page) {
  if ((await notesPanel(page).count()) === 0)
    await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await expect(notesPanel(page)).toBeVisible();
}

/** Writes (or rewrites) the note for the page at the top. */
async function pageNote(page: Page, text: string) {
  await openNotes(page);
  await page.getByRole('button', { name: 'Add note to this page', exact: true }).click();
  await noteEditor(page).fill(text);
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(noteEditor(page)).toHaveCount(0);
}

async function noteTexts(page: Page): Promise<string[]> {
  await openNotes(page);
  return notesPanel(page).locator('.note-text').allTextContents();
}

/** Highlights the first line containing `text` on page 1 (as the notes tests do). */
async function highlightText(page: Page, text: string) {
  const start = page.locator('[data-page-index="0"] .textLayer span', { hasText: text });
  await expect(start).toHaveCount(1);
  const before = await page.locator('.highlight-box').count();
  await start.evaluate((element) => {
    const range = document.createRange();
    range.setStart(element, 0);
    range.setEnd(element, element.childNodes.length);
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(range);
  });
  await page.getByRole('button', { name: 'Highlight', exact: true }).click();
  await expect.poll(() => page.locator('.highlight-box').count()).toBeGreaterThan(before);
}

test('bookmarks, highlights and notes made on one device appear on another that has the same book', async ({
  device,
}) => {
  const a = await device();
  const b = await device();
  await importBook(a, TEXT_BOOK);
  await importBook(b, TEXT_BOOK);

  await highlightText(a, 'Bravo two');
  await pageNote(a, 'Written on the Mac');
  await bookmarkPage(a, 1);
  await syncNow(a);
  await syncNow(b);

  await expect.poll(() => bookmarkLabels(b)).toEqual(['Page 2']);
  await expect.poll(() => noteTexts(b)).toEqual(['Written on the Mac']);
  await expect.poll(() => b.locator('.highlight-box').count()).toBeGreaterThan(0);
});

test('a book added on one device is listed on the other, and importing it brings its annotations', async ({
  device,
}) => {
  const a = await device();
  await importBook(a, BOOK);
  await bookmarkPage(a, 2);
  await syncNow(a);

  const b = await device();
  await syncNow(b);
  await expect(libraryItem(b)).toContainText(
    'On your other devices: open its PDF here to read it.',
  );
  await expect(libraryItem(b).getByRole('button', { name: TITLE, exact: true })).toHaveCount(0);

  await importBook(b, BOOK);
  await expect.poll(() => bookmarkLabels(b)).toEqual(['Page 3']);
  await backToLibrary(b);
  await expect(libraryItem(b).getByRole('button', { name: TITLE, exact: true })).toBeVisible();
});

test('when both devices change the same note, the later change wins on both', async ({
  device,
}) => {
  const a = await device();
  const b = await device();
  await importBook(a, BOOK);
  await importBook(b, BOOK);

  await pageNote(a, 'Earlier, from A');
  await pageNote(b, 'Later, from B');
  // The later change reaches the server first; the earlier one, arriving afterwards, must lose.
  await syncNow(b);
  await syncNow(a);
  await syncNow(b);

  await expect.poll(() => noteTexts(a)).toEqual(['Later, from B']);
  await expect.poll(() => noteTexts(b)).toEqual(['Later, from B']);
});

test('deleting a bookmark on one device removes it on the other, for good', async ({ device }) => {
  const a = await device();
  const b = await device();
  await importBook(a, BOOK);
  await importBook(b, BOOK);
  await bookmarkPage(a, 1);
  await syncNow(a);
  await syncNow(b);
  await expect.poll(() => bookmarkLabels(b)).toEqual(['Page 2']);

  await bookmarkToggle(a).click(); // un-bookmark page 2
  await expect(bookmarkToggle(a)).toHaveAttribute('aria-pressed', 'false');
  await syncNow(a);
  await syncNow(b);
  await syncNow(a);
  await expect.poll(() => bookmarkLabels(b)).toEqual([]);
  await expect.poll(() => bookmarkLabels(a)).toEqual([]);
});

test('"Remove from this device" keeps the book elsewhere; "Delete everywhere" removes it everywhere', async ({
  device,
}) => {
  const a = await device();
  const b = await device();
  await importBook(a, BOOK);
  await importBook(b, BOOK);
  await bookmarkPage(a, 1);
  await syncNow(a);
  await syncNow(b);

  await backToLibrary(a);
  await libraryItem(a)
    .getByRole('button', { name: `Remove ${TITLE}` })
    .click();
  await libraryItem(a).getByRole('button', { name: 'Remove from this device' }).click();
  await expect(libraryItem(a)).toContainText('On your other devices');
  await syncNow(a);
  await backToLibrary(b);
  await syncNow(b);
  await openFromLibrary(b);
  await expect.poll(() => bookmarkLabels(b)).toEqual(['Page 2']);

  await backToLibrary(b);
  await libraryItem(b)
    .getByRole('button', { name: `Remove ${TITLE}` })
    .click();
  await libraryItem(b).getByRole('button', { name: 'Delete everywhere' }).click();
  await expect(b.getByText('No books yet. Open a PDF to start.')).toBeVisible();
  await syncNow(b);
  await syncNow(a);
  await expect(a.getByText('No books yet. Open a PDF to start.')).toBeVisible();
});

test('changes made offline are kept and sync when the device is back online', async ({
  device,
}) => {
  const a = await device();
  const b = await device();
  await importBook(a, BOOK);
  await importBook(b, BOOK);
  await syncNow(a);

  await a.context().setOffline(true);
  await bookmarkPage(a, 2);
  await a.getByRole('button', { name: /^(Sync now|Retry)$/ }).click();
  await expect(status(a)).toHaveText('Offline: changes will sync when you are back online');
  // Let the sync scheduled after the edit (2 s) happen while still offline, so only coming back
  // online can trigger the next one.
  await a.waitForTimeout(2_500);
  await expect(status(a)).toHaveText('Offline: changes will sync when you are back online');

  // Coming back online syncs on its own.
  const synced = a.waitForResponse((r) => r.url().endsWith('/api/sync') && r.ok());
  await a.context().setOffline(false);
  await synced;
  await expect(status(a)).toHaveText('Synced');

  await syncNow(b);
  await expect.poll(() => bookmarkLabels(b)).toEqual(['Page 3']);
});

test('reading a book never waits for sync', async ({ device }) => {
  const a = await device();
  // Hold every sync request; opening and drawing a book must not depend on it.
  await a.route('**/api/sync', () => new Promise(() => {}));
  await openFixture(a, BOOK);
  await expect(pageSlot(a, 0)).toHaveAttribute('data-state', 'rendered');
});
