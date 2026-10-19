import { expect, test } from '@playwright/test';

test('the app shell loads and shows the app name', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Book Reader' })).toBeVisible();
});
