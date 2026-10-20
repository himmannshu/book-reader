/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/** Unit tests that need a DOM: React components and hooks, the viewer, the recorder. */
const DOM_TESTS = ['src/ui/**/*.test.tsx', 'src/viewer/viewer.test.ts', 'src/ui/recorder.test.ts'];

// The Light theme's `surface` colour from the design (src/ui/tokens.css).
const THEME = '#faf7f2';
const BACKGROUND = '#faf7f2';

export default defineConfig({
  plugins: [
    react(),
    // Installable app + offline shell (phase 08). "prompt": a new version waits until the reader
    // chooses Reload (src/ui/UpdateNotice.tsx), so it never reloads mid-page.
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      devOptions: { enabled: false },
      includeAssets: ['icons/favicon-32.png', 'icons/apple-touch-icon-180.png'],
      manifest: {
        name: 'Book Reader',
        short_name: 'Reader',
        description: 'A personal reader for PDF books.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: THEME,
        background_color: BACKGROUND,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Everything the app needs to open a stored book offline, including the PDF.js worker and
        // the fonts (phase 18).
        globPatterns: ['**/*.{js,mjs,css,html,png,svg,webmanifest,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    // Most tests are plain logic and run in Node; only the ones that render React or drive the
    // viewer get jsdom (creating it per file was two thirds of the unit run in CI).
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts', 'functions/**/*.test.ts'],
          exclude: DOM_TESTS,
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: DOM_TESTS,
          setupFiles: ['./src/test-setup.ts'],
        },
      },
    ],
  },
});
