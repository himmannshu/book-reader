import { devices, expect, test, type Page } from '@playwright/test';
import { fixturePath, importBook, manifest, pageSlot } from './helpers';

const BOOK = 'text-4-pages.pdf';

interface Spot {
  page: number;
  text: string;
}

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface StoredHighlight {
  id: string;
  bookId: string;
  pageIndex: number;
  rects: { pageIndex: number; x: number; y: number; width: number; height: number }[];
  quote: string;
  createdAt: number;
}

const fixtureLines = (
  manifest['text-4-pages'] as unknown as {
    lines: { pageIndex: number; text: string; x: number; baseline: number; width: number }[];
  }
).lines;

function line(startsWith: string) {
  const found = fixtureLines.find((l) => l.text.startsWith(startsWith));
  if (!found) throw new Error(`no fixture line ${startsWith}`);
  return found;
}

/** Waits until a page's selectable text is laid out. */
async function textReady(page: Page, pageIndex: number, text: string) {
  await expect(
    page.locator(`[data-page-index="${pageIndex}"] .textLayer span`, { hasText: text }),
  ).toHaveCount(1);
}

declare global {
  interface Window {
    /** The Range from the start of `from.text` to the end of `to.text` (or of `from.text`). */
    textRange(from: Spot, to?: Spot): Range;
  }
}

/** Installed in every page before it loads, so tests can address text by its words. */
function installTextRange() {
  window.textRange = (from, to) => {
    const find = (spot: Spot) => {
      const spans = document.querySelectorAll(`[data-page-index="${spot.page}"] .textLayer span`);
      for (const span of spans) {
        const text = span.firstChild;
        const index = text instanceof Text ? text.data.indexOf(spot.text) : -1;
        if (text && index >= 0) return { node: text, index };
      }
      throw new Error(`no text "${spot.text}" on page ${spot.page}`);
    };
    const end = to ?? from;
    const a = find(from);
    const b = find(end);
    const range = document.createRange();
    range.setStart(a.node, a.index);
    range.setEnd(b.node, b.index + end.text.length);
    return range;
  };
}

/** Selects text in the pages, as a reader dragging over it would. */
async function selectText(page: Page, from: Spot, to?: Spot) {
  await page.evaluate(
    ({ from, to }) => {
      const selection = document.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(window.textRange(from, to));
    },
    { from, to },
  );
}

/**
 * Screen boxes of the given text, one per line: left and right of the selected characters, top
 * and bottom of the line of text they are in.
 */
async function textBoxes(page: Page, from: Spot, to?: Spot): Promise<Box[]> {
  return page.evaluate(
    ({ from, to }) => {
      const lines: { left: number; top: number; right: number; bottom: number }[] = [];
      const range = window.textRange(from, to);
      const spans = [...document.querySelectorAll('.textLayer span')].filter((span) =>
        range.intersectsNode(span),
      );
      for (const span of spans) {
        const part = document.createRange();
        part.selectNodeContents(span);
        if (span.contains(range.startContainer))
          part.setStart(range.startContainer, range.startOffset);
        if (span.contains(range.endContainer)) part.setEnd(range.endContainer, range.endOffset);
        const box = span.getBoundingClientRect();
        const chars = [...part.getClientRects()].filter((r) => r.width >= 1);
        if (chars.length === 0) continue;
        const r = {
          left: Math.min(...chars.map((c) => c.left)),
          right: Math.max(...chars.map((c) => c.right)),
          top: box.top,
          bottom: box.bottom,
        };
        const same = lines.find((l) => Math.abs(l.top - r.top) < 4);
        if (same) {
          same.left = Math.min(same.left, r.left);
          same.right = Math.max(same.right, r.right);
          same.bottom = Math.max(same.bottom, r.bottom);
        } else lines.push(r);
      }
      return lines.sort((a, b) => a.top - b.top);
    },
    { from, to },
  );
}

async function highlightBoxes(page: Page): Promise<Box[]> {
  return page.locator('.highlight-box').evaluateAll((boxes) =>
    boxes
      .map((box) => {
        const r = box.getBoundingClientRect();
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      })
      .sort((a, b) => a.top - b.top),
  );
}

function expectAligned(actual: Box[], expected: Box[], tolerance = 2) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((box, i) => {
    const want = expected[i];
    for (const side of ['left', 'top', 'right', 'bottom'] as const) {
      expect(Math.abs(box[side] - (want?.[side] ?? NaN)), `line ${i} ${side}`).toBeLessThanOrEqual(
        tolerance,
      );
    }
  });
}

