// Phase 09b: book files go to the cloud (local R2) and open on other devices without importing.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';
import { expectPageAtTop, fixturePath, importBook, pageSlot } from '../helpers';
import { bigPdf } from './big-pdf';
import {
  backToLibrary,
  BOOK,
  bookmarkLabels,
  bookmarkPage,
  highlightText,
  libraryItem,
  syncNow,
  test,
  TEXT_BOOK,
  TITLE,
} from './devices';

const TEXT_TITLE = 'text-4-pages';
const idOf = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');

/**
 * Syncs, then waits until the cloud has the book `id`. Asks the server rather than waiting for
 * one particular upload request: the sync scheduled after an import may already have uploaded it.
 */
async function syncAndUpload(page: Page, id: string) {
  await syncNow(page);
  await expect
    .poll(async () => (await page.request.head(`/api/files/${id}`)).status(), { timeout: 30_000 })
    .toBe(200);
  await expect(page.getByTestId('upload-status')).toHaveText('');
}

const errorAlert = (page: Page) => page.getByRole('alert');

/** Clicks a book that is only on other devices and waits for it to open. */
async function downloadAndOpen(page: Page, title: string) {
  await libraryItem(page, title).getByRole('button', { name: title, exact: true }).click();
  await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');
}

test('a book imported on one device opens on another without importing it, with its annotations', async ({
  device,
}) => {
  const a = await device();
  await importBook(a, TEXT_BOOK);
  await highlightText(a, 'Bravo two');
  await bookmarkPage(a, 1);
  await syncAndUpload(a, idOf(fixturePath(TEXT_BOOK)));

  const b = await device();
  await syncNow(b);
  await expect(libraryItem(b, TEXT_TITLE)).toContainText('downloads when you open it');
  await downloadAndOpen(b, TEXT_TITLE);
  await expect.poll(() => bookmarkLabels(b)).toEqual(['Page 2']);
  await expect.poll(() => b.locator('.highlight-box').count()).toBeGreaterThan(0);

  // It stays on B: after a reload it opens like any local book, with no download.
  await b.reload();
  await expect(libraryItem(b, TEXT_TITLE)).not.toContainText('On your other devices');
  const downloads: string[] = [];
  b.on('request', (r) => {
    if (r.url().includes('/api/files/') && r.method() === 'GET') downloads.push(r.url());
  });
  await downloadAndOpen(b, TEXT_TITLE);
  expect(downloads).toEqual([]);
});

test('a book bigger than one part uploads in parts and arrives intact, with progress', async ({
  device,
}) => {
  const big = await bigPdf(20);
  const a = await device();
  const parts: string[] = [];
  a.on('request', (r) => {
    if (r.method() === 'PUT' && r.url().includes('/api/files/')) parts.push(r.url());
  });
  await a.getByLabel('Open PDF').setInputFiles(big.path);
  await expect(pageSlot(a, 0)).toHaveAttribute('data-state', 'rendered');
  await syncAndUpload(a, big.id);
  expect(parts.map((url) => url.split('/').at(-1))).toEqual(['1', '2', '3']);

  const b = await device();
  await syncNow(b);
  const ranges: string[] = [];
  b.on('request', (r) => {
    if (r.method() === 'GET' && r.url().includes(`/api/files/${big.id}`)) {
      ranges.push(r.headers()['range'] ?? '');
    }
  });
  // Slow each range down a little, so the progress can be seen.
  await b.route(`**/api/files/${big.id}`, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.continue();
  });
  await libraryItem(b, big.title).getByRole('button', { name: big.title, exact: true }).click();
  await expect(libraryItem(b, big.title)).toContainText(/Downloading… [1-9]\d?%/);
  // The download is checked against the book's SHA-256 before it is kept, so opening means the
  // bytes are identical.
  await expect(pageSlot(b, 0)).toHaveAttribute('data-state', 'rendered');
  expect(ranges.length).toBeGreaterThanOrEqual(3);
  const stored = await b.evaluate(async (id) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('book-reader');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
      const req = db.transaction('bookFiles').objectStore('bookFiles').get(id);
      req.onsuccess = () => resolve(req.result as ArrayBuffer);
      req.onerror = () => reject(req.error);
    });
    db.close();
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (x) => x.toString(16).padStart(2, '0')).join('');
  }, big.id);
  expect(stored).toBe(big.id);
});

test(
  'an interrupted upload resumes from the next part',
  { tag: '@any-engine' },
  async ({ device }) => {
    const big = await bigPdf(20);
    const a = await device();
    const sent: string[] = [];
    a.on('request', (r) => {
      if (r.method() === 'PUT' && r.url().includes('/api/files/'))
        sent.push(r.url().split('/').at(-1) ?? '');
    });
    let dropped = false;
    await a.route('**/api/files/**/uploads/*/2', async (route) => {
      if (!dropped) {
        dropped = true;
        await route.abort('connectionreset');
      } else {
        await route.continue();
      }
    });
    await a.getByLabel('Open PDF').setInputFiles(big.path);
    await expect(pageSlot(a, 0)).toHaveAttribute('data-state', 'rendered');
    await syncNow(a);
    await expect.poll(() => dropped).toBe(true);
    await expect(a.getByTestId('upload-status')).toHaveText('');

    await syncAndUpload(a, big.id);
    // Part 1 went once; part 2 twice (dropped, then again); part 3 once.
    expect(sent).toEqual(['1', '2', '2', '3']);
  },
);

