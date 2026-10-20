// Phase 18: the Book Reader design system's foundations. Fonts (also offline), focus rings,
// motion, toasts and the colours drawn over pages.
import { expect, test, type Page } from '@playwright/test';
import { importBook, openFixture, pageSlot } from './helpers';

/** The resolved value of a design token, as a computed colour. */
function token(page: Page, name: string): Promise<string> {
  return page.evaluate((tokenName) => {
    const probe = document.createElement('span');
    document.body.append(probe);
    probe.style.color = `var(--${tokenName})`;
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  }, name);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

const family = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((element) => getComputedStyle(element).fontFamily);

test.describe('fonts', () => {
  test('book titles use Literata and the interface Source Sans 3, from the app’s own files', async ({
    page,
  }) => {
    await importBook(page, 'text-4-pages.pdf');
    expect(await family(page, '[data-testid="book-info"]')).toMatch(/^'?"?Literata/);
    expect(await family(page, '.tool-button')).toMatch(/^'?"?Source Sans 3/);
    await page.getByRole('button', { name: 'Library', exact: true }).click();
    expect(await family(page, '.library-title')).toMatch(/^'?"?Literata/);
    await expect
      .poll(() =>
        page.evaluate(() => [
          document.fonts.check('600 16px Literata'),
          document.fonts.check('600 15px "Source Sans 3"'),
        ]),
      )
      .toEqual([true, true]);
    const fonts = await page.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .map((entry) => new URL(entry.name).pathname)
        .filter((path) => /\.(woff2?|ttf|otf)$/.test(path)),
    );
    expect(fonts.length).toBeGreaterThan(0);
    for (const path of fonts) expect(path).toMatch(/^\/fonts\/.+\.woff2$/);
  });

  test('the fonts still load with the network off', async ({ page, context }) => {
    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
      .toBe(true);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByText('No books yet. Open a PDF to start.')).toBeVisible();
    const loaded = await page.evaluate(async () => {
      await Promise.all([
        document.fonts.load('600 24px Literata'),
        document.fonts.load('400 16px "Source Sans 3"'),
      ]);
      return [
        document.fonts.check('600 24px Literata'),
        document.fonts.check('16px "Source Sans 3"'),
      ];
    });
    expect(loaded).toEqual([true, true]);
  });

  test('text fields are at least 16 px, so iOS does not zoom into them', async ({ page }) => {
    await importBook(page, 'text-4-pages.pdf');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    const small = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('input:not([type="file"]), select, textarea')]
        .filter((field) => parseFloat(getComputedStyle(field).fontSize) < 16)
        .map((field) => field.getAttribute('aria-label') ?? field.outerHTML.slice(0, 60)),
    );
    expect(small).toEqual([]);
  });
});

test('every control reached with the keyboard shows a 2 px focus ring', async ({ page }) => {
  await importBook(page, 'text-4-pages.pdf');
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  const seen: string[] = [];
  const missing: string[] = [];
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    const result = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement | null;
      if (!element || element === document.body) return null;
      const style = getComputedStyle(element);
      const name =
        element.getAttribute('aria-label') ?? element.textContent?.trim().slice(0, 30) ?? '';
      const ring = style.outlineStyle === 'solid' && parseFloat(style.outlineWidth) >= 2;
      return {
        name: `${element.tagName.toLowerCase()} ${name}`,
        ring,
        region: element.dataset.testid,
      };
    });
    if (!result || result.region === 'reader') continue;
    seen.push(result.name);
    if (!result.ring) missing.push(result.name);
  }
  expect(seen.length).toBeGreaterThan(8);
  expect(missing).toEqual([]);
});

test.describe('motion', () => {
  /** Every running transition or animation longer than `limit` seconds, as "selector prop 0.3s". */
  async function slowMotion(page: Page, limit: number, allowColour: boolean) {
    return page.evaluate(
      ({ max, colour }) => {
        const colourProps = new Set(['color', 'background-color', 'border-color']);
        const found: string[] = [];
        for (const element of document.querySelectorAll<HTMLElement>('*')) {
          const style = getComputedStyle(element);
          const props = style.transitionProperty.split(',').map((p) => p.trim());
          const times = style.transitionDuration.split(',').map((t) => parseFloat(t));
          props.forEach((prop, i) => {
            const time = times[i % times.length] ?? 0;
            if (time > max && !(colour && colourProps.has(prop))) {
              found.push(`${element.className} ${prop} ${time}s`);
            }
          });
          if (style.animationName !== 'none' && parseFloat(style.animationDuration) > max) {
            found.push(`${element.className} ${style.animationName} ${style.animationDuration}`);
          }
        }
        return found;
      },
      { max: limit, colour: allowColour },
    );
  }

  test('nothing moves for longer than 200 ms', async ({ page }) => {
    await importBook(page, 'text-4-pages.pdf');
    expect(await slowMotion(page, 0.2, false)).toEqual([]);
  });

  test('with reduced motion, nothing moves at all; colours may still fade', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await importBook(page, 'text-4-pages.pdf');
    expect(await slowMotion(page, 0, true)).toEqual([]);
  });
});

