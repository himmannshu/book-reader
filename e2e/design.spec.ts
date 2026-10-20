// Phase 14: the design pass. Toolbar size, touch targets, overflow, contrast, pinch to zoom.
import { devices, expect, test, type Page } from '@playwright/test';
import { importBook, pageSlot } from './helpers';

/** Height of everything above the pages in the reader. */
async function chromeHeight(page: Page): Promise<number> {
  return page.getByTestId('reader').evaluate((reader) => reader.getBoundingClientRect().top);
}

async function noSidewaysScroll(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
}

/** Visible controls smaller than 44 × 44 px, as "name WxH". */
async function smallControls(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const small: string[] = [];
    for (const element of document.querySelectorAll<HTMLElement>(
      'button, select, input:not([type="file"]), label.button',
    )) {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (box.width === 0 || style.visibility === 'hidden' || element.closest('[hidden]')) continue;
      if (element.closest('.textLayer, .selection-actions')) continue;
      if (box.width < 44 - 0.5 || box.height < 44 - 0.5) {
        const name =
          element.getAttribute('aria-label') ?? element.textContent?.trim().slice(0, 30) ?? '?';
        small.push(`${name} ${Math.round(box.width)}x${Math.round(box.height)}`);
      }
    }
    return small;
  });
}

test.describe('desktop', () => {
  test('the reader has one bar of controls', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await importBook(page, 'text-4-pages.pdf');
    expect(await chromeHeight(page)).toBeLessThanOrEqual(64);
  });

  test('ctrl+wheel (trackpad pinch) zooms in and out, keeping the page', async ({ page }) => {
    await page.goto('/');
    await importBook(page, 'long-300-pages.pdf');
    const zoom = page.getByRole('combobox', { name: 'Zoom' });
    const reader = page.getByTestId('reader');
    const box = await reader.boundingBox();
    if (!box) throw new Error('no reader');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -120);
    await page.keyboard.up('Control');
    await expect(zoom).toHaveValue('125');
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, 120);
    await page.keyboard.up('Control');
    await expect(zoom).toHaveValue('110');
    await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');
  });

  test('Safari gesture events (pinch) zoom to the nearest level', async ({ page }) => {
    await page.goto('/');
    await importBook(page, 'basic-3-pages.pdf');
    await page.getByTestId('reader').evaluate((reader) => {
      const fire = (type: string, scale: number) => {
        const event = new Event(type, { bubbles: true, cancelable: true });
        Object.assign(event, { scale });
        reader.dispatchEvent(event);
      };
      fire('gesturestart', 1);
      fire('gesturechange', 1.5);
      fire('gestureend', 1.82);
    });
    // Fit width is 110.3% here; × 1.82 is about 200%.
    await expect(page.getByRole('combobox', { name: 'Zoom' })).toHaveValue('200');
  });

  test('the horizontal place is kept when a zoomed book is reopened', async ({ page }) => {
    await page.goto('/');
    await importBook(page, 'basic-3-pages.pdf');
    await page.getByRole('combobox', { name: 'Zoom' }).selectOption('300');
    const reader = page.getByTestId('reader');
    await expect.poll(() => reader.evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(true);
    await reader.evaluate((e) => {
      e.scrollLeft = 0;
    });
    await page.getByRole('button', { name: 'Library', exact: true }).click();
    await page
      .getByRole('list', { name: 'Your books' })
      .getByRole('button', { name: 'basic-3-pages', exact: true })
      .click();
    await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');
    expect(await reader.evaluate((e) => e.scrollLeft)).toBeLessThanOrEqual(2);
  });
});

for (const name of ['iPhone 13', 'iPad (gen 7)'] as const) {
  test.describe(name, () => {
    const { defaultBrowserType: _ignored, ...device } = devices[name];
    void _ignored;
    test.use(device);

    test('every control is at least 44 × 44 px', async ({ page }) => {
      await page.goto('/');
      await importBook(page, 'text-4-pages.pdf');
      expect(await smallControls(page), 'reader').toEqual([]);
      for (const panel of ['Contents', 'Bookmarks', 'Notes', 'Search']) {
        await page.getByRole('button', { name: panel, exact: true }).click();
        expect(await smallControls(page), panel).toEqual([]);
        await page.keyboard.press('Escape');
      }
      await page.getByRole('button', { name: 'Library', exact: true }).click();
      expect(await smallControls(page), 'library').toEqual([]);
    });
  });
}

