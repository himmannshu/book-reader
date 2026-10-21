// What the page pill says (phase 19): the PDF's own page labels when the book defines them
// ("iv", "12"), otherwise the page's number from 1. Pure logic.

/** Labels from the PDF, one per page; null or empty entries mean "use the page number". */
export type PageLabels = readonly (string | null)[] | null;

/** The page's label, or its number from 1. */
export function pageLabel(pageIndex: number, labels: PageLabels): string {
  return labels?.[pageIndex]?.trim() || String(pageIndex + 1);
}

/**
 * "Page 12 of 368 · 4%". The total is the last page's label when that is a number (a book with
 * roman-numbered front matter ends at its printed page count), otherwise the page count. The
 * percentage always counts physical pages.
 */
export function pagePillText(pageIndex: number, pageCount: number, labels: PageLabels): string {
  const last = labels?.[pageCount - 1]?.trim() ?? '';
  const total = /^\d+$/.test(last) ? last : String(pageCount);
  const percent = Math.round(((pageIndex + 1) / pageCount) * 100);
  return `Page ${pageLabel(pageIndex, labels)} of ${total} · ${percent}%`;
}
