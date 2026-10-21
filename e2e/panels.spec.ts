// Phase 20: the reader's panels from the Book Reader design system. One tabbed panel for Contents,
// Bookmarks and Notes, Search on its own, docked on the right from 720 px and a bottom sheet below.
import { expect, test, type Page } from '@playwright/test';
import { expectPageAtTop, importBook, pageSlot } from './helpers';

const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'Reader' });
const panel = (page: Page, name: string) => page.getByRole('complementary', { name });
const anyPanel = (page: Page) => page.locator('.br-panel');
const tabs = (page: Page) => page.getByRole('tablist', { name: 'Reader panels' });
const tree = (page: Page) => page.getByRole('list', { name: 'Contents' });

async function openContents(page: Page) {
  const contents = toolbar(page).getByRole('button', { name: 'Contents', exact: true });
  if (await contents.isVisible()) await contents.click();
  else {
    await toolbar(page).getByRole('button', { name: 'More' }).click();
    await page
      .getByRole('menu', { name: 'More' })
      .getByRole('menuitem', { name: 'Contents' })
      .click();
  }
  await expect(anyPanel(page)).toBeVisible();
  await settled(page);
}

/** Waits until a sheet has finished sliding up (200 ms). */
async function settled(page: Page) {
  await expect
    .poll(() =>
      anyPanel(page).evaluate((panel) =>
        panel.getAnimations().every((animation) => animation.playState !== 'running'),
      ),
    )
    .toBe(true);
}

/** Bookmarks page `index` through the toolbar, after scrolling it to the top. */
async function bookmarkPage(page: Page, index: number) {
  await page.getByTestId('reader').evaluate((reader, i) => {
    const slot = reader.querySelector<HTMLElement>(`[data-page-index="${i}"]`);
    reader.scrollTop = slot?.offsetTop ?? 0;
  }, index);
  await expect(pageSlot(page, index)).toHaveAttribute('data-state', 'rendered');
  await toolbar(page).getByRole('button', { name: 'Bookmark this page' }).click();
  await expect(toolbar(page).getByRole('button', { name: 'Remove bookmark' })).toBeVisible();
}

