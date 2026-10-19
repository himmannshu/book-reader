# Phase 03 context: local book persistence

Material decisions only.

## Storage design

- The `BookStore` interface (src/storage/types.ts) has `add`, `list`, `getBytes`, `markOpened` and
  `remove`, plus `StorageError` with kinds `quota | unavailable | not-found | unknown`. The UI
  maps each kind to a readable message.
- The IndexedDB adapter (src/storage/indexeddb-book-store.ts) uses database `book-reader`, schema
  version 1, with two object stores:
  - `books`: metadata, keyPath `id`
  - `bookFiles`: the bytes, keyed by id

  Listing never loads the PDFs. `add` and `remove` each run as one transaction across both
  stores. A schema change must bump `DB_VERSION` and add a step in `upgrade()`.
- The book id is the SHA-256 of the file, so importing the same file twice keeps one entry and
  counts as opening it.
- After the first successful save, the adapter calls `navigator.storage.persist()` (best effort)
  so Safari is less likely to evict the books.
- Lint enforces the boundary: only src/storage may use `indexedDB` or `navigator.storage`.

## Books stored as ArrayBuffers, not Blobs (found while building)

- WebKit's default Playwright context rejects Blob and File values in IndexedDB, as Safari's
  private browsing does: the transaction errors. ArrayBuffers work there and in Chromium at
  similar speed (24 MB: about 25–29 ms to write, 14–16 ms to read).
- So the store keeps ArrayBuffers, and the interface returns bytes (`getBytes`), not a Blob.
- This also means private browsing can still save books, until the session ends.

## Saving never delays reading

- The picker flow opens the PDF first and shows it. Only then does it save, in the background,
  so an unreadable file is never kept. Success shows "Saved on this device." as a status
  message. A failure shows a readable alert, and the book stays open.
- Opening from the library reads the bytes, opens them in the engine, then updates the
  last-opened time.

## Parallel sessions and benchmarks

- An overlapping `npm run test:perf` from another worktree (the first-page investigation session)
  produced a failing perf run (WebKit p95 frame 50 ms, plus errors) and then port collisions.
  Rule added to AGENTS.md and harness/SWITCHING.md: never run perf in two worktrees at once.

## Findings carried forward

- Saving after opening adds about 25 ms to WebKit's first page (A/B median ~158 vs ~131 ms) and does
  not affect scrolling. If first page becomes tight, start the save after page 1 is drawn.
- WebKit sometimes freezes for about 2.5 s while scrolling the heavy book from 45%. It happens on main
  too, so it predates this phase. The scroll benchmark now reports the median of 3 scrolls, which
  hides a single freeze; the per-scroll samples in perf-results/ show it. Needs its own investigation.
- The first-page investigation session's fix (start overscan only after visible pages are drawn)
  is on its local branch `perf-first-page-investigation`, not merged here.
