// Prints the latest benchmark results from perf-results/ as a table.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..', 'perf-results');
// Report only the book this run measured.
const books = process.env.PERF_BOOK ? ['own-book'] : ['heavy'];
for (const book of books) {
  const dir = join(root, book);
  if (!existsSync(dir)) continue;
  const rows = {};
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const { project, metric, value } = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    (rows[metric] ??= {})[project] = value;
  }
  console.log(
    `\nPerformance results (${book === 'heavy' ? 'heavy-600-v1 fixture' : 'your own book'}):`,
  );
  console.table(rows);
}