test.describe('one tabbed panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await importBook(page, 'outline-12-pages.pdf');
  });

  test('Contents, Bookmarks and Notes are tabs, with counts, a title and a Close button', async ({
    page,
  }) => {
    // The toolbar has no Bookmarks or Notes buttons any more.
    await expect(toolbar(page).getByRole('button', { name: 'Bookmarks', exact: true })).toHaveCount(
      0,
    );
    await expect(toolbar(page).getByRole('button', { name: 'Notes', exact: true })).toHaveCount(0);
    await bookmarkPage(page, 2);

    await openContents(page);
    await expect(panel(page, 'Contents')).toBeVisible();
    await expect(tabs(page).getByRole('tab')).toHaveText(['Contents', 'Bookmarks1', 'Notes0']);
    await expect(tabs(page).getByRole('tab', { name: 'Contents' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(panel(page, 'Contents').getByRole('heading', { name: 'Contents' })).toBeVisible();

    await tabs(page)
      .getByRole('tab', { name: /^Bookmarks/ })
      .click();
    await expect(panel(page, 'Bookmarks')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Bookmarks' })).toContainText('Page 3');

    // The arrow keys move between tabs, and the panel follows.
    await tabs(page)
      .getByRole('tab', { name: /^Bookmarks/ })
      .focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabs(page).getByRole('tab', { name: /^Notes/ })).toBeFocused();
    await expect(panel(page, 'Notes')).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(panel(page, 'Contents')).toBeVisible();

    await panel(page, 'Contents').getByRole('button', { name: 'Close Contents' }).click();
    await expect(anyPanel(page)).toHaveCount(0);
    await expect(
      toolbar(page).getByRole('button', { name: 'Contents', exact: true }),
    ).toBeFocused();
  });

  test('docks on the right at 380 px, with the page usable beside it, and stays after a choice', async ({
    page,
  }) => {
    for (const width of [1280, 820]) {
      await page.setViewportSize({ width, height: 800 });
      await openContents(page);
      const box = await anyPanel(page).boundingBox();
      expect(Math.round(box?.width ?? 0), `${width}`).toBe(380);
      expect(Math.round((box?.x ?? 0) + (box?.width ?? 0)), `${width}`).toBe(width);
      const reader = await page.getByTestId('reader').boundingBox();
      expect(reader?.width ?? 0, `${width}`).toBeGreaterThan(300);
      expect((reader?.x ?? 0) + (reader?.width ?? 0), `${width}`).toBeLessThanOrEqual(width - 379);
      await tree(page)
        .getByRole('button', { name: /^Chapter 2/ })
        .click();
      await expectPageAtTop(page, 4);
      await expect(anyPanel(page)).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(anyPanel(page)).toHaveCount(0);
    }
  });

  test('Escape closes the panel and focus goes back to the button that opened it', async ({
    page,
  }) => {
    await openContents(page);
    await expect(tree(page).locator(':focus')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(anyPanel(page)).toHaveCount(0);
    await expect(
      toolbar(page).getByRole('button', { name: 'Contents', exact: true }),
    ).toBeFocused();
  });
});

test('on a wide screen too, opening a panel with nothing to focus puts focus in it', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  // No table of contents in this book.
  await importBook(page, 'basic-3-pages.pdf');
  await openContents(page);
  await expect(page.getByText('This book has no table of contents.')).toBeVisible();
  expect(
    await page.evaluate(() =>
      document.querySelector('.br-panel')?.contains(document.activeElement),
    ),
  ).toBe(true);
});

test.describe('contents tree', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await importBook(page, 'outline-12-pages.pdf');
  });

  test('folds with a chevron, jumps with the title, and shows page numbers', async ({ page }) => {
    await openContents(page);
    const chapterOne = tree(page).getByRole('button', { name: /^Chapter 1/ });
    await expect(chapterOne).toBeVisible();
    await tree(page).getByRole('button', { name: 'Collapse Part One' }).click();
    await expect(chapterOne).toHaveCount(0);
    // The chevron's name says what a press does now.
    await expect(tree(page).getByRole('button', { name: 'Collapse Part One' })).toHaveCount(0);
    await tree(page).getByRole('button', { name: 'Expand Part One' }).click();
    await expect(chapterOne).toBeVisible();
    // Page numbers on the right of each title.
    await expect(tree(page).getByRole('button', { name: /^Chapter 3/ })).toContainText('9');
    for (const row of await tree(page).locator('.br-toc__link').all()) {
      const box = await row.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5);
    }
    await tree(page)
      .getByRole('button', { name: /^Part Two/ })
      .click();
    await expectPageAtTop(page, 7);
  });

  test('marks the chapter being read, opens its parents and scrolls it into view', async ({
    page,
  }) => {
    await openContents(page);
    await tree(page).getByRole('button', { name: 'Collapse Part Two' }).click();
    await page.keyboard.press('Escape');
    await page.getByTestId('reader').evaluate((reader) => {
      const slot = reader.querySelector<HTMLElement>('[data-page-index="9"]');
      reader.scrollTop = slot?.offsetTop ?? 0;
    });
    await expect(page.getByTestId('chapter')).toHaveText('Chapter 3');
    await openContents(page);
    const current = tree(page).locator('[aria-current="location"]');
    await expect(current).toHaveCount(1);
    await expect(current).toHaveAccessibleName('Chapter 3');
    await expect(current).toBeInViewport();
  });
});

test('the contents shows the book’s own page labels', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await importBook(page, 'labels-8-pages.pdf');
  await openContents(page);
  await expect(tree(page).locator('.br-toc__page')).toHaveText(['i', '1']);
});

