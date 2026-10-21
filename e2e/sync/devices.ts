// Shared by the two-device suites: one browser context per device, signed in as the test's user.
import { expect, test as base, type BrowserContext, type Page } from '@playwright/test';
import { expectPageAtTop, openPanel, pageSlot } from '../helpers';

/**
 * `device()` opens a device: its own browser context (so its own IndexedDB), signed in as this
 * test's user, so tests never see each other's data on the shared local server. Every device is
 * closed after the test; contexts left open keep rendering and syncing and slow WebKit down.
 */
export const test = base.extend<{
  device: (options?: { headers?: Record<string, string> }) => Promise<Page>;
}>({
  device: async ({ browser, baseURL }, provide, testInfo) => {
    const user = `t-${testInfo.testId}-${testInfo.project.name}@localhost`;
    const contexts: BrowserContext[] = [];
    await provide(async (options = {}) => {
      const context = await browser.newContext({
        baseURL,
        extraHTTPHeaders: { 'x-dev-user': user, ...options.headers },
      });
      contexts.push(context);
      const page = await context.newPage();
      await page.goto('/');
      return page;
    });
    await Promise.all(contexts.map((context) => context.close()));
  },
});

export const BOOK = 'basic-3-pages.pdf';
/** Has a text layer, for highlights. */
export const TEXT_BOOK = 'text-4-pages.pdf';
export const TITLE = 'basic-3-pages';

export const status = (page: Page) => page.getByTestId('sync-status');

/**
 * Presses Sync now and waits for a sync request sent after the click, then for Synced. A request
 * already in flight (for example from the sync scheduled after an edit) may predate the latest
 * change; the app then runs once more, and that later request is the one to wait for.
 */
export async function syncNow(page: Page) {
  const button = page.getByRole('button', { name: /^(Sync now|Retry)$/ });
  const inLibrary = await button.isVisible();
  if (inLibrary) await expect(button).toBeEnabled();
  const sent = page.waitForRequest((r) => r.url().endsWith('/api/sync') && r.method() === 'POST');
  if (inLibrary) await button.click();
  else await requestSync(page);
  const response = await (await sent).response();
  expect(response?.status()).toBe(200);
  await expect(status(page)).toHaveText('Synced');
}

/**
 * Asks for a sync while reading. The reader has no Sync now button (phase 19), so this fires the
 * event the app syncs on when the device comes back online.
 */
export async function requestSync(page: Page) {
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
}

export const library = (page: Page) => page.getByRole('list', { name: 'Your books' });
export const libraryItem = (page: Page, title = TITLE) =>
  library(page).getByRole('listitem').filter({ hasText: title });

export async function openFromLibrary(page: Page, title = TITLE) {
  await libraryItem(page, title).getByRole('button', { name: title, exact: true }).click();
  await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');
}

export async function backToLibrary(page: Page) {
  await page.getByRole('button', { name: 'Library', exact: true }).click();
}

export const bookmarksPanel = (page: Page) => page.getByRole('navigation', { name: 'Bookmarks' });
// The toggle's name says its state (phase 19): 'Remove bookmark' while the page is bookmarked.
export const bookmarkToggle = (page: Page) =>
  page.getByRole('button', { name: /^(Bookmark this page|Remove bookmark)$/ });

export async function bookmarkPage(page: Page, index: number) {
  await pageSlot(page, index).evaluate((slot: HTMLElement) => {
    const reader = slot.closest('[data-testid="reader"]');
    if (reader) reader.scrollTop = slot.offsetTop;
  });
  await expectPageAtTop(page, index);
  await expect(bookmarkToggle(page)).toHaveAccessibleName('Bookmark this page');
  await bookmarkToggle(page).click();
  await expect(bookmarkToggle(page)).toHaveAccessibleName('Remove bookmark');
}

export async function bookmarkLabels(page: Page): Promise<string[]> {
  if ((await bookmarksPanel(page).count()) === 0) await openPanel(page, 'Bookmarks');
  await expect(bookmarksPanel(page)).toBeVisible();
  return bookmarksPanel(page).locator('.bookmark-jump').allTextContents();
}

export const notesPanel = (page: Page) => page.getByRole('navigation', { name: 'Notes' });
export const noteEditor = (page: Page) => page.getByRole('textbox', { name: 'Note text' });

export async function openNotes(page: Page) {
  if ((await notesPanel(page).count()) === 0) await openPanel(page, 'Notes');
  await expect(notesPanel(page)).toBeVisible();
}

/** Writes (or rewrites) the note for the page at the top. */
export async function pageNote(page: Page, text: string) {
  await openNotes(page);
  await page.getByRole('button', { name: 'Add note to this page', exact: true }).click();
  await noteEditor(page).fill(text);
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(noteEditor(page)).toHaveCount(0);
}

export async function noteTexts(page: Page): Promise<string[]> {
  await openNotes(page);
  return notesPanel(page).locator('.note-text').allTextContents();
}

/** Highlights the first line containing `text` on page 1 (as the notes tests do). */
export async function highlightText(page: Page, text: string) {
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
  await page.getByRole('radio', { name: 'Yellow', exact: true }).click();
  await expect.poll(() => page.locator('.highlight-box').count()).toBeGreaterThan(before);
}