function highlightButton(page: Page) {
  return page.getByRole('button', { name: 'Highlight', exact: true });
}

function removeButton(page: Page) {
  return page.getByRole('button', { name: 'Remove highlight', exact: true });
}

async function stored(page: Page, store = 'highlights'): Promise<StoredHighlight[]> {
  return page.evaluate(async (name) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('book-reader');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const all = await new Promise<unknown[]>((resolve, reject) => {
      const request = db.transaction(name).objectStore(name).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return all as StoredHighlight[];
  }, store);
}

/** Selects some text, presses Highlight and waits until it is drawn. */
async function highlight(page: Page, from: Spot, to?: Spot) {
  const before = await page.locator('.highlight-box').count();
  await selectText(page, from, to);
  await highlightButton(page).click();
  await expect.poll(() => page.locator('.highlight-box').count()).toBeGreaterThan(before);
}

/** Resizes the window and waits until the pages are laid out and their text rebuilt at the new size. */
async function resize(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  const pageWidth = Math.min(width - 48, 900);
  await expect
    .poll(async () => Math.round((await pageSlot(page, 0).boundingBox())?.width ?? 0))
    .toBe(pageWidth);
  await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');
  await textReady(page, 0, 'Charlie three');
}

async function openBook(page: Page) {
  await importBook(page, BOOK);
  await textReady(page, 0, 'Charlie three');
}

async function reloadAndReopen(page: Page) {
  await page.reload();
  await page
    .getByRole('list', { name: 'Your books' })
    .getByRole('button', { name: 'text-4-pages', exact: true })
    .click();
  await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');
  await textReady(page, 0, 'Charlie three');
}

/** Clicks the middle of the n-th highlight box. */
async function clickHighlight(page: Page, index = 0) {
  const box = (await highlightBoxes(page))[index];
  if (!box) throw new Error(`no highlight box ${index}`);
  await page.mouse.click((box.left + box.right) / 2, (box.top + box.bottom) / 2);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(installTextRange);
  await page.goto('/');
});

test('selecting text and pressing Highlight highlights exactly that text', async ({ page }) => {
  await openBook(page);
  const words = { page: 0, text: 'highlights should cover exactly' };
  await selectText(page, words);
  await expect(highlightButton(page)).toBeVisible();
  const expected = await textBoxes(page, words);

  await highlightButton(page).click();
  await expect(page.locator('.highlight-box')).toHaveCount(1);
  expectAligned(await highlightBoxes(page), expected);
  expect(await page.evaluate(() => document.getSelection()?.isCollapsed)).toBe(true);
  await expect(highlightButton(page)).toHaveCount(0);
});

test('repeated presses while saving create only one highlight', async ({ page }) => {
  await openBook(page);
  await selectText(page, { page: 0, text: 'Bravo two' });
  // Both activations happen before the asynchronous save can finish, independent of disk speed.
  await highlightButton(page).evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(highlightButton(page)).toHaveCount(0);
  expect(await stored(page)).toHaveLength(1);
  await expect(page.locator('.highlight-box')).toHaveCount(1);

  await clickHighlight(page);
  await removeButton(page).click();
  await expect(page.locator('.highlight-box')).toHaveCount(0);
  expect(await stored(page)).toHaveLength(0);
  await reloadAndReopen(page);
  await expect(page.locator('.highlight-box')).toHaveCount(0);
});

test('a failed highlight save can be retried', async ({ page }) => {
  await openBook(page);
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: Parameters<typeof put>) {
      if (this.name === 'highlights') {
        IDBObjectStore.prototype.put = put;
        throw new DOMException('Storage full', 'QuotaExceededError');
      }
      return put.apply(this, args);
    };
  });
  await selectText(page, { page: 0, text: 'Bravo two' });
  await highlightButton(page).click();
  await expect(page.getByRole('alert')).toHaveText(
    "There isn't enough storage space to save this highlight.",
  );
  expect(await stored(page)).toHaveLength(0);

  await highlightButton(page).click();
  await expect(page.locator('.highlight-box')).toHaveCount(1);
  expect((await stored(page)).map((h) => h.quote)).toEqual(['Bravo two']);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

