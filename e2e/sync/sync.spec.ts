import { expect } from '@playwright/test';
import { importBook, openFixture, pageSlot } from '../helpers';
import {
  test,
  BOOK,
  TEXT_BOOK,
  TITLE,
  status,
  syncNow,
  requestSync,
  libraryItem,
  openFromLibrary,
  backToLibrary,
  bookmarkToggle,
  bookmarkPage,
  bookmarkLabels,
  pageNote,
  noteTexts,
  highlightText,
} from './devices';

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
  // Phase 09b: with the files cloud set up (as in these tests), it can also be downloaded; see
  // files.spec.ts. Importing the same PDF still works and brings the annotations.
  await expect(libraryItem(b)).toContainText('On your other devices');

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
  await expect(bookmarkToggle(a)).toHaveAccessibleName('Bookmark this page');
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
  await requestSync(a);
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

test('reading a book never waits for sync', { tag: '@any-engine' }, async ({ device }) => {
  const a = await device();
  // Hold every sync request; opening and drawing a book must not depend on it.
  await a.route('**/api/sync', () => new Promise(() => {}));
  await openFixture(a, BOOK);
  await expect(pageSlot(a, 0)).toHaveAttribute('data-state', 'rendered');
});
