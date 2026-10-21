// Phase 19: the reader's chrome from the Book Reader design system. The toolbar, its compact form
// and fading, Reading settings (theme, zoom, fit) and the page pill.
import { expect, test, type Page } from '@playwright/test';
import { importBook, pageSlot } from './helpers';

const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'Reader' });
const settingsButton = (page: Page) => page.getByRole('button', { name: 'Reading settings' });
const settings = (page: Page) => page.getByRole('dialog', { name: 'Reading settings' });
const pill = (page: Page) => page.getByTestId('page-pill');
/** The pill's words, its parts joined as the design's dot separates them. */
const pillText = (page: Page) =>
  pill(page).evaluate((element) =>
    [...element.children]
      .map((part) => part.textContent ?? '')
      .filter(Boolean)
      .join(' · '),
  );

async function toolNames(page: Page): Promise<string[]> {
  return toolbar(page)
    .getByRole('button')
    .evaluateAll((buttons) =>
      buttons
        .filter((button) => button.getBoundingClientRect().width > 0)
        .map((button) => button.getAttribute('aria-label') ?? ''),
    );
}

/** Scrolls the pages with the mouse wheel, as a reader would. */
async function wheel(page: Page, by = 400) {
  const box = await page.getByTestId('reader').boundingBox();
  if (!box) throw new Error('no reader');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, by);
}

test.describe('toolbar', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
  });

  test('shows the tools in the designed order, each named and titled', async ({ page }) => {
    await importBook(page, 'text-4-pages.pdf');
    expect(await toolNames(page)).toEqual([
      'Library',
      'Contents',
      'Bookmarks',
      'Notes',
      'Search',
      'Listen',
      'Reading settings',
      'Bookmark this page',
    ]);
    const untitled = await toolbar(page)
      .getByRole('button')
      .evaluateAll((buttons) =>
        buttons
          .filter((button) => button.getAttribute('title') !== button.getAttribute('aria-label'))
          .map((button) => button.getAttribute('aria-label')),
      );
    expect(untitled).toEqual([]);
  });

  test('the open tool and a bookmarked page show pressed', async ({ page }) => {
    await importBook(page, 'text-4-pages.pdf');
    const contents = toolbar(page).getByRole('button', { name: 'Contents' });
    await contents.click();
    await expect(contents).toHaveAttribute('aria-expanded', 'true');
    await expect(contents).toHaveClass(/is-pressed/);
    await contents.click();
    await expect(contents).toHaveAttribute('aria-expanded', 'false');

    await toolbar(page).getByRole('button', { name: 'Bookmark this page' }).click();
    const remove = toolbar(page).getByRole('button', { name: 'Remove bookmark' });
    await expect(remove).toHaveClass(/is-pressed/);
    await remove.click();
    await expect(toolbar(page).getByRole('button', { name: 'Bookmark this page' })).not.toHaveClass(
      /is-pressed/,
    );
  });

  test('shows the book’s title and the chapter, which follows the reader', async ({ page }) => {
    await importBook(page, 'outline-12-pages.pdf');
    await expect(page.getByTestId('book-title')).toHaveText('outline-12-pages');
    await expect(page.getByTestId('chapter')).toHaveText('Part One');
    await toolbar(page).getByRole('button', { name: 'Contents' }).click();
    await page.getByRole('button', { name: 'Chapter 2', exact: true }).click();
    await expect(page.getByTestId('chapter')).toHaveText('Chapter 2');
  });

  test('Open PDF is in the library only', async ({ page }) => {
    await importBook(page, 'text-4-pages.pdf');
    await expect(page.getByLabel('Open PDF')).toHaveCount(0);
    await toolbar(page).getByRole('button', { name: 'Library' }).click();
    await expect(page.getByLabel('Open PDF')).toHaveCount(1);
  });
});

