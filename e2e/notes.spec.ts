import { devices, expect, test, type Page } from '@playwright/test';
import type { Note } from '../src/core/notes';
import type { Highlight } from '../src/core/highlights';
import { expectPageAtTop, fixturePath, importBook, pageSlot } from './helpers';

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
  if (!(await notesPanel(page).count()))
    await page.getByRole('button', { name: 'Notes', exact: true }).click();
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
  await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await importBook(page, 'text-4-pages.pdf');
});

test('page notes save multiline text and survive reopening', async ({ page }) => {
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await page.getByRole('button', { name: 'Add note to this page', exact: true }).click();
  await page.getByRole('textbox', { name: 'Note text' }).fill('First thought\n第二行 📖');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(editor(page)).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Notes' })).toContainText('第二行 📖');
  await reopen(page);
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Notes' })).toContainText('第二行 📖');
});

test('an existing highlight accepts a passage note', async ({ page }) => {
  const span = page.locator('[data-page-index="0"] .textLayer span', { hasText: 'Bravo two' });
  await expect(span).toHaveCount(1);
  await span.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(range);
  });
  await page.getByRole('button', { name: 'Highlight', exact: true }).click();
  await expect(page.locator('.highlight-box')).toHaveCount(1);
  const box = await page.locator('.highlight-box').boundingBox();
  if (!box) throw new Error('No highlight');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.getByRole('button', { name: 'Add note', exact: true }).click();
  await page.getByRole('textbox', { name: 'Note text' }).fill('A passage thought');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Note text' })).toHaveCount(0);
  await expect(page.locator('.note-row')).toContainText('A passage thought');
  await reopen(page);
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Notes' })).toContainText('A passage thought');
  await expect(page.getByRole('navigation', { name: 'Notes' })).toContainText('Bravo two');
});

