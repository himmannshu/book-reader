// The bookmark model. Pure logic, no storage or DOM access (see phase-05 context file).

/** A bookmarked page. One per page of a book, so the id is derived from the two. */
export interface Bookmark {
  /** `bookmarkId(bookId, pageIndex)`. */
  id: string;
  /** The book's id (SHA-256 of its file). */
  bookId: string;
  /** 0-based page. */
  pageIndex: number;
  /** Automatic name, fixed when the bookmark is added, e.g. "Page 47 · Chapter 3". */
  label: string;
  /** Milliseconds since the epoch. */
  createdAt: number;
}

/** The parts of a table-of-contents entry a label needs (matches the engine's OutlineItem). */
export interface OutlineEntry {
  title: string;
  pageIndex: number | null;
  children: readonly OutlineEntry[];
}

export function bookmarkId(bookId: string, pageIndex: number): string {
  return `${bookId}:${pageIndex}`;
}

/**
 * "Page N", plus the title of the entry with the highest page at or before this one. On a tie the
 * later entry in reading order wins, so a chapter beats the part it opens.
 */
export function bookmarkLabel(pageIndex: number, outline: readonly OutlineEntry[]): string {
  let best: OutlineEntry | undefined;
  const visit = (entries: readonly OutlineEntry[]) => {
    for (const entry of entries) {
      const page = entry.pageIndex;
      if (page !== null && page <= pageIndex && page >= (best?.pageIndex ?? -1)) best = entry;
      visit(entry.children);
    }
  };
  visit(outline);
  const page = `Page ${pageIndex + 1}`;
  const title = best?.title.trim();
  return title ? `${page} · ${title}` : page;
}

/** In page order. Returns a new array. */
export function sortByPage<T extends { pageIndex: number }>(bookmarks: readonly T[]): T[] {
  return [...bookmarks].sort((a, b) => a.pageIndex - b.pageIndex);
}
