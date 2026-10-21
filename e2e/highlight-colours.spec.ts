// Phase 21: highlight colours and the design's HighlightMenu over a selection; colours in the
// lists (Notes lists every highlight) and in the export. The clipboard, the share sheet and speech
// are stand-ins that record what they were given.
import { readFile } from 'node:fs/promises';
import { devices, expect, test, type Page } from '@playwright/test';
import { chooseTheme, importBook, openPanel, pageSlot } from './helpers';

declare global {
  interface Window {
    copied: string[];
    shared: { title?: string; text?: string }[];
    heard: string[];
  }
}

function standIns() {
  window.copied = [];
  window.shared = [];
  window.heard = [];
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async (text: string) => void window.copied.push(text) },
  });
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value: async (data: { title?: string; text?: string }) => void window.shared.push(data),
  });
  class FakeUtterance {
    text: string;
    rate = 1;
    lang = '';
    onend: ((event: unknown) => void) | null = null;
    onerror: ((event: { error: string }) => void) | null = null;
    constructor(text: string) {
      this.text = text;
    }
  }
  const synth = {
    speak(utterance: FakeUtterance) {
      window.heard.push(utterance.text);
      setTimeout(() => utterance.onend?.({}), 150);
    },
    cancel() {},
    pause() {},
    resume() {},
    getVoices: () => [],
  };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    configurable: true,
    value: FakeUtterance,
  });
}

const menu = (page: Page) => page.getByRole('toolbar', { name: 'Highlight' });
const swatches = (page: Page) => menu(page).getByRole('radiogroup', { name: 'Highlight colour' });
const boxes = (page: Page) => page.locator('.highlight-box');

/** Selects `words` on page 1, as a reader's drag would. */
async function select(page: Page, words: string) {
  const span = page.locator('[data-page-index="0"] .textLayer span', { hasText: words });
  await expect(span).toHaveCount(1);
  await span.evaluate((element, text) => {
    const node = element.firstChild;
    if (!(node instanceof Text)) throw new Error('no text');
    const at = node.data.indexOf(text);
    const range = document.createRange();
    range.setStart(node, at);
    range.setEnd(node, at + text.length);
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(range);
  }, words);
  await expect(menu(page)).toBeVisible();
}

async function clickHighlight(page: Page) {
  const box = await boxes(page).first().boundingBox();
  if (!box) throw new Error('no highlight');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(menu(page)).toBeVisible();
}

/** The fill a highlight box shows, and the theme's token for a colour. */
const fill = (page: Page) =>
  boxes(page)
    .first()
    .evaluate((box) => getComputedStyle(box).backgroundColor);
const token = (page: Page, colour: string) =>
  page.evaluate((name) => {
    const probe = document.createElement('span');
    probe.style.backgroundColor = `var(--hl-${name})`;
    document.body.append(probe);
    const value = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return value;
  }, colour);

// A viewport per describe (not set in beforeEach, which would override the phone sizes below).
test.use({ viewport: { width: 1280, height: 800 } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(standIns);
  await page.goto('/');
  await importBook(page, 'text-4-pages.pdf');
});