test.describe('fading', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await importBook(page, 'text-4-pages.pdf');
  });

  test('fades while the reader scrolls and comes back on a tap on the page', async ({ page }) => {
    await expect(toolbar(page)).toHaveAttribute('data-hidden', 'false');
    await wheel(page);
    await expect(toolbar(page)).toHaveAttribute('data-hidden', 'true');
    await expect
      .poll(() => toolbar(page).evaluate((bar) => getComputedStyle(bar).opacity))
      .toBe('0');
    const box = await page.getByTestId('reader').boundingBox();
    if (!box) throw new Error('no reader');
    await page.mouse.click(box.x + 20, box.y + box.height / 2);
    await expect(toolbar(page)).toHaveAttribute('data-hidden', 'false');
  });

  test('comes back when a toolbar control gets keyboard focus', async ({ page, browserName }) => {
    await wheel(page);
    await expect(toolbar(page)).toHaveAttribute('data-hidden', 'true');
    await page.getByTestId('reader').focus();
    // Safari's Tab skips buttons unless Option is held, as its users do.
    await page.keyboard.press(browserName === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab');
    await expect(toolbar(page).locator(':focus')).toHaveCount(1);
    await expect(toolbar(page)).toHaveAttribute('data-hidden', 'false');
  });

  test('never hides while a panel or Reading settings is open', async ({ page }) => {
    await toolbar(page).getByRole('button', { name: 'Contents' }).click();
    await wheel(page);
    await page.waitForTimeout(300);
    await expect(toolbar(page)).toHaveAttribute('data-hidden', 'false');
    await toolbar(page).getByRole('button', { name: 'Contents' }).click();

    await settingsButton(page).click();
    await wheel(page);
    await page.waitForTimeout(300);
    await expect(toolbar(page)).toHaveAttribute('data-hidden', 'false');
  });

  test('a panel opening brings a faded toolbar back', async ({ page }) => {
    await wheel(page);
    await expect(toolbar(page)).toHaveAttribute('data-hidden', 'true');
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+f' : 'Control+f');
    await expect(page.locator('#search-panel')).toBeVisible();
    await expect(toolbar(page)).toHaveAttribute('data-hidden', 'false');
  });

  test('under reduced motion it hides at once, without a transition', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const duration = await toolbar(page).evaluate(
      (bar) => getComputedStyle(bar).transitionDuration,
    );
    expect(duration.split(',').every((part) => parseFloat(part) === 0)).toBe(true);
    await wheel(page);
    await expect(toolbar(page)).toHaveAttribute('data-hidden', 'true');
  });
});