for (const change of ['resize', 'focused resize', 'side panel', 'scroll away']) {
  test(`Highlight hides when selected text is released: ${change}`, async ({ page }) => {
    await openBook(page);
    await selectText(page, { page: 0, text: 'Bravo two' });
    await expect(highlightButton(page)).toBeVisible();
    const originalText = await pageSlot(page, 0).locator('.textLayer').elementHandle();
    if (!originalText) throw new Error('no selected text layer');

    // Removing a text layer can collapse a selection without selectionchange. Ensure the action
    // tracks that lifecycle even if the browser delivers no event, including its saved focus range.
    const suppression = await page.evaluateHandle(() => {
      const controller = new AbortController();
      document.addEventListener('selectionchange', (event) => event.stopImmediatePropagation(), {
        capture: true,
        signal: controller.signal,
      });
      return controller;
    });
    if (change === 'focused resize') await highlightButton(page).focus();
    if (change === 'resize' || change === 'focused resize') {
      await resize(page, 700, 800);
    } else if (change === 'side panel') {
      await page.getByRole('button', { name: 'Bookmarks', exact: true }).click();
    } else {
      await page.getByTestId('reader').evaluate((reader) => {
        reader.scrollTop = reader.scrollHeight;
      });
    }
    await expect.poll(() => originalText.evaluate((layer) => layer.isConnected)).toBe(false);
    await expect(highlightButton(page)).toHaveCount(0);
    expect(await stored(page)).toHaveLength(0);
    if (change === 'focused resize') await expect(page.getByTestId('reader')).toBeFocused();

    // A fresh selection still works after invalidation, in the same reader instance.
    await suppression.evaluate((controller) => controller.abort());
    await page.getByTestId('reader').evaluate((reader) => {
      reader.scrollTop = 0;
    });
    await textReady(page, 0, 'Charlie three');
    await highlight(page, { page: 0, text: 'Alpha one' });
    expect((await stored(page)).map((h) => h.quote)).toEqual(['Alpha one']);
  });
}

for (const deviceName of ['iPhone 13', 'iPad (gen 7)']) {
  test.describe(`touch on ${deviceName}`, () => {
    const device = devices[deviceName];
    if (!device) throw new Error(`no device profile ${deviceName}`);
    test.use({
      hasTouch: true,
      isMobile: true,
      viewport: device.viewport,
      deviceScaleFactor: device.deviceScaleFactor,
      userAgent: device.userAgent,
    });

    test('tapping Highlight saves the selected text and survives reopening', async ({ page }) => {
      await openBook(page);
      const words = { page: 0, text: 'Bravo two' };
      await selectText(page, words);
      await highlightButton(page).tap();
      await expect(page.locator('.highlight-box')).toHaveCount(1);
      expect((await stored(page)).map((h) => h.quote)).toEqual([words.text]);
      expectAligned(await highlightBoxes(page), await textBoxes(page, words));
      await expect(highlightButton(page)).toHaveCount(0);

      await reloadAndReopen(page);
      await expect(page.locator('.highlight-box')).toHaveCount(1);
    });

    test('tapping Remove deletes the highlight and stays deleted after reopening', async ({
      page,
    }) => {
      await openBook(page);
      // Mouse creation isolates the Remove tap, even if the Highlight tap is broken.
      await highlight(page, { page: 0, text: 'Bravo two' });
      const box = (await highlightBoxes(page))[0];
      if (!box) throw new Error('no highlight box to tap');
      await page.touchscreen.tap((box.left + box.right) / 2, (box.top + box.bottom) / 2);
      await removeButton(page).tap();
      await expect(page.locator('.highlight-box')).toHaveCount(0);
      expect(await stored(page)).toHaveLength(0);
      await expect(removeButton(page)).toHaveCount(0);

      await reloadAndReopen(page);
      await expect(page.locator('.highlight-box')).toHaveCount(0);
    });
  });
}

test('dragging over several lines makes one highlight with one box per line', async ({ page }) => {
  await openBook(page);
  const [bravo] = await textBoxes(page, { page: 0, text: 'Bravo' });
  const [delta] = await textBoxes(page, { page: 0, text: 'Delta four: the fourth' });
  if (!bravo || !delta) throw new Error('fixture lines not found');
  await page.mouse.move(bravo.left + 1, (bravo.top + bravo.bottom) / 2);
  await page.mouse.down();
  await page.mouse.move((bravo.left + delta.right) / 2, (delta.top + delta.bottom) / 2, {
    steps: 12,
  });
  await page.mouse.move(delta.right, (delta.top + delta.bottom) / 2, { steps: 4 });
  await page.mouse.up();
  await highlightButton(page).click();
  await expect(page.locator('.highlight-box')).toHaveCount(3);

  const [record, ...others] = await stored(page);
  expect(others).toEqual([]);
  expect(record?.rects).toHaveLength(3);
  expect(record?.quote.startsWith('Bravo two:')).toBe(true);
  expect(record?.quote).toContain('Charlie three');
  expect(record?.quote).toContain('Delta four: the fourth');
  // Nothing over the line above or the paragraph below.
  const boxes = await highlightBoxes(page);
  const [alpha] = await textBoxes(page, { page: 0, text: 'Alpha one' });
  const [india] = await textBoxes(page, { page: 0, text: 'India nine' });
  for (const box of boxes) {
    expect(box.top).toBeGreaterThanOrEqual((alpha?.bottom ?? 0) - 2);
    expect(box.bottom).toBeLessThanOrEqual((india?.top ?? 0) + 2);
  }
});

