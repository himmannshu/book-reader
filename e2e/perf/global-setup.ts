import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { heavyFixturePath } from './perf-helpers';

// The heavy benchmark book is gitignored; build it once when missing (about 10 s).
export default function globalSetup(): void {
  if (process.env.PERF_BOOK || existsSync(heavyFixturePath)) return;
  console.log('Generating the heavy benchmark fixture…');
  execFileSync('node', ['scripts/generate-heavy-fixture.mjs', heavyFixturePath], {
    stdio: 'inherit',
  });
}
