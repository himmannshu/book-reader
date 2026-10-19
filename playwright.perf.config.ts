import { defineConfig, devices } from '@playwright/test';

const port = 4174;

// Performance benchmarks (phase 02). Separate from the regular browser tests so those stay fast
// and never need the large generated fixture. One worker, so runs don't compete for the CPU.
// Device scale factor 2 matches a Retina Mac or an iPad.
export default defineConfig({
  testDir: './e2e/perf',
  testMatch: '*.perf.ts',
  globalSetup: './e2e/perf/global-setup.ts',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 180_000,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'perf-chromium',
      use: { ...devices['Desktop Chrome'], deviceScaleFactor: 2 },
    },
    {
      name: 'perf-webkit',
      use: { ...devices['Desktop Safari'], deviceScaleFactor: 2 },
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
