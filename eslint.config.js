import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const STORAGE_MESSAGE = 'Use the storage interfaces (src/storage) instead.';
const FETCH_MESSAGE =
  'Only src/sync/http-client.ts talks to the network; use the SyncClient interface.';
const INDEXED_DB_GLOBAL = { name: 'indexedDB', message: STORAGE_MESSAGE };
const LOCAL_STORAGE_GLOBAL = { name: 'localStorage', message: STORAGE_MESSAGE };
const FETCH_GLOBAL = { name: 'fetch', message: FETCH_MESSAGE };
const STORAGE_PROPERTIES = [
  ...['window', 'globalThis', 'self'].flatMap((object) =>
    ['indexedDB', 'localStorage'].map((property) => ({
      object,
      property,
      message: STORAGE_MESSAGE,
    })),
  ),
  { object: 'navigator', property: 'storage', message: STORAGE_MESSAGE },
];
const FETCH_PROPERTIES = ['window', 'globalThis', 'self'].map((object) => ({
  object,
  property: 'fetch',
  message: FETCH_MESSAGE,
}));

export default tseslint.config(
  {
    // harness/context/design-system holds the design's sources as reference only (ported into src/ui).
    ignores: [
      'dist',
      'node_modules',
      'playwright-report',
      'test-results',
      '.wrangler',
      'harness/context/design-system',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  reactHooks.configs.flat.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Only the engine adapter may touch PDF.js, so the engine stays swappable (D2/D3).
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/engine/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['pdfjs-dist', 'pdfjs-dist/*'],
              message: 'Import PDF.js only inside src/engine. Use the PdfEngine interface instead.',
            },
          ],
        },
      ],
    },
  },
  {
    // Boundaries for browser storage and the network:
    // - only the storage adapters (src/storage) may touch IndexedDB or navigator.storage, so
    //   persistence stays behind the storage interfaces;
    // - only the sync client (src/sync/http-client.ts) may call fetch, so sync stays behind
    //   the SyncClient interface (phase 09a).
    // ESLint replaces (does not merge) a rule's options when several blocks match a file, so the
    // exceptions below restate the remaining restriction.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-globals': ['error', INDEXED_DB_GLOBAL, LOCAL_STORAGE_GLOBAL, FETCH_GLOBAL],
      'no-restricted-properties': ['error', ...STORAGE_PROPERTIES, ...FETCH_PROPERTIES],
    },
  },
  {
    files: ['src/storage/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-globals': ['error', FETCH_GLOBAL],
      'no-restricted-properties': ['error', ...FETCH_PROPERTIES],
    },
  },
  {
    files: ['src/sync/http-client.ts'],
    rules: {
      'no-restricted-globals': ['error', INDEXED_DB_GLOBAL, LOCAL_STORAGE_GLOBAL],
      'no-restricted-properties': ['error', ...STORAGE_PROPERTIES],
    },
  },
  {
    files: ['*.config.{js,ts}', 'e2e/**', 'scripts/**'],
    languageOptions: {
      globals: globals.node,
    },
  },
);