test.describe('Reading settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await importBook(page, 'text-4-pages.pdf');
  });

  test('the theme applies at once to the chrome and the pages, and is kept', async ({ page }) => {
    await settingsButton(page).click();
    await expect(settingsButton(page)).toHaveAttribute('aria-expanded', 'true');
    const theme = settings(page).getByRole('radiogroup', { name: 'Theme' });
    await expect(theme.getByRole('radio', { name: 'Light' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await theme.getByRole('radio', { name: 'Dark' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(pageSlot(page, 0)).toHaveCSS('filter', 'invert(0.9) hue-rotate(180deg)');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('zoom steps through the designed levels; Fit switches between width, page and custom', async ({
    page,
  }) => {
    await settingsButton(page).click();
    const fit = settings(page).getByRole('radiogroup', { name: 'Fit' });
    const value = settings(page).getByTestId('zoom-value');
    await expect(fit.getByRole('radio', { name: 'Width' })).toHaveAttribute('aria-checked', 'true');
    const widthPercent = parseInt((await value.textContent()) ?? '', 10);
    expect(widthPercent).toBeGreaterThan(25);

    await settings(page).getByRole('button', { name: 'Zoom in' }).click();
    await expect(fit.getByRole('radio', { name: 'Custom' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    const levels = [25, 50, 67, 75, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400];
    const next = levels.find((level) => level > widthPercent + 0.5);
    await expect(value).toHaveText(`${next}%`);

    await fit.getByRole('radio', { name: 'Page' }).click();
    await expect(fit.getByRole('radio', { name: 'Page' })).toHaveAttribute('aria-checked', 'true');
    const pagePercent = (await value.textContent()) ?? '';
    expect(parseInt(pagePercent, 10)).toBeLessThan(widthPercent);

    // Custom keeps the zoom now shown.
    await fit.getByRole('radio', { name: 'Custom' }).click();
    await expect(fit.getByRole('radio', { name: 'Custom' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(value).toHaveText(pagePercent);

    await fit.getByRole('radio', { name: 'Width' }).click();
    await expect(value).toHaveText(`${widthPercent}%`);
  });

  test('closes with Escape or a click outside, and focus goes back to its button', async ({
    page,
  }) => {
    await settingsButton(page).click();
    await expect(settings(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(settings(page)).toHaveCount(0);
    await expect(settingsButton(page)).toBeFocused();
    await expect(settingsButton(page)).toHaveAttribute('aria-expanded', 'false');

    await settingsButton(page).click();
    await expect(settings(page)).toBeVisible();
    const box = await page.getByTestId('reader').boundingBox();
    if (!box) throw new Error('no reader');
    await page.mouse.click(box.x + 20, box.y + box.height - 20);
    await expect(settings(page)).toHaveCount(0);
  });
});

test.describe('page pill', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
  });

  test('says the page and how far in, shows while scrolling and fades once settled', async ({
    page,
  }) => {
    await importBook(page, 'text-4-pages.pdf');
    await expect.poll(() => pillText(page)).toBe('Page 1 of 4 · 25%');
    await wheel(page, 1400);
    await expect(pill(page)).toHaveAttribute('data-visible', 'true');
    await expect.poll(() => pillText(page)).toBe('Page 2 of 4 · 50%');
    await expect(pill(page)).toHaveAttribute('data-visible', 'false', { timeout: 3000 });
    await expect(page.getByTestId('page-announcement')).toHaveText('Page 2 of 4 · 50%');
  });

  test('uses the book’s own page labels', async ({ page }) => {
    await importBook(page, 'labels-8-pages.pdf');
    await expect.poll(() => pillText(page)).toBe('Page i of 5 · 13%');
    await toolbar(page).getByRole('button', { name: 'Bookmark this page' }).focus();
    await page.getByTestId('reader').evaluate((reader) => {
      const slot = reader.querySelector<HTMLElement>('[data-page-index="3"]');
      reader.scrollTop = slot?.offsetTop ?? 0;
    });
    await expect.poll(() => pillText(page)).toBe('Page 1 of 5 · 50%');
    await expect(pill(page)).toHaveAttribute('data-visible', 'true');
  });
});

test.describe('phones', () => {
  for (const width of [320, 390]) {
    test(`at ${width} px the toolbar is compact, with the panels under More`, async ({ page }) => {
      await page.setViewportSize({ width, height: 760 });
      await page.goto('/');
      await importBook(page, 'text-4-pages.pdf');
      expect(await toolNames(page)).toEqual([
        'Library',
        'Listen',
        'Reading settings',
        'Bookmark this page',
        'More',
      ]);
      const more = toolbar(page).getByRole('button', { name: 'More' });
      await more.click();
      await expect(more).toHaveAttribute('aria-expanded', 'true');
      const menu = page.getByRole('menu', { name: 'More' });
      await expect(menu.getByRole('menuitem')).toHaveText([
        'Contents',
        'Bookmarks',
        'Notes',
        'Search',
      ]);
      for (const element of await page.locator('header button, [role="menu"] button').all()) {
        const box = await element.boundingBox();
        if (!box || box.width === 0) continue;
        expect(
          Math.min(box.width, box.height),
          (await element.getAttribute('aria-label')) ?? (await element.textContent()) ?? '',
        ).toBeGreaterThanOrEqual(43.5);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);
      await menu.getByRole('menuitem', { name: 'Contents' }).click();
      await expect(page.locator('#contents-panel')).toBeVisible();
      await expect(menu).toHaveCount(0);
    });
  }

  test('Reading settings rises as a bottom sheet', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 760 });
    await page.goto('/');
    await importBook(page, 'text-4-pages.pdf');
    await settingsButton(page).click();
    const box = await settings(page).boundingBox();
    expect(box).not.toBeNull();
    expect(Math.round((box?.x ?? 1) + (box?.width ?? 0))).toBe(390);
    expect(Math.round(box?.x ?? 1)).toBe(0);
    expect(Math.round((box?.y ?? 0) + (box?.height ?? 0))).toBe(760);
  });
});