test.describe('search panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await importBook(page, 'text-4-pages.pdf');
  });

  test('the field counts matches and steps through them; results show page and context', async ({
    page,
  }) => {
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+f' : 'Control+f');
    const search = panel(page, 'Search');
    await expect(search).toBeVisible();
    const field = search.getByRole('searchbox', { name: 'Search in book' });
    await expect(field).toBeFocused();
    await field.fill('page');
    const results = search.getByRole('list', { name: 'Search results' }).getByRole('button');
    await expect(results).toHaveCount(8);
    await expect(results.first()).toContainText('p. 1');
    await expect(results.first().locator('mark')).toHaveText(/page/i);

    const count = search.getByTestId('search-count');
    await field.press('Enter');
    await expect(count).toHaveText('1 of 8');
    await expect(results.nth(0)).toHaveAttribute('aria-current', 'true');
    await field.press('Enter');
    await expect(count).toHaveText('2 of 8');
    await field.press('Shift+Enter');
    await expect(count).toHaveText('1 of 8');
    await search.getByRole('button', { name: 'Next match' }).click();
    await expect(count).toHaveText('2 of 8');
    await search.getByRole('button', { name: 'Previous match' }).click();
    await expect(count).toHaveText('1 of 8');

    // The field's own Clear button empties it and keeps the cursor there.
    await search.getByRole('button', { name: 'Clear search' }).click();
    await expect(field).toHaveValue('');
    await expect(field).toBeFocused();
    await expect(search.getByRole('button', { name: 'Clear search' })).toHaveCount(0);
    await field.fill('page');
    await expect(results).toHaveCount(8);

    // Escape clears the field first, then closes the panel.
    await field.focus();
    await page.keyboard.press('Escape');
    await expect(field).toHaveValue('');
    await expect(search).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(anyPanel(page)).toHaveCount(0);
  });
});

