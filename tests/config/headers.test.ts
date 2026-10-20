// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Parses Cloudflare Pages `_headers`: a path line, then indented `Name: value` lines. */
function parseHeaders(text: string): Map<string, Record<string, string>> {
  const rules = new Map<string, Record<string, string>>();
  let current: Record<string, string> | undefined;
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      current = {};
      rules.set(line.trim(), current);
    } else if (current) {
      const [name, ...value] = line.trim().split(':');
      current[(name ?? '').toLowerCase()] = value.join(':').trim();
    }
  }
  return rules;
}

const rules = parseHeaders(
  readFileSync(join(import.meta.dirname, '../../public/_headers'), 'utf8'),
);

describe('public/_headers', () => {
  it('never lets browsers or Cloudflare keep a stale service worker or page shell', () => {
    for (const path of ['/sw.js', '/index.html', '/', '/manifest.webmanifest']) {
      expect(rules.get(path)?.['cache-control'], path).toMatch(/no-cache/);
    }
  });

  it('caches hashed build assets for a long time', () => {
    expect(rules.get('/assets/*')?.['cache-control']).toMatch(/max-age=31536000.*immutable/);
  });
});
