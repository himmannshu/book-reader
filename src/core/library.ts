// Pure helpers for the book library. No storage or DOM access.

/** A readable title from a file name: no .pdf extension, underscores as spaces. */
export function titleFromFileName(fileName: string): string {
  const title = fileName
    .trim()
    .replace(/\.pdf$/i, '')
    .replace(/_/g, ' ')
    .trim();
  return title || 'Untitled book';
}

interface Recency {
  lastOpenedAt: number;
  addedAt: number;
}

/** Most recently opened first; ties go to the most recently added. Returns a new array. */
export function sortByRecentlyOpened<T extends Recency>(books: readonly T[]): T[] {
  return [...books].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt || b.addedAt - a.addedAt);
}

/** A file size for people: "840 KB", "12.4 MB", "1.2 GB" (decimal units, as Finder shows them). */
export function formatSize(bytes: number): string {
  if (bytes < 1e6) return `${Math.max(1, Math.round(bytes / 1e3))} KB`;
  if (bytes < 1e9) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${(bytes / 1e9).toFixed(1)} GB`;
}

const AUTHOR_MAX = 120;

/**
 * A book's author for the shelf (phase 22), from a PDF's metadata: a string, or a list of creators
 * (XMP). Control characters and runs of spaces collapse; null when nothing readable is left.
 */
export function cleanAuthor(raw: unknown): string | null {
  const parts = (Array.isArray(raw) ? raw : [raw])
    .filter((part): part is string => typeof part === 'string')
    .map((part) =>
      part
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u001f\u007f]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean);
  const author = parts.join(', ');
  if (!author) return null;
  return author.length > AUTHOR_MAX ? `${author.slice(0, AUTHOR_MAX - 1).trimEnd()}…` : author;
}