test.describe('phones: bottom sheets', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 760 });
    await page.goto('/');
    await importBook(page, 'outline-12-pages.pdf');
  });

  test('the panel rises as a sheet, with a grabber over a scrim, and nothing scrolls sideways', async ({
    page,
  }) => {
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 760 });
      await openContents(page);
      await expect(anyPanel(page)).toHaveClass(/br-panel--sheet/);
      const box = await anyPanel(page).boundingBox();
      expect(Math.round(box?.x ?? 1), `${width}`).toBe(0);
      expect(Math.round(box?.width ?? 0), `${width}`).toBe(width);
      expect(Math.round((box?.y ?? 0) + (box?.height ?? 0)), `${width}`).toBe(760);
      expect(box?.height ?? 0, `${width}`).toBeLessThanOrEqual(760 * 0.88 + 1);
      await expect(anyPanel(page).locator('.br-panel__grabber')).toBeVisible();
      await expect(page.locator('.br-scrim')).toBeVisible();
      for (const tab of ['Bookmarks', 'Notes', 'Contents']) {
        await tabs(page)
          .getByRole('tab', { name: new RegExp(`^${tab}`) })
          .click();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
          ),
          `${width} ${tab}`,
        ).toBe(true);
      }
      await page.keyboard.press('Escape');
    }
  });

  test('a finger dragging the grabber down closes the sheet', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Touch input is driven through Chromium DevTools');
    await openContents(page);
    const grabber = await anyPanel(page).locator('.br-panel__grabber').boundingBox();
    if (!grabber) throw new Error('no grabber');
    const x = grabber.x + grabber.width / 2;
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', y: number) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
      });
    await touch('touchStart', grabber.y + 2);
    for (let y = grabber.y + 20; y <= grabber.y + 260; y += 40) await touch('touchMove', y);
    await touch('touchEnd', grabber.y + 260);
    await expect(anyPanel(page)).toHaveCount(0);
  });

  test('closes with the scrim, Escape, Close, a drag down, and after a choice', async ({
    page,
  }) => {
    const more = toolbar(page).getByRole('button', { name: 'More' });
    await openContents(page);
    await page.locator('.br-scrim').click({ position: { x: 20, y: 20 } });
    await expect(anyPanel(page)).toHaveCount(0);

    await openContents(page);
    await page.keyboard.press('Escape');
    await expect(anyPanel(page)).toHaveCount(0);
    await expect(more).toBeFocused();

    await openContents(page);
    await anyPanel(page).getByRole('button', { name: 'Close Contents' }).click();
    await expect(anyPanel(page)).toHaveCount(0);

    await openContents(page);
    const grabber = await anyPanel(page).locator('.br-panel__grabber').boundingBox();
    if (!grabber) throw new Error('no grabber');
    const x = grabber.x + grabber.width / 2;
    await page.mouse.move(x, grabber.y + 2);
    await page.mouse.down();
    for (let y = grabber.y + 20; y <= grabber.y + 260; y += 40) await page.mouse.move(x, y);
    await page.mouse.up();
    await expect(anyPanel(page)).toHaveCount(0);

    // A short drag snaps back.
    await openContents(page);
    const again = await anyPanel(page).locator('.br-panel__grabber').boundingBox();
    if (!again) throw new Error('no grabber');
    await page.mouse.move(x, again.y + 2);
    await page.mouse.down();
    await page.mouse.move(x, again.y + 30);
    await page.mouse.up();
    await expect(anyPanel(page)).toBeVisible();

    await tree(page)
      .getByRole('button', { name: /^Chapter 2/ })
      .click();
    await expect(anyPanel(page)).toHaveCount(0);
    await expectPageAtTop(page, 4);
  });

  test('the keyboard stays in the sheet: Tab and Shift+Tab wrap around inside it', async ({
    page,
    browserName,
  }) => {
    await openContents(page);
    const option = browserName === 'webkit' ? 'Alt+' : '';
    const inSheet = () =>
      page.evaluate(() => document.querySelector('.br-panel')?.contains(document.activeElement));
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press(`${option}Tab`);
      expect(await inSheet(), `Tab ${i + 1}`).toBe(true);
    }
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press(`${option}Shift+Tab`);
      expect(await inSheet(), `Shift+Tab ${i + 1}`).toBe(true);
    }
  });

  test('a panel with nothing in it still takes focus, and Tab never leaves the sheet', async ({
    page,
    browserName,
  }) => {
    const inSheet = () =>
      page.evaluate(() => document.querySelector('.br-panel')?.contains(document.activeElement));
    // No bookmarks yet: the Bookmarks tab has nothing to focus.
    await openContents(page);
    await tabs(page)
      .getByRole('tab', { name: /^Bookmarks/ })
      .click();
    await page.keyboard.press('Escape');
    await expect(anyPanel(page)).toHaveCount(0);
    await openContents(page);
    await expect(panel(page, 'Bookmarks')).toBeVisible();
    expect(await inSheet()).toBe(true);
    const option = browserName === 'webkit' ? 'Alt+' : '';
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press(`${option}Tab`);
      expect(await inSheet(), `Tab ${i + 1}`).toBe(true);
    }
    await page.keyboard.press('Escape');

    // Safari's own Tab (no Option) skips buttons: from the search field it must not reach the
    // pages under the scrim either.
    await toolbar(page).getByRole('button', { name: 'More' }).click();
    await page
      .getByRole('menu', { name: 'More' })
      .getByRole('menuitem', { name: 'Search' })
      .click();
    await expect(page.getByRole('searchbox', { name: 'Search in book' })).toBeFocused();
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      expect(await inSheet(), `plain Tab ${i + 1}`).toBe(true);
    }
  });

  test('More holds Contents and Search; the compact toolbar starts below 720 px', async ({
    page,
  }) => {
    await toolbar(page).getByRole('button', { name: 'More' }).click();
    await expect(page.getByRole('menu', { name: 'More' }).getByRole('menuitem')).toHaveText([
      'Contents',
      'Search',
    ]);
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 719, height: 760 });
    await expect(toolbar(page).getByRole('button', { name: 'More' })).toBeVisible();
    await page.setViewportSize({ width: 720, height: 760 });
    await expect(toolbar(page).getByRole('button', { name: 'More' })).toHaveCount(0);
    await expect(
      toolbar(page).getByRole('button', { name: 'Contents', exact: true }),
    ).toBeVisible();
  });

  test('the sheet slides in 200 ms, and does not move under reduced motion', async ({ page }) => {
    await openContents(page);
    const motion = () =>
      anyPanel(page).evaluate((element) => {
        const style = getComputedStyle(element);
        return `${style.animationName} ${style.animationDuration}`;
      });
    expect(await motion()).toMatch(/ 0\.2s$/);
    await page.keyboard.press('Escape');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openContents(page);
    expect(await motion()).toMatch(/(^none |0s$)/);
  });
});

