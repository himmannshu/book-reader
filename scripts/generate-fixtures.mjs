// Generates the test PDFs in tests/fixtures/. Run with `npm run fixtures`.
// Output is deterministic (fixed dates and metadata) so regenerating produces no diff.
// Each page gets a solid color band at the top whose color depends only on its page index,
// so browser tests can tell which page a canvas shows by reading pixels.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNull,
  PDFNumber,
  PDFString,
  StandardFonts,
  rgb,
} from 'pdf-lib';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'tests', 'fixtures');
const FIXED_DATE = new Date('2026-01-01T00:00:00Z');
const LETTER = [612, 792];

// Keep in sync with bandColor() in e2e/helpers.ts.
function bandColor(index) {
  return [40 + ((index * 67) % 180), 40 + ((index * 131) % 180), 40 + ((index * 29) % 180)];
}

async function makePdf(name, sizes, decorate) {
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

  decorate?.(doc);
  const bytes = await doc.save({ useObjectStreams: false });
  writeFileSync(join(outDir, `${name}.pdf`), bytes);
  return { file: `${name}.pdf`, pages: sizes.map(([width, height]) => ({ width, height })) };
}

/**
 * Adds a PDF outline (bookmarks tree) built from low-level objects, since pdf-lib has no outline API.
 * Each entry's `to` is a page index, `{ named }` for a named destination, or null for no destination.
 * Named destinations listed in `namedDests` are registered in the catalog's /Names /Dests tree;
 * a `{ named }` that is not registered is a broken destination.
 */
function addOutline(doc, entries, namedDests = {}) {
  const context = doc.context;
  const pages = doc.getPages();
  const destTo = (index) =>
    context.obj([pages[index].ref, PDFName.of('XYZ'), PDFNull, PDFNull, PDFNull]);

  const build = (items, parentRef) => {
    const refs = items.map(() => context.nextRef());
    items.forEach((item, i) => {
      const dict = context.obj({});
      dict.set(PDFName.of('Title'), PDFHexString.fromText(item.title));
      dict.set(PDFName.of('Parent'), parentRef);
      if (i > 0) dict.set(PDFName.of('Prev'), refs[i - 1]);
      if (i < items.length - 1) dict.set(PDFName.of('Next'), refs[i + 1]);
      if (typeof item.to === 'number') dict.set(PDFName.of('Dest'), destTo(item.to));
      else if (item.to?.named) dict.set(PDFName.of('Dest'), PDFString.of(item.to.named));
      const children = item.children ?? [];
      if (children.length) {
        const childRefs = build(children, refs[i]);
        dict.set(PDFName.of('First'), childRefs[0]);
        dict.set(PDFName.of('Last'), childRefs[childRefs.length - 1]);
        dict.set(PDFName.of('Count'), PDFNumber.of(children.length));
      }
      context.assign(refs[i], dict);
    });
    return refs;
  };

  const outlinesRef = context.nextRef();
  const topRefs = build(entries, outlinesRef);
  context.assign(
    outlinesRef,
    context.obj({
      Type: 'Outlines',
      First: topRefs[0],
      Last: topRefs[topRefs.length - 1],
      Count: PDFNumber.of(entries.length),
    }),
  );
  doc.catalog.set(PDFName.of('Outlines'), outlinesRef);

  const names = Object.entries(namedDests).sort(([a], [b]) => a.localeCompare(b));
  if (names.length) {
    const flat = names.flatMap(([name, index]) => [PDFString.of(name), destTo(index)]);
    const destsTree = context.obj({ Names: context.obj(flat) });
    doc.catalog.set(PDFName.of('Names'), context.obj({ Dests: destsTree }));
  }
}

mkdirSync(outDir, { recursive: true });
const manifest = {
  'basic-3-pages': await makePdf('basic-3-pages', [LETTER, LETTER, LETTER]),
  'mixed-sizes': await makePdf('mixed-sizes', [LETTER, [792, 612], [300, 400]]),
  'long-300-pages': await makePdf(
    'long-300-pages',
    Array.from({ length: 300 }, () => LETTER),
  ),
  // A book with a table of contents (phase 04). Page indexes are 0-based.
  'outline-12-pages': await makePdf(
    'outline-12-pages',
    Array.from({ length: 12 }, () => LETTER),
    (doc) =>
      addOutline(
        doc,
        [
          {
            title: 'Part One',
            to: 0,
            children: [
              { title: 'Chapter 1', to: 1 },
              { title: 'Chapter 2', to: 4 },
            ],
          },
          {
            title: 'Part Two',
            to: 7,
            children: [
              { title: 'Chapter 3', to: { named: 'chapter-3' } },
              { title: 'Missing section', to: { named: 'no-such-destination' } },
            ],
          },
          { title: 'Appendix', to: 11 },
        ],
        { 'chapter-3': 8 },
      ),
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
