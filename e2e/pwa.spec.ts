import { expect, test, type Page } from '@playwright/test';
import { bandColor, bandColorOnCanvas, expectColorClose, openFixture, pageSlot } from './helpers';

interface ManifestIcon {
  src: string;
  sizes: string;
  type?: string;
  purpose?: string;
}

/** Loads the page, waits for the service worker, and reloads so it controls the page. */
async function loadControlled(page: Page) {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);
}

test('the manifest is linked, valid, and its icons load', async ({ page }) => {
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
  expect(sizes).toEqual(expect.arrayContaining(['192x192 any', '512x512 any', '512x512 maskable']));
  for (const icon of manifest.icons) {
    const image = await page.request.get(new URL(icon.src, page.url()).toString());
    expect(image.ok(), icon.src).toBe(true);
    expect(image.headers()['content-type']).toContain('image/png');
  }

  const touchIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  expect(touchIcon).toBeTruthy();
  const touch = await page.request.get(new URL(touchIcon ?? '', page.url()).toString());
  expect(touch.ok()).toBe(true);
});

test('Chromium reports the app as installable', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Installability is reported through Chromium DevTools');
  await loadControlled(page);
  const cdp = await page.context().newCDPSession(page);
  const { installabilityErrors } = (await cdp.send('Page.getInstallabilityErrors')) as {
    installabilityErrors: unknown[];
  };
  expect(installabilityErrors).toEqual([]);
});

test('after the first load a service worker controls the app', async ({ page }) => {
  await loadControlled(page);
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