test.describe('opening the right tab', () => {
  test('Add note on a page opens Notes; rows are divided by hairlines', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await importBook(page, 'text-4-pages.pdf');
    await openContents(page);
    await tabs(page)
      .getByRole('tab', { name: /^Notes/ })
      .click();
    await page.getByRole('button', { name: 'Add note to this page' }).click();
    await page.getByLabel('Note text').fill('A thought');
    await page.getByRole('button', { name: 'Save note' }).click();
    await expect(tabs(page).getByRole('tab', { name: /^Notes/ })).toHaveText('Notes1');
    const row = page.locator('.note-row').first();
    await expect(row).toHaveCSS('border-bottom-width', '1px');
    await page.keyboard.press('Escape');
    await expect(anyPanel(page)).toHaveCount(0);

    // A highlight's Add note opens the Notes tab.
    const first = page.locator('[data-page-index="0"] .textLayer span').first();
    await expect(first).toBeAttached();
    await first.evaluate((span) => {
      const range = document.createRange();
      range.selectNodeContents(span);
      document.getSelection()?.removeAllRanges();
      document.getSelection()?.addRange(range);
    });
    await page.getByRole('button', { name: 'Highlight', exact: true }).click();
    const box = await page.locator('.highlight-box').first().boundingBox();
    if (!box) throw new Error('no highlight');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.getByRole('button', { name: 'Add note', exact: true }).click();
    await expect(panel(page, 'Notes')).toBeVisible();
    await expect(tabs(page).getByRole('tab', { name: /^Notes/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});

test.describe('rows', () => {
  test('note and voice note rows give the page and the chapter', async ({ page }) => {
    // A 440 Hz tone stands in for the microphone (as in voice-notes.spec.ts).
    await page.addInitScript(() => {
      MediaDevices.prototype.getUserMedia = async () => {
        const context = new AudioContext();
        const tone = context.createOscillator();
        const output = context.createMediaStreamDestination();
        tone.connect(output);
        tone.start();
        return output.stream;
      };
    });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await importBook(page, 'outline-12-pages.pdf');
    await page.getByTestId('reader').evaluate((reader) => {
      const slot = reader.querySelector<HTMLElement>('[data-page-index="5"]');
      reader.scrollTop = slot?.offsetTop ?? 0;
    });
    await expect(page.getByTestId('chapter')).toHaveText('Chapter 2');
    await openContents(page);
    await tabs(page)
      .getByRole('tab', { name: /^Notes/ })
      .click();
    await page.getByRole('button', { name: 'Add note to this page' }).click();
    await page.getByLabel('Note text').fill('In the second chapter');
    await page.getByRole('button', { name: 'Save note' }).click();
    await expect(page.locator('.note-row').first()).toContainText('Page note · Page 6 · Chapter 2');

    if (!(await page.evaluate(() => typeof MediaRecorder !== 'undefined'))) return;
    await page.getByRole('button', { name: 'Record voice note on this page' }).click();
    await expect(page.getByText(/^Recording on page/)).toBeVisible();
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: 'Stop and save' }).click();
    const voice = page.getByRole('list', { name: 'Book voice notes' }).getByRole('listitem');
    await expect(voice).toHaveCount(1);
    await expect(voice.first()).toContainText(/^Page · Page 6 · 0:0\d · Chapter 2/);
  });
});