test('a selection across a page break becomes one highlight on both pages', async ({ page }) => {
  await openBook(page);
  // Show the foot of page 1 and the top of page 2 together.
  await page.getByTestId('reader').evaluate((reader) => {
    const first = reader.querySelector<HTMLElement>('[data-page-index="0"]');
    reader.scrollTop = (first?.offsetTop ?? 0) + (first?.offsetHeight ?? 0) - 250;
  });
  await textReady(page, 0, 'India nine');
  await textReady(page, 1, 'and Juliet ten');

  await highlight(page, { page: 0, text: 'India nine' }, { page: 1, text: 'top of page two.' });
  const [record] = await stored(page);
  expect(record?.pageIndex).toBe(0);
  expect(record?.rects.map((r) => r.pageIndex)).toEqual([0, 1]);
  expect(record?.quote).toBe(`${line('India nine').text} ${line('and Juliet ten').text}`);
  await expect(page.locator('[data-page-index="0"] .highlight-box')).toHaveCount(1);
  await expect(page.locator('[data-page-index="1"] .highlight-box')).toHaveCount(1);
});

test('highlights stay aligned with their text after the window is resized', async ({ page }) => {
  await openBook(page);
  const words = { page: 0, text: 'Charlie three: highlights' };
  await highlight(page, words);

  await resize(page, 700, 800);
  expectAligned(await highlightBoxes(page), await textBoxes(page, words));
});

test('highlights stay aligned with their text at 50%, 200% and fit page', async ({ page }) => {
  await openBook(page);
  const words = { page: 0, text: 'Charlie three: highlights' };
  await highlight(page, words);

  const zoom = page.getByRole('combobox', { name: 'Zoom' });
  const shownWidth = async () => Math.round((await pageSlot(page, 0).boundingBox())?.width ?? 0);
  const readerHeight = await page.getByTestId('reader').evaluate((e) => e.clientHeight);
  for (const [value, width] of [
    ['50', 612 * 0.5 * (96 / 72)],
    ['200', 612 * 2 * (96 / 72)],
    // The whole page fits the window's height, minus 24 px margins above and below.
    ['fit-page', (readerHeight - 48) * (612 / 792)],
  ] as const) {
    await zoom.selectOption(value);
    await expect.poll(shownWidth, value).toBe(Math.round(width));
    await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');
    await textReady(page, 0, 'Charlie three');
    expectAligned(await highlightBoxes(page), await textBoxes(page, words));
  }
});

test('highlights are still there after a reload', async ({ page }) => {
  await openBook(page);
  const words = { page: 0, text: 'a second line, with different' };
  await highlight(page, words);

  await reloadAndReopen(page);
  await expect(page.locator('.highlight-box')).toHaveCount(1);
  expectAligned(await highlightBoxes(page), await textBoxes(page, words));
});

test('stored highlights hold PDF points and the quote, whatever the window size', async ({
  page,
}) => {
  const charlie = line('Charlie three');
  await openBook(page);
  await highlight(page, { page: 0, text: charlie.text });
  await resize(page, 700, 800);
  await highlight(page, { page: 0, text: charlie.text });

  const records = await stored(page);
  expect(records).toHaveLength(2);
  for (const record of records) {
    expect(Object.keys(record).sort()).toEqual(
      ['bookId', 'createdAt', 'id', 'pageIndex', 'quote', 'rects'].sort(),
    );
    expect(record.pageIndex).toBe(0);
    expect(record.quote).toBe(charlie.text);
    const [r, ...more] = record.rects;
    expect(more).toEqual([]);
    expect(Object.keys(r ?? {}).sort()).toEqual(['height', 'pageIndex', 'width', 'x', 'y']);
    // In points from the page's top-left corner: matches where the fixture drew the line.
    expect(Math.abs((r?.x ?? 0) - charlie.x)).toBeLessThanOrEqual(1);
    expect(Math.abs((r?.width ?? 0) - charlie.width)).toBeLessThanOrEqual(2);
    expect(r?.y).toBeLessThan(charlie.baseline);
    expect((r?.y ?? 0) + (r?.height ?? 0)).toBeGreaterThan(charlie.baseline);
  }
  // The same text highlighted at two window sizes is stored with the same numbers.
  const [a, b] = records.map((record) => record.rects[0]);
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    expect(Math.abs((a?.[key] ?? 0) - (b?.[key] ?? 0)), key).toBeLessThanOrEqual(0.5);
  }
});

