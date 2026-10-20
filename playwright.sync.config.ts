import { defineConfig, devices } from '@playwright/test';

const port = 8788;

// Two-device sync tests (phases 09a, 09b). The built app and the APIs (functions/) run together in
// `wrangler pages dev` with a local D1 database and R2 bucket; no Cloudflare account or network is
// needed.
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
    // `@any-engine` tests (one device, nothing engine-specific) run in Chromium only.
    { name: 'sync-webkit', use: { ...devices['Desktop Safari'] }, grepInvert: /@any-engine/ },
  ],
  webServer: {
    command:
      `rm -rf .wrangler/sync-e2e && npm run build && wrangler pages dev dist --port ${port} ` +
      '--compatibility-date 2026-10-01 --d1 DB=sync-e2e --r2 FILES=sync-e2e-files ' +
      '--binding AUTH_MODE=dev ' +
      '--persist-to .wrangler/sync-e2e',
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: { WRANGLER_SEND_METRICS: 'false' },
  },
});
