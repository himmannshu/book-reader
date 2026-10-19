// Turns a PDF's outline (as PDF.js reports it) into entries with 0-based page indexes.
// Pure apart from the resolver, so it is unit-testable without PDF.js. Never throws for a
// broken entry: real books have odd outlines, and one bad entry must not hide the rest.
import type { OutlineItem } from './types';

/** The parts of PDF.js's outline items this module reads. */
export interface RawOutlineItem {
  title: string;
  /** A named destination, an explicit destination array, or null (for example a web link). */
  dest: string | readonly unknown[] | null;
  url?: string | null;
  items: readonly RawOutlineItem[];
}

export interface DestinationResolver {
  getDestination(name: string): Promise<readonly unknown[] | null>;
  /** Resolves a page reference (the first element of an explicit destination). */
  getPageIndex(ref: unknown): Promise<number>;
}

async function pageIndexOf(
  dest: RawOutlineItem['dest'],
  resolver: DestinationResolver,
  pageCount: number,
): Promise<number | null> {
  try {
    const explicit = typeof dest === 'string' ? await resolver.getDestination(dest) : dest;
    if (!explicit || explicit.length === 0) return null;
    const target = explicit[0];
    // Most PDFs point at a page object; some store the page number directly.
    const index = typeof target === 'number' ? target : await resolver.getPageIndex(target);
    return Number.isInteger(index) && index >= 0 && index < pageCount ? index : null;
  } catch {
    return null;
  }
}

export async function resolveOutline(
  items: readonly RawOutlineItem[] | null,
  resolver: DestinationResolver,
  pageCount: number,
): Promise<OutlineItem[]> {
  if (!items) return [];
  return Promise.all(
    items.map(async (item) => ({
      title: item.title.trim() || 'Untitled section',
      pageIndex: await pageIndexOf(item.dest, resolver, pageCount),
      children: await resolveOutline(item.items, resolver, pageCount),
    })),
  );
}
