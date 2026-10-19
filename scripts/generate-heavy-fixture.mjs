// Generates a heavy, book-like PDF for the performance benchmarks (phase 02).
// Usage: node scripts/generate-heavy-fixture.mjs [output-path]
// Deterministic: a seeded random generator and fixed metadata make every run byte-identical.
// The output is large, so it is gitignored and regenerated on demand (e2e/perf/global-setup.ts).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const HEAVY_FIXTURE_NAME = 'heavy-600-v1.pdf';
const PAGE_COUNT = 600;
const VECTOR_EVERY = 5;
const IMAGE_EVERY = 20;
const [WIDTH, HEIGHT] = [612, 792];
const FIXED_DATE = new Date('2026-01-01T00:00:00Z');

/** Small seeded PRNG (mulberry32) so output never depends on Math.random. */
function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WORDS = (
  'the of and to in a is that for it as was with be by on not he this are or his from at which ' +
  'but have an they you were her she there been one all we their has would when if so no will ' +
  'reader page chapter light river memory window evening question silence history letter story'
).split(' ');

function paragraphLine(random, maxChars) {
  let line = '';
  while (line.length < maxChars) {
    const word = WORDS[Math.floor(random() * WORDS.length)];
    line += (line ? ' ' : '') + word;
  }
  return line.slice(0, maxChars);
}

function pngChunk(type, data) {
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

/** A photo-like RGB PNG: smooth gradients plus seeded grain, so it compresses only partly. */
function makePng(width, height, seed) {
  const random = prng(seed);
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let offset = 0;
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const grain = Math.floor(random() * 6);
      raw[offset++] = (x * 255) / width / 1.5 + grain + (seed % 40);
      raw[offset++] = (y * 255) / height / 1.5 + grain;
      raw[offset++] = ((x + y) * 255) / (width + height) / 1.5 + grain;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 6 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function vectorPath(random) {
  let path = `M ${Math.floor(random() * WIDTH)} ${Math.floor(random() * 300)}`;
  for (let i = 0; i < 400; i++) {
    const [x1, y1, x2, y2, x, y] = Array.from({ length: 6 }, (_, k) =>
      Math.floor(random() * (k % 2 === 0 ? WIDTH - 72 : 300)),
    );
    path += ` C ${x1} ${y1} ${x2} ${y2} ${x} ${y}`;
  }
  return path;
}

export async function generateHeavyFixture(outPath) {
  const doc = await PDFDocument.create();
  doc.setTitle('Heavy benchmark book');
  doc.setAuthor('book-reader fixtures');
  doc.setProducer('book-reader generate-heavy-fixture');
  doc.setCreator('book-reader generate-heavy-fixture');
  doc.setCreationDate(FIXED_DATE);
  doc.setModificationDate(FIXED_DATE);
  const body = await doc.embedFont(StandardFonts.TimesRoman);
  const heading = await doc.embedFont(StandardFonts.HelveticaBold);

  for (let index = 0; index < PAGE_COUNT; index++) {
    const random = prng(index + 1);
    const page = doc.addPage([WIDTH, HEIGHT]);
    if (index % IMAGE_EVERY === IMAGE_EVERY - 1) {
      // A full-page "scanned" image page.
      const image = await doc.embedPng(makePng(1000, 1294, index + 1));
      page.drawImage(image, { x: 0, y: 0, width: WIDTH, height: HEIGHT });
      continue;
    }
    page.drawText(`Chapter ${Math.floor(index / 20) + 1} · page ${index + 1}`, {
      x: 54,
      y: HEIGHT - 60,
      size: 14,
      font: heading,
    });
    let top = HEIGHT - 90;
    if (index % VECTOR_EVERY === VECTOR_EVERY - 1) {
      page.drawSvgPath(vectorPath(random), {
        x: 36,
        y: HEIGHT - 90,
        borderColor: rgb(0.2, 0.3, 0.5),
        borderWidth: 0.6,
      });
      top -= 320;
    }
    for (let y = top; y > 54; y -= 12.5) {
      page.drawText(paragraphLine(random, 95), { x: 54, y, size: 10, font: body });
    }
  }

  mkdirSync(dirname(outPath), { recursive: true });
  const bytes = await doc.save({ useObjectStreams: false });
  writeFileSync(outPath, bytes);
  return bytes.length;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const out = process.argv[2] ?? join(root, 'tests', 'fixtures', 'generated', HEAVY_FIXTURE_NAME);
  const started = performance.now();
  const size = await generateHeavyFixture(out);
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  console.log(`Wrote ${out} (${(size / 1e6).toFixed(1)} MB) in ${seconds} s`);
}
