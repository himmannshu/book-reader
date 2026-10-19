# Phase 05 context: bookmarks

Material decisions only. The user chose the first three in chat on 2026-10-19.

## What a bookmark is

- A bookmark marks a **page**: at most one per page, toggled on and off from the reader. Choosing it
  jumps to the page top through `Viewer.scrollToPage` (same as Contents).
- The **current page** is the page covering the most of the reader's viewport, with ties going to
  the earlier page (`currentPageAt` in src/viewer/layout.ts). The viewer reports it through an
  `onPageChange` callback only when it changes, so React re-renders once per page, not per frame.
- Automatic name, computed once when the bookmark is added and then stored: "Page N", plus
  " · <title>" of the outline entry with the highest page ≤ N (the later entry in reading order on a
  tie, so a chapter wins over its part). Only "Page N" when the book has no outline or no entry
  before page N. The list never loads the outline.

## Record and storage

- `Bookmark { id, bookId, pageIndex, label, createdAt }`, model in src/core/bookmarks.ts.
- `id = "<bookId>:<pageIndex>"`. Deterministic, so one bookmark per page holds by construction,
  and the same page bookmarked on two devices is the same item for phase 09's last-write-wins sync.
  Deletion is a hard delete for now. Phase 09 decides whether it needs tombstones.
- IndexedDB schema version 2 adds a `bookmarks` object store (keyPath `id`, index `bookId`). The
  upgrade from version 1 keeps every book and file. Removing a book deletes its bookmarks in the same
  transaction.
- Bookmarks need the book's id (its SHA-256). A book opened from the Library has it at once. A newly
  opened file gets it when its save finishes. If the save fails, the toggle stays disabled and says why.

## Panels

- Bookmarks is its own panel in the side area Contents uses. Only one panel is open at a time.
  The keyboard rules (arrows, Home, End, Escape back to the opening button) and the narrow-window
  rule (overlay, close after a choice) are shared code, not copied.
