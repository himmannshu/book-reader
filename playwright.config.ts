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
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