test('clicking a highlight offers Remove; only pressing it removes the highlight', async ({
  page,
}) => {
  await openBook(page);
  await highlight(page, { page: 0, text: 'Bravo two: a second line' });
  await highlight(page, { page: 0, text: 'Delta four: the fourth line' });

  // Escape and a click elsewhere close the offer and remove nothing.
  await clickHighlight(page, 0);
  await expect(removeButton(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(removeButton(page)).toHaveCount(0);
  await clickHighlight(page, 0);
  await expect(removeButton(page)).toBeVisible();
  const [alpha] = await textBoxes(page, { page: 0, text: 'Alpha one' });
  await page.mouse.click((alpha?.right ?? 0) + 40, alpha?.top ?? 0);
  await expect(removeButton(page)).toHaveCount(0);
  await expect(page.locator('.highlight-box')).toHaveCount(2);

  await clickHighlight(page, 0);
  await removeButton(page).click();
  await expect(page.locator('.highlight-box')).toHaveCount(1);
  expect((await stored(page)).map((h) => h.quote)).toEqual(['Delta four: the fourth line']);

  await reloadAndReopen(page);
  await expect(page.locator('.highlight-box')).toHaveCount(1);
  expect((await stored(page)).map((h) => h.quote)).toEqual(['Delta four: the fourth line']);
});

test('no Highlight button for whitespace or for text outside the pages', async ({ page }) => {
  await openBook(page);
  // Only the space after "Charlie".
  await selectText(page, { page: 0, text: ' three:' });
  await page.evaluate(() => {
    const range = document.getSelection()?.getRangeAt(0);
    range?.setEnd(range.startContainer, range.startOffset + 1);
  });
  expect(await page.evaluate(() => document.getSelection()?.toString())).toBe(' ');
  await page.waitForTimeout(200);
  await expect(highlightButton(page)).toHaveCount(0);

  // Text in the toolbar.
  await page.getByTestId('book-info').evaluate((info) => {
    const range = document.createRange();
    range.selectNodeContents(info);
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(range);
  });
  await page.waitForTimeout(200);
  await expect(highlightButton(page)).toHaveCount(0);
});

test('a highlight that cannot be saved shows a readable message', async ({ page }) => {
  await openBook(page);
  // The book disappears from storage (as if removed in another tab).
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('book-reader');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve) => {
      const tx = db.transaction('books', 'readwrite');
      tx.objectStore('books').clear();
      tx.oncomplete = resolve;
    });
    db.close();
  });
  await selectText(page, { page: 0, text: 'Alpha one' });
  await highlightButton(page).click();
  await expect(page.getByRole('alert')).toHaveText(
    "This book is no longer stored on this device, so its highlights can't be changed.",
  );
  await expect(page.locator('.highlight-box')).toHaveCount(0);
});

test('Highlight and Remove work from the keyboard; Escape hides them', async ({ page }) => {
  await openBook(page);
  await selectText(page, { page: 0, text: 'Alpha one' });
  await expect(highlightButton(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(highlightButton(page)).toHaveCount(0);

  await selectText(page, { page: 0, text: 'Bravo two' });
  await highlightButton(page).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.highlight-box')).toHaveCount(1);
  await expect(page.getByTestId('reader')).toBeFocused();

  await clickHighlight(page);
  await removeButton(page).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.highlight-box')).toHaveCount(0);
  expect(await stored(page)).toHaveLength(0);
});

test.describe('when this browser cannot store books', () => {
  test.beforeEach(async ({ page }) => {
    // Like a private window that refuses storage: the app reads but can't save.
    await page.addInitScript(() => {
      Object.defineProperty(window, 'indexedDB', { value: undefined });
    });
    await page.goto('/');
  });

  test('Highlight is disabled and says why', async ({ page }) => {
    await page.getByLabel('Open PDF').setInputFiles(fixturePath(BOOK));
    await textReady(page, 0, 'Charlie three');
    await selectText(page, { page: 0, text: 'Alpha one' });
    await expect(highlightButton(page)).toBeDisabled();
    await expect(page.getByText('Highlights need this book saved on this device.')).toBeVisible();
  });
});