test('over a selection: four colours, a note, copy, share and listen; a colour makes the highlight', async ({
  page,
}) => {
  await select(page, 'Charlie three');
  await expect(swatches(page).getByRole('radio')).toHaveText(['', '', '', '']);
  expect(
    await swatches(page)
      .getByRole('radio')
      .evaluateAll((radios) => radios.map((radio) => radio.getAttribute('aria-label'))),
  ).toEqual(['Yellow', 'Green', 'Blue', 'Pink']);
  for (const name of ['Add note', 'Copy', 'Share', 'Listen from here']) {
    await expect(menu(page).getByRole('button', { name, exact: true })).toBeVisible();
  }
  await expect(menu(page).getByRole('button', { name: 'Remove highlight' })).toHaveCount(0);

  await swatches(page).getByRole('radio', { name: 'Green' }).click();
  await expect(boxes(page)).toHaveCount(1);
  await expect(boxes(page).first()).toHaveClass(/highlight-box--green/);
  await expect.poll(() => fill(page)).toBe(await token(page, 'green'));
  // The menu stays, now for the new highlight, so a note can follow.
  await expect(swatches(page).getByRole('radio', { name: 'Green' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(menu(page).getByRole('button', { name: 'Remove highlight' })).toBeVisible();
});

test('on a highlight: its colour is ringed, another recolours it, and it is kept after a reload', async ({
  page,
}) => {
  await select(page, 'Charlie three');
  await swatches(page).getByRole('radio', { name: 'Yellow' }).click();
  await expect(boxes(page)).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(menu(page)).toHaveCount(0);

  await clickHighlight(page);
  await expect(swatches(page).getByRole('radio', { name: 'Yellow' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  for (const name of ['Add note', 'Copy', 'Share', 'Listen from here', 'Remove highlight']) {
    await expect(menu(page).getByRole('button', { name, exact: true })).toBeVisible();
  }
  await swatches(page).getByRole('radio', { name: 'Blue' }).click();
  await expect(boxes(page).first()).toHaveClass(/highlight-box--blue/);
  await expect(boxes(page)).toHaveCount(1);

  await page.reload();
  await page
    .getByRole('list', { name: 'Your books' })
    .getByRole('button', { name: 'text-4-pages', exact: true })
    .click();
  await expect(boxes(page).first()).toHaveClass(/highlight-box--blue/);
});

test('a colour pressed while the highlight is saving is the one it gets', async ({ page }) => {
  await select(page, 'Charlie three');
  // Both presses land before the asynchronous save can finish.
  await swatches(page).evaluate((group) => {
    group.querySelector<HTMLButtonElement>('[aria-label="Yellow"]')?.click();
    group.querySelector<HTMLButtonElement>('[aria-label="Blue"]')?.click();
  });
  await expect(swatches(page).getByRole('radio', { name: 'Blue' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(boxes(page)).toHaveCount(1);
  await expect(page.locator('.highlight-box--blue')).toHaveCount(1);
});

test('the menu sits above the selection, below it near the top, and never covers it', async ({
  page,
}) => {
  // "Alpha one" scrolled to the very top of the reader: no room above it.
  await expect(
    page.locator('[data-page-index="0"] .textLayer span', { hasText: 'Alpha one' }),
  ).toHaveCount(1);
  await page.getByTestId('reader').evaluate((reader) => {
    const span = [...reader.querySelectorAll('[data-page-index="0"] .textLayer span')].find((s) =>
      s.textContent?.includes('Alpha one'),
    );
    const top = span?.getBoundingClientRect().top ?? 0;
    reader.scrollTop += top - reader.getBoundingClientRect().top - 10;
  });
  await page.waitForTimeout(400);
  await select(page, 'Alpha one');
  const near = await page.evaluate(() => {
    const range = document.getSelection()?.getRangeAt(0).getBoundingClientRect();
    const box = document.querySelector('.selection-actions')?.getBoundingClientRect();
    return {
      selTop: range?.top ?? 0,
      selBottom: range?.bottom ?? 0,
      top: box?.top ?? 0,
      bottom: box?.bottom ?? 0,
    };
  });
  expect(near.top).toBeGreaterThanOrEqual(near.selBottom);

  // Lower on the page there is room above.
  await page.getByTestId('reader').evaluate((reader) => {
    reader.scrollTop = 0;
    const span = [...reader.querySelectorAll('[data-page-index="0"] .textLayer span')].find((s) =>
      s.textContent?.includes('Charlie three'),
    );
    const top = span?.getBoundingClientRect().top ?? 0;
    reader.scrollTop += top - reader.getBoundingClientRect().top - 300;
  });
  await page.waitForTimeout(400);
  await select(page, 'Charlie three');
  const far = await page.evaluate(() => {
    const range = document.getSelection()?.getRangeAt(0).getBoundingClientRect();
    const box = document.querySelector('.selection-actions')?.getBoundingClientRect();
    return { selTop: range?.top ?? 0, bottom: box?.bottom ?? 0 };
  });
  expect(far.bottom).toBeLessThanOrEqual(far.selTop);
  for (const target of await menu(page).getByRole('button').all()) {
    const box = await target.boundingBox();
    expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(39.5);
  }
  for (const target of await swatches(page).getByRole('radio').all()) {
    const box = await target.boundingBox();
    expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(39.5);
  }
});

test('each colour draws with its theme’s fill, in Light, Sepia and Dark', async ({ page }) => {
  await select(page, 'Charlie three');
  await swatches(page).getByRole('radio', { name: 'Pink' }).click();
  await expect(boxes(page)).toHaveCount(1);
  for (const theme of ['Light', 'Sepia', 'Dark'] as const) {
    await chooseTheme(page, theme);
    await expect.poll(() => fill(page), theme).toBe(await token(page, 'pink'));
  }
});

test('a highlight saved before colours draws yellow', async ({ page }) => {
  await select(page, 'Charlie three');
  await swatches(page).getByRole('radio', { name: 'Green' }).click();
  await expect(boxes(page)).toHaveCount(1);
  // As stored by an earlier version: no colour at all.
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('book-reader');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const store = db.transaction('highlights', 'readwrite').objectStore('highlights');
      const all = store.getAll();
      all.onsuccess = () => {
        for (const record of all.result as { color?: string }[]) {
          delete record.color;
          store.put(record);
        }
        store.transaction.oncomplete = () => resolve();
      };
      all.onerror = () => reject(all.error);
    });
    db.close();
  });
  await page.reload();
  await page
    .getByRole('list', { name: 'Your books' })
    .getByRole('button', { name: 'text-4-pages', exact: true })
    .click();
  await expect(boxes(page).first()).toHaveClass(/highlight-box--yellow/);
});

test('Copy, Share and Listen from here', async ({ page }) => {
  await select(page, 'Charlie three');
  await menu(page).getByRole('button', { name: 'Copy' }).click();
  await expect.poll(() => page.evaluate(() => window.copied)).toEqual(['Charlie three']);

  await select(page, 'Charlie three');
  await swatches(page).getByRole('radio', { name: 'Yellow' }).click();
  await menu(page).getByRole('button', { name: 'Share' }).click();
  await expect
    .poll(() => page.evaluate(() => window.shared.map((item) => item.text ?? '')))
    .toEqual([expect.stringContaining('Charlie three')]);

  await clickHighlight(page);
  await menu(page).getByRole('button', { name: 'Listen from here' }).click();
  await expect.poll(() => page.evaluate(() => window.heard[0] ?? '')).toMatch(/^Charlie three/);
});

test('Listen from here on a passage across a page break starts where it starts', async ({
  page,
}) => {
  // Show the foot of page 1 and the top of page 2 together.
  await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');
  await page.getByTestId('reader').evaluate((reader) => {
    const first = reader.querySelector<HTMLElement>('[data-page-index="0"]');
    reader.scrollTop = (first?.offsetTop ?? 0) + (first?.offsetHeight ?? 0) - 250;
  });
  const tail = page.locator('[data-page-index="0"] .textLayer span', { hasText: 'India nine' });
  const head = page.locator('[data-page-index="1"] .textLayer span', { hasText: 'and Juliet ten' });
  await expect(tail).toHaveCount(1);
  await expect(head).toHaveCount(1);
  await page.evaluate(() => {
    const spans = [...document.querySelectorAll('.textLayer span')];
    const from = spans.find((span) => span.textContent?.startsWith('India nine'));
    const to = spans.find((span) => span.textContent?.startsWith('and Juliet ten'));
    if (!from?.firstChild || !to?.firstChild) throw new Error('no text');
    const range = document.createRange();
    range.setStart(from.firstChild, 0);
    range.setEnd(to.firstChild, 'and Juliet ten'.length);
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(range);
  });
  await expect(menu(page)).toBeVisible();
  await menu(page).getByRole('button', { name: 'Listen from here' }).click();
  await expect.poll(() => page.evaluate(() => window.heard[0] ?? '')).toMatch(/^India nine/);
});

test('Notes lists every highlight with its colour, and each row has a More menu', async ({
  page,
}) => {
  await select(page, 'Charlie three');
  await swatches(page).getByRole('radio', { name: 'Green' }).click();
  await page.keyboard.press('Escape');
  await select(page, 'Alpha one');
  await swatches(page).getByRole('radio', { name: 'Pink' }).click();
  await page.keyboard.press('Escape');

  await openPanel(page, 'Notes');
  await page.getByRole('button', { name: 'Add note to this page' }).click();
  await page.getByLabel('Note text').fill('About page one');
  await page.getByRole('button', { name: 'Save note' }).click();

  const rows = page.getByRole('list', { name: 'Book notes' }).getByRole('listitem');
  // In book order: the page note, then the highlights from the top of the page down.
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(1)).toContainText('Alpha one');
  await expect(rows.nth(2)).toContainText('Charlie three');
  await expect(rows.nth(1).locator('mark')).toHaveClass(/br-mark--pink/);
  await expect(rows.nth(2).locator('mark')).toHaveClass(/br-mark--green/);

  // More: Change colour.
  await rows.nth(2).getByRole('button', { name: 'More actions' }).click();
  const more = page.getByRole('menu', { name: 'More actions' });
  for (const name of ['Add note', 'Share', 'Copy', 'Remove highlight']) {
    await expect(more.getByRole('menuitem', { name, exact: true })).toBeVisible();
  }
  await more.getByRole('menuitemradio', { name: 'Blue' }).click();
  await expect(rows.nth(2).locator('mark')).toHaveClass(/br-mark--blue/);
  await expect(page.locator('.highlight-box--blue')).not.toHaveCount(0);

  // More: Copy, then Remove highlight (Delete is for a note; this highlight has none).
  await rows.nth(2).getByRole('button', { name: 'More actions' }).click();
  await page
    .getByRole('menu', { name: 'More actions' })
    .getByRole('menuitem', { name: 'Copy' })
    .click();
  await expect.poll(() => page.evaluate(() => window.copied.at(-1))).toBe('Charlie three');
  await rows.nth(2).getByRole('button', { name: 'More actions' }).click();
  await page
    .getByRole('menu', { name: 'More actions' })
    .getByRole('menuitem', { name: 'Remove highlight' })
    .click();
  await expect(rows).toHaveCount(2);
  await expect(page.locator('.highlight-box--blue')).toHaveCount(0);

  // A page note's More menu: Share (its text), Copy, Edit note and Delete; no colour.
  await rows.nth(0).getByRole('button', { name: 'More actions' }).click();
  await page
    .getByRole('menu', { name: 'More actions' })
    .getByRole('menuitem', { name: 'Share' })
    .click();
  await expect
    .poll(() => page.evaluate(() => window.shared.at(-1)?.text ?? ''))
    .toContain('About page one');
  await rows.nth(0).getByRole('button', { name: 'More actions' }).click();
  await expect(
    page.getByRole('menu', { name: 'More actions' }).getByRole('menuitem', { name: 'Delete' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await rows.nth(0).getByRole('button', { name: 'More actions' }).click();
  await expect(
    page.getByRole('menu', { name: 'More actions' }).getByRole('menuitemradio'),
  ).toHaveCount(0);
  await page
    .getByRole('menu', { name: 'More actions' })
    .getByRole('menuitem', { name: 'Edit note' })
    .click();
  await expect(page.getByLabel('Note text')).toHaveValue('About page one');
});

test('the export names each highlight’s colour', async ({ page }) => {
  await select(page, 'Charlie three');
  await swatches(page).getByRole('radio', { name: 'Green' }).click();
  await page.keyboard.press('Escape');
  await openPanel(page, 'Notes');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export highlights and notes' }).click(),
  ]);
  const markdown = await readFile(await download.path(), 'utf8');
  expect(markdown).toContain('> Charlie three\n\n*Green highlight*\n');
});

/** Every target in the menu is at least `size` px and inside `left`…`right` (CSS px). */
async function expectTargetsWithin(page: Page, left: number, right: number, size: number) {
  const targets = [
    ...(await menu(page).getByRole('button').all()),
    ...(await swatches(page).getByRole('radio').all()),
  ];
  expect(targets.length).toBeGreaterThan(0);
  for (const target of targets) {
    const box = await target.boundingBox();
    if (!box) throw new Error('a menu target has no box');
    expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(size - 0.5);
    expect(box.x).toBeGreaterThanOrEqual(left);
    expect(box.x + box.width).toBeLessThanOrEqual(right);
  }
}

test.describe('at 760 px', () => {
  test.use({ viewport: { width: 760, height: 800 } });

  test('beside a docked panel the menu stays over the pages, in two rows', async ({ page }) => {
    await openPanel(page, 'Notes');
    const pages = await page.getByTestId('reader').boundingBox();
    if (!pages) throw new Error('no pages');
    await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');
    await select(page, 'Charlie three');
    await swatches(page).getByRole('radio', { name: 'Green' }).click();
    await expect(menu(page).getByRole('button', { name: 'Remove highlight' })).toBeVisible();
    await expectTargetsWithin(page, pages.x, pages.x + pages.width, 40);
    await expect(page.locator('.br-hlmenu--stacked')).toHaveCount(1);
  });
});

for (const width of [390, 320]) {
  test.describe(`on a ${width} px phone`, () => {
    const { defaultBrowserType: _ignored, ...iphone } = devices['iPhone 13'];
    void _ignored;
    test.use({ ...iphone, viewport: { width, height: 700 } });

    test(
      'the menu’s targets are 44 px for a thumb, and all on screen',
      { tag: '@touch-device' },
      async ({ page }) => {
        await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');
        await select(page, 'Charlie three');
        await expectTargetsWithin(page, 0, width, 44);
        // Over the new highlight the menu has more actions (Voice note, Remove highlight).
        await swatches(page).getByRole('radio', { name: 'Green' }).tap();
        await expect(menu(page).getByRole('button', { name: 'Remove highlight' })).toBeVisible();
        await expectTargetsWithin(page, 0, width, 44);
        await menu(page).getByRole('button', { name: 'Remove highlight' }).tap();
        await expect(boxes(page)).toHaveCount(0);
      },
    );
  });
}
