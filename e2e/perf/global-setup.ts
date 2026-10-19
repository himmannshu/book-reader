import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { heavyFixturePath, ownBook } from './perf-helpers';

export default function globalSetup(): void {
  // Start from a clean results folder for this book, so the report never shows numbers from an
  // earlier run (for example a deliberately slowed one).
  const results = join(
    import.meta.dirname,
    '..',
    '..',
    'perf-results',
    ownBook ? 'own-book' : 'heavy',
  );
  rmSync(results, { recursive: true, force: true });

  // The heavy benchmark book is gitignored; build it once when missing (about 10 s).
  if (ownBook || existsSync(heavyFixturePath)) return;
  console.log('Generating the heavy benchmark fixture…');
  execFileSync('node', ['scripts/generate-heavy-fixture.mjs', heavyFixturePath], {
    stdio: 'inherit',
  });
}
