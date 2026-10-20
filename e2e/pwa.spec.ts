import { expect, test } from '@playwright/test';
import {
  bandColor,
  bandColorOnCanvas,
  expectColorClose,
  loadControlled,
  openFixture,
  pageSlot,
} from './helpers';

interface ManifestIcon {
  src: string;
  sizes: string;
  type?: string;
  purpose?: string;
}

test(
  'the manifest is linked, valid, and its icons load',
  { tag: '@any-engine' },
  async ({ page }) => {
    await page.goto('/');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toBeTruthy();
    const response = await page.request.get(new URL(href ?? '', page.url()).toString());
    expect(response.ok()).toBe(true);
    const manifest = (await response.json()) as Record<string, unknown> & { icons: ManifestIcon[] };

    expect(manifest).toMatchObject({
      name: 'Book Reader',
      short_name: 'Reader',
      start_url: '/',
      scope: '/',
      display: 'standalone',
    });
    expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i);

    const sizes = manifest.icons.map((icon) => `${icon.sizes} ${icon.purpose ?? 'any'}`);
    expect(sizes).toEqual(
      expect.arrayContaining(['192x192 any', '512x512 any', '512x512 maskable']),
    );
    for (const icon of manifest.icons) {
      const image = await page.request.get(new URL(icon.src, page.url()).toString());
      expect(image.ok(), icon.src).toBe(true);
      expect(image.headers()['content-type']).toContain('image/png');
    }

    const touchIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
    expect(touchIcon).toBeTruthy();
    const touch = await page.request.get(new URL(touchIcon ?? '', page.url()).toString());
    expect(touch.ok()).toBe(true);
  },
);

test('Chromium reports the app as installable', async ({
  playwright,
  browserName,
  baseURL,
}, testInfo) => {
  test.skip(browserName !== 'chromium', 'Installability is reported through Chromium DevTools');
  // The default headless shell reports no installability errors for any page, and normal test
  // contexts are incognito, which is never installable. So use full Chromium with a real profile.
  const context = await playwright.chromium.launchPersistentContext(
    testInfo.outputPath('profile'),
    {
      channel: 'chromium',
      baseURL,
    },
  );
  try {
    const page = context.pages()[0] ?? (await context.newPage());
    const cdp = await context.newCDPSession(page);
    const errors = async () =>
      (
        (await cdp.send('Page.getInstallabilityErrors')) as {
          installabilityErrors: { errorId: string }[];
        }
      ).installabilityErrors.map((error) => error.errorId);

    // The check is live: a page without a manifest is reported as not installable.
    await page.goto('/icons/favicon-32.png');
    expect(await errors()).toContain('no-manifest');

    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    expect(await errors()).toEqual([]);
  } finally {
    await context.close();
  }
});

test('with the network off, the app shell still opens', async ({ page, context }) => {
  await loadControlled(page);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Book Reader' })).toBeVisible();
  await expect(page.getByLabel('Open PDF')).toBeAttached();
  await expect(page.getByText('No books yet. Open a PDF to start.')).toBeVisible();
});

test('with the network off, a saved book opens from Your books', async ({ page, context }) => {
  await loadControlled(page);
  await openFixture(page, 'basic-3-pages.pdf');
  await expect(page.getByRole('status')).toHaveText('Saved on this device.');

  await context.setOffline(true);
  await page.reload();
  await page
    .getByRole('list', { name: 'Your books' })
    .getByRole('button', { name: 'basic-3-pages', exact: true })
    .click();
  await expect(pageSlot(page, 0)).toHaveAttribute('data-state', 'rendered');
  const color = await bandColorOnCanvas(page, 0);
  expect(expectColorClose(color, bandColor(0)), `page 1 band color was ${color}`).toBe(true);
});
