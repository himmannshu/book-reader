import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'playwright-report', 'test-results'] },
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
    // Only the storage adapters may touch browser storage, so persistence stays behind the
    // BookStore interface and the cloud adapter (phase 09) can slot in.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/storage/**'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'indexedDB', message: 'Use the BookStore interface (src/storage) instead.' },
      ],
      'no-restricted-properties': [
        'error',
        ...['window', 'globalThis', 'self'].map((object) => ({
          object,
          property: 'indexedDB',
          message: 'Use the BookStore interface (src/storage) instead.',
        })),
        {
          object: 'navigator',
          property: 'storage',
          message: 'Use the BookStore interface (src/storage) instead.',
        },
      ],
    },
  },
  {
    files: ['*.config.{js,ts}', 'e2e/**', 'scripts/**'],
    languageOptions: {
      globals: globals.node,
    },
  },
);