test.describe('phones', () => {
  for (const width of [320, 390]) {
    test(`at ${width} px the controls are compact and nothing scrolls sideways`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      expect(await noSidewaysScroll(page), 'empty library').toBe(true);
      await importBook(page, 'text-4-pages.pdf');
      expect(await chromeHeight(page)).toBeLessThanOrEqual(112);
      expect(await noSidewaysScroll(page), 'reader').toBe(true);
      for (const panel of ['Contents', 'Bookmarks', 'Notes', 'Search']) {
        await page.getByRole('button', { name: panel, exact: true }).click();
        expect(await noSidewaysScroll(page), panel).toBe(true);
        await page.keyboard.press('Escape');
      }
      // Theme and zoom are in the Display menu.
      await page.getByRole('button', { name: 'Display', exact: true }).click();
      await expect(page.getByRole('combobox', { name: 'Theme' })).toBeVisible();
      await expect(page.getByRole('combobox', { name: 'Zoom' })).toBeVisible();
      await page.keyboard.press('Escape');

      await page.getByRole('button', { name: 'Library', exact: true }).click();
      expect(await noSidewaysScroll(page), 'library').toBe(true);
      const item = page.getByRole('list', { name: 'Your books' }).getByRole('listitem').first();
      await item.getByRole('button', { name: /^Remove / }).click();
      await expect(item.getByRole('button', { name: 'Delete everywhere' })).toBeVisible();
      const title = await item.locator('.library-title').boundingBox();
      expect(title?.width ?? 0, 'title while confirming').toBeGreaterThan(40);
      expect(await noSidewaysScroll(page), 'confirming removal').toBe(true);
    });
  }

  test('after choosing a search result, a bar steps through the matches', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/');
    await importBook(page, 'text-4-pages.pdf');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Search in book' }).fill('page');
    await page.getByRole('list', { name: 'Search results' }).getByRole('button').first().click();
    const bar = page.getByRole('toolbar', { name: 'Search matches' });
    await expect(bar).toBeVisible();
    await expect(bar).toContainText('1 of 8');
    await bar.getByRole('button', { name: 'Next match' }).click();
    await expect(bar).toContainText('2 of 8');
    await bar.getByRole('button', { name: 'Close search' }).click();
    await expect(bar).toHaveCount(0);
    await expect(page.locator('.search-hit')).toHaveCount(0);
  });
});

/** WCAG relative luminance contrast of two CSS colours (computed rgb() strings). */
function contrast(a: string, b: string): number {
  const lum = (css: string) => {
    const [r = 0, g = 0, bl = 0] = (css.match(/[\d.]+/g) ?? []).map(Number);
    const channel = (v: number) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(bl);
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

for (const theme of ['light', 'sepia', 'dark']) {
  test(`text contrast meets WCAG AA in the ${theme} theme`, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Theme' }).selectOption(theme);
    const colours = await page.evaluate(() => {
      const probe = document.createElement('span');
      document.body.append(probe);
      const resolve = (name: string) => {
        probe.style.color = `var(${name})`;
        return getComputedStyle(probe).color;
      };
      const names = [
        '--bg',
        '--surface',
        '--text',
        '--muted',
        '--accent',
        '--on-accent',
        '--control-border',
        '--error-bg',
        '--error-text',
      ];
      const result = Object.fromEntries(names.map((name) => [name, resolve(name)]));
      probe.remove();
      return result as Record<string, string>;
    });
    const c = (a: string, b: string) => contrast(colours[a] ?? '', colours[b] ?? '');
    const pairs: [string, string, number][] = [
      ['--text', '--bg', 4.5],
      ['--text', '--surface', 4.5],
      ['--muted', '--bg', 4.5],
      ['--muted', '--surface', 4.5],
      ['--accent', '--surface', 4.5],
      ['--on-accent', '--accent', 4.5],
      ['--error-text', '--error-bg', 4.5],
      ['--control-border', '--surface', 3],
    ];
    for (const [fg, bg, min] of pairs) {
      expect(c(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(min);
    }
  });
}
