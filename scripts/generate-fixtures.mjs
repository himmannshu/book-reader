// Generates the test PDFs in tests/fixtures/. Run with `npm run fixtures`.
// Output is deterministic (fixed dates and metadata) so regenerating produces no diff.
// Each page gets a solid color band at the top whose color depends only on its page index,
// so browser tests can tell which page a canvas shows by reading pixels.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'tests', 'fixtures');
const FIXED_DATE = new Date('2026-01-01T00:00:00Z');
const LETTER = [612, 792];

// Keep in sync with bandColor() in e2e/helpers.ts.
function bandColor(index) {
  return [40 + ((index * 67) % 180), 40 + ((index * 131) % 180), 40 + ((index * 29) % 180)];
}

async function makePdf(name, sizes) {
  const doc = await PDFDocument.create();
  doc.setTitle(name);
  doc.setAuthor('book-reader fixtures');
  doc.setProducer('book-reader generate-fixtures');
  doc.setCreator('book-reader generate-fixtures');
  doc.setCreationDate(FIXED_DATE);
  doc.setModificationDate(FIXED_DATE);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  sizes.forEach(([width, height], index) => {
    const page = doc.addPage([width, height]);
    const [r, g, b] = bandColor(index);
    const bandHeight = height * 0.2;
    page.drawRectangle({
      x: 0,
      y: height - bandHeight,
      width,
      height: bandHeight,
      color: rgb(r / 255, g / 255, b / 255),
    });
    page.drawText(`Page ${index + 1}`, { x: 36, y: height / 2, size: 28, font });
    page.drawText(`${name}, ${width} x ${height} pt`, {
      x: 36,
      y: height / 2 - 40,
      size: 12,
      font,
    });
  });

  const bytes = await doc.save({ useObjectStreams: false });
  writeFileSync(join(outDir, `${name}.pdf`), bytes);
  return { file: `${name}.pdf`, pages: sizes.map(([width, height]) => ({ width, height })) };
}

mkdirSync(outDir, { recursive: true });
const manifest = {
  'basic-3-pages': await makePdf('basic-3-pages', [LETTER, LETTER, LETTER]),
  'mixed-sizes': await makePdf('mixed-sizes', [LETTER, [792, 612], [300, 400]]),
  'long-300-pages': await makePdf(
    'long-300-pages',
    Array.from({ length: 300 }, () => LETTER),
  ),
  // Thin strips: many pages fit on screen at once (review finding B2).
  'strips-40-pages': await makePdf(
    'strips-40-pages',
    Array.from({ length: 40 }, () => [792, 60]),
  ),
};
writeFileSync(join(outDir, 'not-a-pdf.pdf'), 'This is plain text with a .pdf name, not a PDF.\n');
writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Wrote fixtures to ${outDir}`);
