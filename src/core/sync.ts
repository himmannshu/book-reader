// Sync rules shared by the browser and the server (functions/). Pure: no storage, DOM or network.
// Each synced item carries a stamp (updatedAt + device). The newest stamp wins, per item; a
// deletion is an item with `deleted: true` (a tombstone), so it travels like any other change.

export type SyncKind = 'book' | 'bookmark' | 'highlight' | 'note';

export interface SyncItem {
  kind: SyncKind;
  id: string;
  /** The book the item belongs to; for a book, its own id. */
  bookId: string;
  /** Milliseconds since the epoch, from `nextStamp`. */
  updatedAt: number;
  deleted: boolean;
  /** The device that made the change; breaks exact ties the same way everywhere. */
  device: string;
  /** The item as stored locally (Bookmark, Highlight, Note or book record); null when deleted. */
  data: unknown;
}

type Stamp = Pick<SyncItem, 'updatedAt' | 'device'>;

/** True if `a` is a later write than `b`. */
function laterThan(a: Stamp, b: Stamp): boolean {
  return a.updatedAt !== b.updatedAt ? a.updatedAt > b.updatedAt : a.device > b.device;
}

/**
 * Last write wins: apply `incoming` only if it is later than what is stored. An older copy can never
 * bring back a deleted item; a genuinely later write can (for example re-bookmarking a page).
 */
export function shouldApply(stored: Stamp | undefined, incoming: Stamp): boolean {
  return stored === undefined || laterThan(incoming, stored);
}

/** The stamp for a new write: the clock, but always later than the item's previous stamp. */
export function nextStamp(previous: number | undefined, now: number): number {
  return previous === undefined ? now : Math.max(now, previous + 1);
}
