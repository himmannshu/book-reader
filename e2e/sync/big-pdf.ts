// A PDF bigger than several upload parts (8 MiB), made at test time and never committed: one
// readable page plus a large unreferenced stream of incompressible bytes. Written by hand because
// Playwright's test loader can't import pdf-lib. Deterministic, so its id (SHA-256) never changes.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function padding(length: number): Buffer {
  const bytes = Buffer.alloc(length);
  let x = 2463534242; // xorshift32: fast, deterministic, does not compress.
  for (let i = 0; i < length; i++) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    bytes[i] = x & 0xff;
  }
  return bytes;
}

function buildPdf(title: string, pad: Buffer): Buffer {
  const content = `BT /F1 20 Tf 40 440 Td (${title}) Tj ET`;
  const objects: Buffer[] = [
    Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),
    Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
    Buffer.from(
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 500] /Contents 4 0 R ' +
        '/Resources << /Font << /F1 5 0 R >> >> >>',
    ),
    Buffer.from(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`),
    Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'),
    Buffer.concat([
      Buffer.from(`<< /Length ${pad.length} >>\nstream\n`),
      pad,
      Buffer.from('\nendstream'),
    ]),
  ];
  const chunks: Buffer[] = [Buffer.from('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n', 'latin1')];
  let offset = chunks[0]?.length ?? 0;
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(offset);
    const chunk = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`), body, Buffer.from('\nendobj\n')]);
    chunks.push(chunk);
    offset += chunk.length;
  });
  const xref =
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('') +
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`;
  chunks.push(Buffer.from(xref));
  return Buffer.concat(chunks);
}

export async function bigPdf(megabytes = 20): Promise<{ path: string; id: string; title: string }> {
  const title = `big-${megabytes}mb`;
  const dir = join(tmpdir(), 'book-reader-e2e');
  const path = join(dir, `${title}.pdf`);
  if (!existsSync(path)) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(path, buildPdf(`A ${megabytes} MB test book`, padding(megabytes * 1_000_000)));
  }
  const id = createHash('sha256').update(readFileSync(path)).digest('hex');
  return { path, id, title };
}