test('a damaged download is refused and nothing is kept; trying again works', async ({
  device,
}) => {
  const id = idOf(fixturePath(BOOK));
  const a = await device();
  await importBook(a, BOOK);
  await syncAndUpload(a, id);

  const b = await device();
  await syncNow(b);
  await b.route(`**/api/files/${id}`, async (route) => {
    const response = await route.fetch();
    const body = Buffer.from(await response.body());
    body.writeUInt8((body.readUInt8(body.length - 10) ^ 0xff) & 0xff, body.length - 10);
    await route.fulfill({ response, body });
  });
  await libraryItem(b, TITLE).getByRole('button', { name: TITLE, exact: true }).click();
  await expect(errorAlert(b)).toHaveText('The download was damaged. Try again.');
  await expect(libraryItem(b, TITLE)).toContainText('On your other devices');

  await b.unroute(`**/api/files/${id}`);
  await downloadAndOpen(b, TITLE);
});

test('offline, or before the upload has finished, opening explains why; later it works', async ({
  device,
}) => {
  const id = idOf(fixturePath(BOOK));
  const a = await device();
  // A's uploads can't get through yet; the library entry still syncs.
  await a.route('**/api/files/**', (route) => route.abort('connectionreset'));
  await importBook(a, BOOK);
  await syncNow(a);

  const b = await device();
  await syncNow(b);
  await libraryItem(b, TITLE).getByRole('button', { name: TITLE, exact: true }).click();
  await expect(errorAlert(b)).toHaveText(
    'This book is still uploading from your other device. Try again in a little while.',
  );

  await b.context().setOffline(true);
  await libraryItem(b, TITLE).getByRole('button', { name: TITLE, exact: true }).click();
  await expect(errorAlert(b)).toHaveText('Connect to the internet to download this book.');

  await a.unroute('**/api/files/**');
  await syncAndUpload(a, id);
  await b.context().setOffline(false);
  await downloadAndOpen(b, TITLE);
});

test('"Delete everywhere" removes the file from the cloud too', async ({ device }) => {
  const id = idOf(fixturePath(BOOK));
  const a = await device();
  await importBook(a, BOOK);
  await syncAndUpload(a, id);
  const b = await device();
  await syncNow(b);
  await expect(libraryItem(b, TITLE)).toContainText('On your other devices');

  await backToLibrary(a);
  await libraryItem(a, TITLE)
    .getByRole('button', { name: `Remove ${TITLE}` })
    .click();
  await libraryItem(a, TITLE).getByRole('button', { name: 'Delete everywhere' }).click();
  await syncNow(a);

  expect((await b.request.get(`/api/files/${id}`)).status()).toBe(404);
  await syncNow(b);
  await expect(b.getByText('No books yet. Open a PDF to start.')).toBeVisible();

  // The file itself is gone, not just hidden: import the book again with uploads held back, and
  // the cloud still has no file for it.
  await a.route('**/api/files/**/uploads**', (route) => route.abort('connectionreset'));
  await importBook(a, BOOK);
  await syncNow(a);
  expect((await a.request.head(`/api/files/${id}`)).status()).toBe(404);
});

test('"Remove from this device" frees the file; the book downloads again with its annotations', async ({
  device,
}) => {
  const id = idOf(fixturePath(BOOK));
  const a = await device();
  await importBook(a, BOOK);
  await bookmarkPage(a, 2);
  await syncAndUpload(a, id);

  await backToLibrary(a);
  await libraryItem(a, TITLE)
    .getByRole('button', { name: `Remove ${TITLE}` })
    .click();
  await libraryItem(a, TITLE).getByRole('button', { name: 'Remove from this device' }).click();
  await expect(libraryItem(a, TITLE)).toContainText('On your other devices');

  // The reading place stays with the book on this device (phase 10), so it reopens at page 3.
  await libraryItem(a, TITLE).getByRole('button', { name: TITLE, exact: true }).click();
  await expectPageAtTop(a, 2);
  await expect.poll(() => bookmarkLabels(a)).toEqual(['Page 3']);
});

test(
  'when the cloud is full, the status says so and the book keeps working here',
  { tag: '@any-engine' },
  async ({ device }) => {
    const a = await device({ headers: { 'x-dev-files-cap': '1000' } });
    await importBook(a, BOOK);
    await syncNow(a);
    await expect(a.getByTestId('upload-status')).toHaveText(
      'Cloud storage is full (9 GB). New books stay on this device only.',
    );
    await a.reload();
    await libraryItem(a, TITLE).getByRole('button', { name: TITLE, exact: true }).click();
    await expect(pageSlot(a, 0)).toHaveAttribute('data-state', 'rendered');
  },
);