test('note actions remain fully reachable for a highlight near the reader bottom', async ({
  page,
}) => {
  await highlight(page);
  await page.setViewportSize({ width: 1280, height: 360 });
  await layoutReady(page);
  await page.getByTestId('reader').evaluate((reader) => {
    const box = reader.querySelector('.highlight-box')?.getBoundingClientRect();
    if (box) reader.scrollTop += box.bottom - reader.getBoundingClientRect().bottom + 16;
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
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
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
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await expect(notesPanel(page)).toContainText('No notes yet.');
  await expect(page.locator('.highlight-box')).toHaveCount(1);
});

test('highlight removal confirms both, rolls back on failure, and leaves other notes alone', async ({
  page,
}) => {
  await passageNote(page, 'Linked');
  await pageNote(page, 'Independent');
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
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
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await expect(page.locator('.note-row')).toHaveCount(1);
  await expect(notesPanel(page)).toContainText('Independent');
});

test('save/delete failures retain text and saved data and permit retry', async ({ page }) => {
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await page.getByRole('button', { name: 'Add note to this page' }).click();
  await editor(page).fill('Retained\nΔ 📚');
  await failNext(page, 'put');
  await page.getByRole('button', { name: 'Save note' }).click();
  await expect(notesPanel(page).getByRole('alert')).toContainText("isn't enough storage");
  await expect(editor(page)).toHaveValue('Retained\nΔ 📚');
  expect(await stored<Note>(page)).toEqual([]);
  await save(page, 'Retained\nΔ 📚');
  await failNext(page, 'delete');
  await row(page, 'Retained').getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete note' }).click();
  await expect(notesPanel(page).getByRole('alert')).toContainText("isn't enough storage");
  await expect(row(page, 'Retained')).toHaveCount(1);
  expect(await stored<Note>(page)).toHaveLength(1);
  await row(page, 'Retained').getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete note' }).click();
  await expect(page.locator('.note-row')).toHaveCount(0);
});

test('changed text is guarded across panel close/switch, note choice, Library and file opening', async ({
  page,
}) => {
  await pageNote(page, 'Saved page');
  await passageNote(page, 'Saved passage');
  await row(page, 'Saved page').getByRole('button', { name: 'Edit note' }).click();
  await editor(page).fill('Draft retained');
  for (const navigate of [
    () => page.getByRole('button', { name: 'Notes', exact: true }).click(),
    () => page.getByRole('button', { name: 'Contents', exact: true }).click(),
    () => page.keyboard.press('Escape'),
    () => row(page, 'Saved passage').getByRole('button', { name: 'Edit note' }).click(),
    () => row(page, 'Saved passage').locator('.note-jump').click(),
    () => page.getByRole('button', { name: 'Library', exact: true }).click(),
    () => page.getByLabel('Open PDF').setInputFiles(fixturePath('basic-3-pages.pdf')),
  ]) {
    await navigate();
    await expect(page.getByRole('alertdialog')).toContainText('Discard changes?');
    await page.getByRole('button', { name: 'Keep editing' }).click();
    await expect(editor(page)).toHaveValue('Draft retained');
  }
  expect(await stored(page, 'books')).toHaveLength(1);
  await page.getByLabel('Open PDF').setInputFiles(fixturePath('basic-3-pages.pdf'));
  await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Saved on this device.');
  await expect(page.getByTestId('book-info')).toContainText('basic-3-pages');
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await expect(notesPanel(page)).toContainText('No notes yet.');
  await page.getByRole('button', { name: 'Add note to this page' }).click();
  await editor(page).fill('New draft');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(notesPanel(page)).toContainText('No notes yet.');
});

test('books isolate notes and book removal cascades both target types', async ({ page }) => {
  await passageNote(page, 'Book A passage');
  await pageNote(page, 'Book A page');
  await importBook(page, 'basic-3-pages.pdf');
  await pageNote(page, 'Book B page');
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await page.getByRole('button', { name: 'text-4-pages', exact: true }).click();
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await expect(page.locator('.note-row')).toHaveCount(2);
  await expect(notesPanel(page)).not.toContainText('Book B page');
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await page.getByRole('button', { name: 'Remove text-4-pages', exact: true }).click();
  await page.getByRole('button', { name: 'Delete everywhere' }).click();
  await expect(page.getByRole('button', { name: 'text-4-pages', exact: true })).toHaveCount(0);
  expect((await stored<Note>(page)).map((note) => note.text)).toEqual(['Book B page']);
  expect(await stored(page, 'highlights')).toEqual([]);
  await importBook(page, 'text-4-pages.pdf');
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await expect(notesPanel(page)).toContainText('No notes yet.');
});

test('keyboard newline, save, cancel/delete confirmation and jump keep usable focus', async ({
  page,
}) => {
  const toggle = page.getByRole('button', { name: 'Notes', exact: true });
  await toggle.focus();
  await page.keyboard.press('Enter');
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
  await page.getByRole('button', { name: 'Bookmark page', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Bookmark page', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await pageNote(page, 'No text needed');
  const [note] = await stored<Note>(page);
  const [mark] = await stored<{ pageIndex: number }>(page, 'bookmarks');
  expect(note?.target).toEqual({ kind: 'page', pageIndex: mark?.pageIndex });
});

test('a failed notes load disables creation with a readable reason and Retry recovers', async ({
  page,
}) => {
  await pageNote(page, 'Read me again');
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await page.evaluate(() => {
    const original = IDBIndex.prototype.getAll;
    IDBIndex.prototype.getAll = function (...args) {
      if (this.objectStore.name === 'notes') {
        IDBIndex.prototype.getAll = original;
        throw new DOMException('Injected read failure', 'UnknownError');
      }
      return Reflect.apply(original, this, args);
    };
  });
  await page.getByRole('button', { name: 'text-4-pages', exact: true }).click();
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await expect(notesPanel(page)).toContainText("This book's notes couldn't be read.");
  await expect(page.getByRole('button', { name: 'Add note to this page' })).toBeDisabled();
  await page.getByRole('button', { name: 'Retry notes' }).click();
  await expect(row(page, 'Read me again')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Add note to this page' })).toBeEnabled();
});

test('an unsaved book cannot create notes and shows why', async ({ page }) => {
  await failNext(page, 'put', 'books');
  await page.getByLabel('Open PDF').setInputFiles(fixturePath('basic-3-pages.pdf'));
  await expect(page.getByTestId('book-info')).toContainText('basic-3-pages');
  await expect(page.getByRole('alert')).toContainText("isn't enough storage");
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await expect(notesPanel(page)).toContainText('Notes need this book saved on this device.');
  await expect(page.getByRole('button', { name: 'Add note to this page' })).toBeDisabled();
});

test('page notes share Bookmark current-page selection and jump to a non-first page', async ({
  page,
}) => {
  await page.getByTestId('reader').evaluate((reader) => {
    const slot = reader.querySelector<HTMLElement>('[data-page-index="2"]');
    reader.scrollTop = slot?.offsetTop ?? 0;
  });
  await expect(pageSlot(page, 2)).toHaveAttribute('data-state', 'rendered');
  const bookmark = page.getByRole('button', { name: 'Bookmark page', exact: true });
  await bookmark.click();
  await expect(bookmark).toHaveAttribute('aria-pressed', 'true');
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
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await layoutReady(page);
  await clickHighlight(page);
  await page.getByRole('button', { name: 'Edit note', exact: true }).click();
  await expect(editor(page)).toHaveValue('Bravo thought');
  await save(page, 'Bravo edited');
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await highlight(page, 'Alpha one');
  const box = await page.locator('.highlight-box').first().boundingBox();
  if (!box) throw new Error('No Alpha highlight');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.getByRole('button', { name: 'Add note', exact: true }).click();
  await save(page, 'Alpha thought');
  await expect(page.locator('.note-text')).toHaveText(['Alpha thought', 'Bravo edited']);
  expect(await stored<Note>(page)).toHaveLength(2);
  await reopen(page);
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
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
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
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
  test.describe(`notes touch ${name}`, () => {
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
      await page.getByRole('button', { name: 'Notes', exact: true }).tap();
      await page.getByRole('button', { name: 'Add note to this page' }).tap();
      await save(page, 'Touch page', true);
      await row(page, 'Touch page').getByRole('button', { name: 'Edit note' }).tap();
      await save(page, 'Touch page edited', true);
      await row(page, 'Touch page edited').locator('.note-jump').tap();
      await expect(page.getByTestId('reader')).toBeFocused();
      if (device.viewport.width < 700) await expect(notesPanel(page)).toHaveCount(0);
      else await page.getByRole('button', { name: 'Notes', exact: true }).tap();
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
      await page.getByRole('button', { name: 'Notes', exact: true }).tap();
      await expect(row(page, 'Touch page edited')).toHaveCount(1);
      await expect(row(page, 'Touch passage edited')).toHaveCount(1);
      await row(page, 'Touch passage edited').locator('.note-jump').tap();
      await expect(page.getByTestId('reader')).toBeFocused();
      if (!(await notesPanel(page).count()))
        await page.getByRole('button', { name: 'Notes', exact: true }).tap();
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
