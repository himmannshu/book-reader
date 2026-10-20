/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Colours match src/ui/app.css (--accent and --bg).
const THEME = '#3d5a80';
const BACKGROUND = '#f4f1ea';

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
        // Everything the app needs to open a stored book offline, including the PDF.js worker.
        globPatterns: ['**/*.{js,mjs,css,html,png,svg,webmanifest}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts', 'functions/**/*.test.ts'],
    setupFiles: ['./src/test-setup.ts'],
  },
});
