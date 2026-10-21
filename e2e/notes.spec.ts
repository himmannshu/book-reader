import { devices, expect, test, type Page } from '@playwright/test';
import type { Note } from '../src/core/notes';
import type { Highlight } from '../src/core/highlights';
import {
  expectPageAtTop,
  fixturePath,
  importBook,
  keyboardToTab,
  openPanel,
  pageSlot,
  pressTool,
} from './helpers';

const notesPanel = (page: Page) => page.getByRole('navigation', { name: 'Notes' });
const editor = (page: Page) => page.getByRole('textbox', { name: 'Note text' });
const row = (page: Page, text: string) =>
  page.locator('.note-row').filter({ has: page.locator('.note-text', { hasText: text }) });

async function stored<T>(page: Page, store = 'notes'): Promise<T[]> {
  return page.evaluate(async (name) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('book-reader');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<T[]>((resolve, reject) => {
        const request = db.transaction(name).objectStore(name).getAll();
        request.onsuccess = () => resolve(request.result as T[]);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  }, store);
}

async function save(page: Page, text: string, touch = false) {
  await editor(page).fill(text);
  const button = page.getByRole('button', { name: 'Save note', exact: true });
  if (touch) await button.tap();
  else await button.click();
  await expect(editor(page)).toHaveCount(0);
  await expect(row(page, text)).toHaveCount(1);
}

async function pageNote(page: Page, text: string) {
  if (!(await notesPanel(page).count())) await openPanel(page, 'Notes');
  await page.getByRole('button', { name: 'Add note to this page', exact: true }).click();
  await save(page, text);
}

async function layoutReady(page: Page) {
  const width = await page
    .getByTestId('reader')
    .evaluate((reader) => Math.min(reader.clientWidth - 48, 900));
  await expect
    .poll(async () => Math.round((await pageSlot(page, 0).boundingBox())?.width ?? 0))
    .toBe(width);
}

async function highlight(
  page: Page,
  from = 'Bravo two',
  to?: { pageIndex: number; text: string },
  touch = false,
) {
  await layoutReady(page);
  const before = await page.locator('.highlight-box').count();
  const start = page.locator('[data-page-index="0"] .textLayer span', { hasText: from });
  await expect(start).toHaveCount(1);
  if (to)
    await expect(
      pageSlot(page, to.pageIndex).locator('.textLayer span', { hasText: to.text }),
    ).toHaveCount(1);
  await start.evaluate((element, end) => {
    const finish = end
      ? [...document.querySelectorAll(`[data-page-index="${end.pageIndex}"] .textLayer span`)].find(
          (span) => span.textContent?.includes(end.text),
        )
      : element;
    if (!finish) throw new Error('Missing end of selection');
    const range = document.createRange();
    range.setStart(element, 0);
    range.setEnd(finish, finish.childNodes.length);
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(range);
  }, to);
  const button = page.getByRole('button', { name: 'Highlight', exact: true });
  if (touch) await button.tap();
  else await button.click();
  await expect.poll(() => page.locator('.highlight-box').count()).toBeGreaterThan(before);
}

/** Taps a panel's toolbar button, or More and then the panel on phones (phase 19). */
/**
 * Shows the Notes tab with taps (phase 20): Contents opens the tabbed panel, from the toolbar or
 * under More on phones, then the tab.
 */
async function tapPanel(page: Page, name: 'Notes' | 'Contents') {
  await expect(page.getByRole('toolbar', { name: 'Reader' })).toBeVisible();
  const tablist = page.getByRole('tablist', { name: 'Reader panels' });
  if (!(await tablist.isVisible())) await tapContents(page);
  const tab = tablist.getByRole('tab', { name: new RegExp(`^${name}`) });
  if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.tap();
}

/** Taps the toolbar's Contents (under More on phones): opens or closes the tabbed panel. */
async function tapContents(page: Page) {
  const button = page
    .getByRole('toolbar', { name: 'Reader' })
    .getByRole('button', { name: 'Contents', exact: true });
  if (await button.isVisible()) {
    await button.tap();
    return;
  }
  await page.getByRole('button', { name: 'More', exact: true }).tap();
  await page.getByRole('menu', { name: 'More' }).getByRole('menuitem', { name: 'Contents' }).tap();
}

async function clickHighlight(page: Page, touch = false) {
  const box = await page.locator('.highlight-box').first().boundingBox();
  if (!box) throw new Error('No highlight box');
  if (touch) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  else await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

async function passageNote(page: Page, text: string) {
  await highlight(page);
  await clickHighlight(page);
  await page.getByRole('button', { name: 'Add note', exact: true }).click();
  await save(page, text);
}

/** Fail one operation, then automatically restore the original method for retry. */
async function failNext(page: Page, method: 'put' | 'delete' | 'getAll', store = 'notes') {
  await page.evaluate(
    ({ method, store }) => {
      const original = IDBObjectStore.prototype[method];
      // The prototype overloads have different signatures; forwarding preserves each at runtime.
      Object.defineProperty(IDBObjectStore.prototype, method, {
        configurable: true,
        writable: true,
        value: function (this: IDBObjectStore, ...args: unknown[]) {
          if (this.name === store) {
            Object.defineProperty(IDBObjectStore.prototype, method, {
              configurable: true,
              writable: true,
              value: original,
            });
            throw new DOMException('Injected storage failure', 'QuotaExceededError');
          }
          return Reflect.apply(original, this, args);
        },
      });
    },
    { method, store },
  );
}

async function reopen(page: Page) {
  await page.reload();
  await page.getByRole('button', { name: 'text-4-pages', exact: true }).click();
  // The book reopens where it was left (phase 10), so wait for whichever page is shown.
  await expect(page.locator('[data-page-index][data-state="rendered"]').first()).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await importBook(page, 'text-4-pages.pdf');
});

test('note actions remain fully reachable for a highlight near the reader bottom', async ({
  page,
}) => {
  await highlight(page);
  await page.setViewportSize({ width: 1280, height: 360 });
  await layoutReady(page);
  // Waits for the scroll event, which comes a frame after scrollTop changes: scrolling closes the
  // highlight menu, so a click before it would have its menu closed at once.
  await page.getByTestId('reader').evaluate(async (reader) => {
    const box = reader.querySelector('.highlight-box')?.getBoundingClientRect();
    const by = box ? Math.round(box.bottom - reader.getBoundingClientRect().bottom + 16) : 0;
    if (by === 0) return;
    const scrolled = new Promise((resolve) =>
      reader.addEventListener('scroll', resolve, { once: true }),
    );
    reader.scrollTop += by;
    await scrolled;
  });
  await expect
    .poll(() =>
      page.locator('.highlight-box').evaluate((box) => {
        const reader = box.closest('[data-testid="reader"]');
        return Math.round(
          (reader?.getBoundingClientRect().bottom ?? 0) - box.getBoundingClientRect().bottom,
        );
      }),
    )
    .toBe(16);
  await clickHighlight(page);
  await expect(page.getByRole('button', { name: 'Add note', exact: true })).toHaveCount(1);
  const bottom = await page
    .getByTestId('reader')
    .evaluate((reader) => reader.getBoundingClientRect().bottom);
  await expect
    .poll(async () => (await page.locator('.selection-actions').boundingBox())?.y ?? Infinity)
    .toBeGreaterThanOrEqual(0);
  const menu = await page.locator('.selection-actions').boundingBox();
  expect((menu?.y ?? Infinity) + (menu?.height ?? Infinity)).toBeLessThanOrEqual(bottom);
  await page.getByRole('button', { name: 'Add note', exact: true }).click();
  await save(page, 'At the edge');
});

test('one note per target; blank edits and Cancel preserve the saved multiline Unicode text', async ({
  page,
}) => {
  await pageNote(page, 'Original\n日本語 📖');
  const [original] = await stored<Note>(page);
  await page.getByRole('button', { name: 'Add note to this page' }).click();
  await expect(editor(page)).toHaveValue('Original\n日本語 📖');
  await editor(page).fill(' \n ');
  await expect(page.getByRole('button', { name: 'Save note' })).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await stored<Note>(page)).toEqual([original]);
  await row(page, 'Original').getByRole('button', { name: 'Edit note' }).click();
  await save(page, 'Edited\n中文 🌻');
  const records = await stored<Note>(page);
  expect(records).toHaveLength(1);
  expect(records[0]).toMatchObject({
    id: original?.id,
    createdAt: original?.createdAt,
    target: { kind: 'page', pageIndex: 0 },
    text: 'Edited\n中文 🌻',
  });
  expect(records[0]?.updatedAt).toBeGreaterThanOrEqual(original?.updatedAt ?? 0);
  await reopen(page);
  await openPanel(page, 'Notes');
  await expect(row(page, 'Edited\n中文 🌻')).toHaveCount(1);
});