test.describe('toasts', () => {
  test('a message shows at the bottom and leaves on its own', async ({ page }) => {
    await importBook(page, 'text-4-pages.pdf');
    const toast = page.getByRole('status').filter({ hasText: 'Saved on this device.' });
    const box = await toast.boundingBox();
    const height = page.viewportSize()?.height ?? 0;
    expect(box && height - (box.y + box.height)).toBeLessThanOrEqual(48);
    await expect(toast).toBeHidden({ timeout: 6000 });
  });

  test('while reading aloud, a toast sits above the player', async ({ page }) => {
    // A speech engine that never finishes, so the player stays open.
    await page.addInitScript(() => {
      const synth = { speak() {}, cancel() {}, pause() {}, resume() {}, getVoices: () => [] };
      Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
      Object.defineProperty(window, 'SpeechSynthesisUtterance', {
        value: class {
          rate = 1;
          lang = '';
          constructor(public text: string) {}
        },
        configurable: true,
      });
    });
    await page.reload();
    await importBook(page, 'text-4-pages.pdf');
    await page.getByRole('button', { name: 'Listen', exact: true }).click();
    const player = page.getByRole('toolbar', { name: 'Read aloud' });
    await expect(player).toBeVisible();
    // Any toast: add one the way the app renders them.
    await page.evaluate(() => {
      const toast = document.createElement('div');
      toast.className = 'br-toast br-toast--danger';
      toast.textContent = 'A message';
      document.body.append(toast);
    });
    const toastBox = await page.locator('.br-toast', { hasText: 'A message' }).boundingBox();
    const playerBox = await player.boundingBox();
    if (!toastBox || !playerBox) throw new Error('no boxes');
    expect(toastBox.y + toastBox.height).toBeLessThanOrEqual(playerBox.y);
  });

  test('a failure stays until dismissed', async ({ page }) => {
    await openFixture(page, 'not-a-pdf.pdf');
    const alert = page.getByRole('alert');
    await expect(alert).toHaveText("This file isn't a readable PDF.");
    await page.waitForTimeout(4500);
    await expect(alert).toBeVisible();
    await alert.getByRole('button', { name: 'Dismiss' }).click();
    await expect(alert).toHaveCount(0);
  });
});

test.describe('on the page', () => {
  test('highlights and search marks use the design’s highlight colour, the current match ringed in accent', async ({
    page,
  }) => {
    await importBook(page, 'text-4-pages.pdf');
    await expect(
      page.locator('[data-page-index="0"] .textLayer span', { hasText: 'Charlie three' }),
    ).toHaveCount(1);
    await page.evaluate(() => {
      const span = [...document.querySelectorAll('[data-page-index="0"] .textLayer span')].find(
        (s) => s.textContent?.includes('Charlie three'),
      );
      const node = span?.firstChild;
      if (!(node instanceof Text)) throw new Error('no text');
      const range = document.createRange();
      range.setStart(node, 0);
      range.setEnd(node, 'Charlie three'.length);
      document.getSelection()?.removeAllRanges();
      document.getSelection()?.addRange(range);
    });
    const selection = await page
      .locator('[data-page-index="0"] .textLayer span')
      .first()
      .evaluate((span) => getComputedStyle(span, '::selection').backgroundColor);
    expect(selection).toBe(await token(page, 'selection'));
    await page.getByRole('button', { name: 'Highlight', exact: true }).click();
    const yellow = await token(page, 'hl-yellow');
    await expect(page.locator('.highlight-box').first()).toHaveCSS('background-color', yellow);

    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Search in book' }).fill('page');
    await page.getByRole('list', { name: 'Search results' }).getByRole('button').first().click();
    const current = page.locator('.search-hit.current').first();
    await expect(current).toHaveCSS('background-color', yellow);
    await expect(current).toHaveCSS('outline-color', await token(page, 'accent'));
  });

  test('Dark pages are filtered as the design gives it', async ({ page }) => {
    await importBook(page, 'basic-3-pages.pdf');
    await page.getByRole('combobox', { name: 'Theme' }).selectOption('dark');
    await expect(pageSlot(page, 0)).toHaveCSS('filter', 'invert(0.9) hue-rotate(180deg)');
  });
});
