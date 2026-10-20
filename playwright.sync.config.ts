import { defineConfig, devices } from '@playwright/test';

const port = 8788;

// Two-device sync tests (phase 09a). The built app and the sync API (functions/) run together in
// `wrangler pages dev` with a local D1 database; no Cloudflare account or network is needed.
// AUTH_MODE=dev only works on localhost; each test picks its own user with an x-dev-user header.
export default defineConfig({
  testDir: './e2e/sync',
  testMatch: '*.spec.ts',
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'sync-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'sync-webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command:
      `rm -rf .wrangler/sync-e2e && npm run build && wrangler pages dev dist --port ${port} ` +
      '--compatibility-date 2026-10-01 --d1 DB=sync-e2e --binding AUTH_MODE=dev ' +
      '--persist-to .wrangler/sync-e2e',
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: { WRANGLER_SEND_METRICS: 'false' },
  },
});