test('note-only deletion can cancel, confirms permanently, and keeps its highlight', async ({
  page,
}) => {
  await passageNote(page, 'Passage to delete');
  await row(page, 'Passage to delete').getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();
  await expect(row(page, 'Passage to delete')).toHaveCount(1);
  await row(page, 'Passage to delete').getByRole('button', { name: 'Delete', exact: true }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Delete note', exact: true })
    .click();
  await expect(row(page, 'Passage to delete')).toHaveCount(0);
  expect(await stored<Note>(page)).toEqual([]);
  expect(await stored<Highlight>(page, 'highlights')).toHaveLength(1);
  await reopen(page);
  await openPanel(page, 'Notes');
  await expect(notesPanel(page)).toContainText('No notes yet.');
  await expect(page.locator('.highlight-box')).toHaveCount(1);
});

test('highlight removal confirms both, rolls back on failure, and leaves other notes alone', async ({
  page,
}) => {
  await passageNote(page, 'Linked');
  await pageNote(page, 'Independent');
  await pressTool(page, 'Contents');
  // The pages widen as the docked panel closes (phase 20): click once they are laid out.
  await layoutReady(page);
  await clickHighlight(page);
  await page.getByRole('button', { name: 'Remove highlight', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();
  expect(await stored<Note>(page)).toHaveLength(2);
  await failNext(page, 'delete');
  await page.getByRole('button', { name: 'Remove highlight', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Remove both' }).click();
  await expect(page.getByRole('alert')).toContainText("isn't enough storage");
  expect(await stored<Note>(page)).toHaveLength(2);
  expect(await stored<Highlight>(page, 'highlights')).toHaveLength(1);
  await page.getByRole('button', { name: 'Remove highlight', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Remove both' }).click();
  await expect(page.locator('.highlight-box')).toHaveCount(0);
  expect((await stored<Note>(page)).map((note) => note.text)).toEqual(['Independent']);
  await reopen(page);
  await openPanel(page, 'Notes');
  await expect(page.locator('.note-row')).toHaveCount(1);
  await expect(notesPanel(page)).toContainText('Independent');
});

test(
  'changed text is guarded across panel close/switch, note choice and Library, then another book opens',
  { tag: '@any-engine' },
  async ({ page }) => {
    await pageNote(page, 'Saved page');
    await passageNote(page, 'Saved passage');
    await row(page, 'Saved page').getByRole('button', { name: 'Edit note' }).click();
    await editor(page).fill('Draft retained');
    for (const navigate of [
      // Closing the panel, and switching to another of its tabs (phase 20).
      () => pressTool(page, 'Contents'),
      () => page.getByRole('tab', { name: 'Contents' }).click(),
      () => page.keyboard.press('Escape'),
      () => row(page, 'Saved passage').getByRole('button', { name: 'Edit note' }).click(),
      () => row(page, 'Saved passage').locator('.note-jump').click(),
      // Opening a file is in the library only (phase 19), so leaving for it is the guarded step.
      () => page.getByRole('button', { name: 'Library', exact: true }).click(),
    ]) {
      await navigate();
      await expect(page.getByRole('alertdialog')).toContainText('Discard changes?');
      await page.getByRole('button', { name: 'Keep editing' }).click();
      await expect(editor(page)).toHaveValue('Draft retained');
    }
    expect(await stored(page, 'books')).toHaveLength(1);
    await page.getByRole('button', { name: 'Library', exact: true }).click();
    await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
    await page.getByLabel('Open PDF').setInputFiles(fixturePath('basic-3-pages.pdf'));
    await expect(page.getByRole('status')).toHaveText('Saved on this device.');
    await expect(page.getByTestId('book-title')).toContainText('basic-3-pages');
    await openPanel(page, 'Notes');
    await expect(notesPanel(page)).toContainText('No notes yet.');
    await page.getByRole('button', { name: 'Add note to this page' }).click();
    await editor(page).fill('New draft');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(notesPanel(page)).toContainText('No notes yet.');
  },
);

test('books isolate notes and book removal cascades both target types', async ({ page }) => {
  await passageNote(page, 'Book A passage');
  await pageNote(page, 'Book A page');
  await importBook(page, 'basic-3-pages.pdf');
  await pageNote(page, 'Book B page');
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await page.getByRole('button', { name: 'text-4-pages', exact: true }).click();
  await openPanel(page, 'Notes');
  await expect(page.locator('.note-row')).toHaveCount(2);
  await expect(notesPanel(page)).not.toContainText('Book B page');
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await page.getByRole('button', { name: 'Remove text-4-pages', exact: true }).click();
  await page.getByRole('button', { name: 'Delete everywhere' }).click();
  await expect(page.getByRole('button', { name: 'text-4-pages', exact: true })).toHaveCount(0);
  expect((await stored<Note>(page)).map((note) => note.text)).toEqual(['Book B page']);
  expect(await stored(page, 'highlights')).toEqual([]);
  await importBook(page, 'text-4-pages.pdf');
  await openPanel(page, 'Notes');
  await expect(notesPanel(page)).toContainText('No notes yet.');
});

test('keyboard newline, save, cancel/delete confirmation and jump keep usable focus', async ({
  page,
  browserName,
}) => {
  // Notes is a tab of the panel the toolbar's Contents opens (phase 20).
  const toggle = page
    .getByRole('toolbar', { name: 'Reader' })
    .getByRole('button', { name: 'Contents', exact: true });
  await toggle.focus();
  await page.keyboard.press('Enter');
  await keyboardToTab(page, browserName, 'Notes');
  await expect(page.getByRole('button', { name: 'Add note to this page' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(editor(page)).toBeFocused();
  await page.keyboard.type('Line one');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Line two');
  await expect(editor(page)).toHaveValue('Line one\nLine two');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(editor(page)).toHaveCount(0);
  await page.keyboard.press('ArrowDown');
  await expect(row(page, 'Line one').locator('.note-jump')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('reader')).toBeFocused();
  await row(page, 'Line one').getByRole('button', { name: 'Delete', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(
    row(page, 'Line one').getByRole('button', { name: 'Delete', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Enter');
  await expect(page.locator('.note-row')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add note to this page' })).toBeFocused();
});

test('a vector-only page accepts a page note without selectable text', async ({ page }) => {
  await importBook(page, 'no-text-1-page.pdf');
  await expect(page.locator('.textLayer span')).toHaveCount(0);
  await page.getByRole('button', { name: 'Bookmark this page' }).click();
  await expect(page.getByRole('button', { name: 'Remove bookmark' })).toBeVisible();
  await pageNote(page, 'No text needed');
  const [note] = await stored<Note>(page);
  const [mark] = await stored<{ pageIndex: number }>(page, 'bookmarks');
  expect(note?.target).toEqual({ kind: 'page', pageIndex: mark?.pageIndex });
});

test('page notes share Bookmark current-page selection and jump to a non-first page', async ({
  page,
}) => {
  await page.getByTestId('reader').evaluate((reader) => {
    const slot = reader.querySelector<HTMLElement>('[data-page-index="2"]');
    reader.scrollTop = slot?.offsetTop ?? 0;
  });
  await expect(pageSlot(page, 2)).toHaveAttribute('data-state', 'rendered');
  await page.getByRole('button', { name: 'Bookmark this page' }).click();
  await expect(page.getByRole('button', { name: 'Remove bookmark' })).toBeVisible();
  await pageNote(page, 'Third page thought');
  const [mark] = await stored<{ pageIndex: number }>(page, 'bookmarks');
  const [note] = await stored<Note>(page);
  expect(mark?.pageIndex).toBe(2);
  expect(note?.target).toEqual({ kind: 'page', pageIndex: mark?.pageIndex });
  await page.getByTestId('reader').evaluate((reader) => {
    reader.scrollTop = 0;
  });
  await row(page, 'Third page thought').locator('.note-jump').click();
  await expect(page.getByTestId('reader')).toBeFocused();
  await expect
    .poll(() =>
      pageSlot(page, 2).evaluate(
        (slot) =>
          slot.getBoundingClientRect().top -
          (slot.closest('[data-testid="reader"]')?.getBoundingClientRect().top ?? 0),
      ),
    )
    .toBeLessThanOrEqual(2);
  await expect(pageSlot(page, 2)).toBeInViewport();
});

test('different highlights on one page retain independent notes and existing targets offer Edit note', async ({
  page,
}) => {
  await passageNote(page, 'Bravo thought');
  await pressTool(page, 'Contents');
  await layoutReady(page);
  await clickHighlight(page);
  await page.getByRole('button', { name: 'Edit note', exact: true }).click();
  await expect(editor(page)).toHaveValue('Bravo thought');
  await save(page, 'Bravo edited');
  await pressTool(page, 'Contents');
  await highlight(page, 'Alpha one');
  const box = await page.locator('.highlight-box').first().boundingBox();
  if (!box) throw new Error('No Alpha highlight');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.getByRole('button', { name: 'Add note', exact: true }).click();
  await save(page, 'Alpha thought');
  await expect(page.locator('.note-text')).toHaveText(['Alpha thought', 'Bravo edited']);
  expect(await stored<Note>(page)).toHaveLength(2);
  await reopen(page);
  await openPanel(page, 'Notes');
  await expect(page.locator('.note-text')).toHaveText(['Alpha thought', 'Bravo edited']);
});

test('multiline and cross-page passage notes sort by PDF position and jump to their first box', async ({
  page,
}) => {
  await highlight(page, 'Bravo two', { pageIndex: 0, text: 'Delta four' });
  await clickHighlight(page);
  await page.getByRole('button', { name: 'Add note', exact: true }).click();
  await save(page, 'Middle passage');
  await expect(row(page, 'Middle passage')).toContainText('Charlie three');
  await pageNote(page, 'Page one');
  await pressTool(page, 'Contents');
  await layoutReady(page);
  await page.getByTestId('reader').evaluate((reader) => {
    const first = reader.querySelector<HTMLElement>('[data-page-index="0"]');
    reader.scrollTop = (first?.offsetTop ?? 0) + (first?.offsetHeight ?? 0) - 250;
  });
  await highlight(page, 'India nine', { pageIndex: 1, text: 'and Juliet ten' });
  const box = await pageSlot(page, 0).locator('.highlight-box').last().boundingBox();
  if (!box) throw new Error('No foot-of-page box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.getByRole('button', { name: 'Add note', exact: true }).click();
  await save(page, 'Across the break');
  await expect(row(page, 'Across the break')).toContainText('Juliet ten');
  expect(await page.locator('.note-text').allTextContents()).toEqual([
    'Page one',
    'Middle passage',
    'Across the break',
  ]);
  for (const note of await stored<Note>(page)) {
    expect(Object.keys(note.target).sort()).toEqual(
      note.target.kind === 'highlight'
        ? ['highlightId', 'kind', 'pageIndex']
        : ['kind', 'pageIndex'],
    );
  }
  const crossing = (await stored<Highlight>(page, 'highlights')).find(
    (item) => item.rects.length === 2,
  );
  expect(crossing?.rects.map((rect) => rect.pageIndex)).toEqual([0, 1]);
  await page.getByTestId('reader').evaluate((reader) => {
    reader.scrollTop = reader.scrollHeight;
  });
  await row(page, 'Across the break').locator('.note-jump').click();
  await expect(page.getByTestId('reader')).toBeFocused();
  const offset = () =>
    pageSlot(page, 0)
      .locator('.highlight-box')
      .last()
      .evaluate(
        (element) =>
          element.getBoundingClientRect().top -
          (element.closest('[data-testid="reader"]')?.getBoundingClientRect().top ?? 0),
      );
  await expect.poll(offset).toBeGreaterThanOrEqual(0);
  expect(await offset()).toBeLessThan(80);
  await row(page, 'Page one').locator('.note-jump').click();
  await expectPageAtTop(page, 0);
});

for (const name of ['iPhone 13', 'iPad (gen 7)'] as const) {
  test.describe(`notes touch ${name}`, { tag: '@touch-device' }, () => {
    const device = devices[name];
    test.use({
      hasTouch: true,
      isMobile: true,
      viewport: device.viewport,
      deviceScaleFactor: device.deviceScaleFactor,
      userAgent: device.userAgent,
    });
    test('tap add, edit, jump and delete for page and passage notes', async ({
      page,
    }, testInfo) => {
      await tapPanel(page, 'Notes');
      await page.getByRole('button', { name: 'Add note to this page' }).tap();
      await save(page, 'Touch page', true);
      await row(page, 'Touch page').getByRole('button', { name: 'Edit note' }).tap();
      await save(page, 'Touch page edited', true);
      await row(page, 'Touch page edited').locator('.note-jump').tap();
      await expect(page.getByTestId('reader')).toBeFocused();
      // Under 720 px the sheet closes after a jump; a docked panel stays, and is closed here.
      if (device.viewport.width < 720) await expect(notesPanel(page)).toHaveCount(0);
      else await tapContents(page);
      await highlight(page, 'Bravo two', undefined, true);
      await clickHighlight(page, true);
      await page.getByRole('button', { name: 'Add note', exact: true }).tap();
      await save(page, 'Touch passage', true);
      await row(page, 'Touch passage').getByRole('button', { name: 'Edit note' }).tap();
      const screenshot = testInfo.outputPath('notes-editor.png');
      await page.screenshot({ path: screenshot });
      await testInfo.attach('Notes editor on touch viewport', {
        path: screenshot,
        contentType: 'image/png',
      });
      await save(page, 'Touch passage edited', true);
      await reopen(page);
      await tapPanel(page, 'Notes');
      await expect(row(page, 'Touch page edited')).toHaveCount(1);
      await expect(row(page, 'Touch passage edited')).toHaveCount(1);
      await row(page, 'Touch passage edited').locator('.note-jump').tap();
      await expect(page.getByTestId('reader')).toBeFocused();
      if (!(await notesPanel(page).count())) await tapPanel(page, 'Notes');
      for (const text of ['Touch passage edited', 'Touch page edited']) {
        await row(page, text).getByRole('button', { name: 'Delete', exact: true }).tap();
        await page.getByRole('alertdialog').getByRole('button', { name: 'Delete note' }).tap();
        await expect(row(page, text)).toHaveCount(0);
      }
      expect(await stored(page, 'highlights')).toHaveLength(1);
      expect(await stored(page)).toHaveLength(0);
    });
  });
}
