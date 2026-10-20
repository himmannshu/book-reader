import { defineConfig, devices } from '@playwright/test';

const port = 4173;

// Browser tests run against the production build, in Chromium and in WebKit (Safari's engine,
// which is what iPad and iPhone use).
export default defineConfig({
  testDir: './e2e',
  // Benchmarks have their own config (playwright.perf.config.ts).
  testIgnore: ['**/perf/**', '**/sync/**'],
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
  },
  // Tags (test-suite trim, 2026-10-20): `@any-engine` tests check nothing engine-specific (pure
  // UI state, stand-in APIs, computed colours), so they run in Chromium only. `@touch-device`
  // blocks emulate iPhone and iPad, which run Safari's engine, so they run in WebKit only.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, grepInvert: /@touch-device/ },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, grepInvert: /@any-engine/ },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
