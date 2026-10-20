# Phase 11 review: Library view

- Reviewer: Claude Code (Opus 5.5, evaluator subagent, fresh context), 2026-10-20
- Branch: phase-11-library-view at af9a0a4 (worktree /home/user/book-reader-p11), stacked on
  phase 10 (9b5e7ba, reviewed in phase-10-review.md)
- Inputs: harness/contracts/phase-11-contract.md, harness/build/phase-11-library-view.md,
  harness/EVALUATOR.md, diff 9b5e7ba...af9a0a4

## Verdict: FAIL

Two contract-item-7 blockers. Background cover work keeps running while a book opens or is open,
and it measurably delays page 1. The queue can also open the same book for a cover twice at once.
Everything else works well when exercised.

## Environment (cloud container)

- Node 24 via `source /opt/nvm/nvm.sh && nvm use 24`. The worktree has its own node_modules.
- Playwright cannot download browsers here. A Chromium 153 stand-in was used
  (`PLAYWRIGHT_BROWSERS_PATH=$HOME/pw-browsers`), with Chromium projects only. WebKit is not
  covered locally. Only a full CI run covers it.
- `scripts/verify.sh` could not be run as-is because it runs WebKit projects. I ran its steps one
  by one with the Chromium projects (below).
- "Chromium reports the app as installable" fails for environment reasons. It also fails on the
  baseline.
- Perf timings on this machine are noisy and slower than the Mac budgets. I compared before and
  after only, alternating sequential runs between this branch and phase 10
  (/home/user/book-reader at 9b5e7ba). No budgets were changed.
- Probes were run from a scratch directory outside the repo, using a copy of e2e/helpers.ts and
  instrumentation that wraps `IDBObjectStore.put/get` for `covers`/`bookFiles`, `canvas.toBlob`
  for JPEG, and `URL.create/revokeObjectURL`. One probe used a generated 2.3 MB PDF whose page 1
  has 600k filled rectangles, so drawing it is slow. Both worktrees were left clean.

## Checks run

| Check | Result |
|---|---|
| `npm run lint`, `format:check`, `typecheck` | PASS |
| `npm run test:unit` | 36 files, 315 tests passed |
| `npx playwright test --project=chromium` | 107 passed, 1 failed (installability, environment) |
| `-c playwright.sync.config.ts --project=sync-chromium` | 15 passed |
| `-c playwright.perf.config.ts --project=perf-chromium`, alternating x2 | See item 10 |
| `gh run list --branch phase-11-library-view` | Only push run 39381181552 (quick checks, 1m17s, success). No full run |

## Contract items

| # | Result | Evidence |
|---|---|---|
| 1 | PASS | e2e `library-view` 1–2 pass. The cover pixel matches the page-1 band colour, both for the close-time draw and for the background draw after a reload. Probe P1/P2 logs show JPEG encodes and `covers` puts happening. |
| 2 | PASS | e2e 3 passes. Seeded `hasFile` record shows `.cover-placeholder` with the title. A book removed from the device keeps its drawn cover (as item 8 intends). |
| 3 | PASS | e2e 4: "Page 151 of 300 · 50%", `aria-valuenow=50`, and "Not started" before. Unit `readingProgress` covers clamping and unknown page counts. See N2 for books read before this phase. |
| 4 | PASS | e2e 5 passes. Probe P6: filter "elan" matches "Élan vital". "No books match …" is shown when nothing matches. |
| 5 | PASS | e2e 5: after reload the Sort combobox is `title` and the order is kept. |
| 6 | PASS | e2e 6 passes (100 seeded books shown < 1 s from navigation, filter updates < 100 ms). This covers the "all covers already exist" case only (see N1). |
| 7 | **FAIL** | B1 and B2 below: cover work runs while a book is opening or open, and two cover jobs can run at once. The cited evidence (queue unit test + perf) cannot detect either problem. The unit test exercises the queue in isolation, and the perf benchmark never has a cover job in flight. |
| 8 | PASS | Unit tests in `cover-store.test.ts`: kept on remove-from-device, deleted on remove and on remote deletion, v7 → v8 upgrade keeps books, files and states. Probe P4 deleted a book (Delete everywhere) while its background cover job was running: the late put was ignored and 0 covers were left. |
| 9 | PASS | Full Chromium e2e and sync suites pass (open, remove from device, delete everywhere, phase 09b downloads with progress). |
| 10 | PASS (local, comparative) | Phase 11 firstPage 600 / 491 ms vs phase 10 430 / 555 ms. p95 frame 33.3 / 33.4 vs 33.3 / 16.8. Same noisy distribution, and both fail the Mac budget here as on the baseline. No regression seen in the benchmark, but it does not exercise covers (see B1). WebKit unverified locally. |
| 11 | NOT MET (pending) | Local stand-in green apart from environment failures. The full CI run (`gh workflow run verify.yml --ref phase-11-library-view`) has not been made. Only the quick-check push run exists. |
| 12 | PENDING | User check on Mac, iPad and iPhone. |

## Rubric

| Criterion | Score | Threshold | Met? | Why |
|---|---|---|---|---|
| Contract fidelity | 3 | 5 | No | Item 7 fails. Items 11 and 12 are still open. |
| Functionality | 4 | 4 | Yes | Shelf, covers, progress, sort, filter, keyboard and narrow widths all work end to end. |
| Robustness | 3 | 4 | No | The queue does not control concurrency (B2). In-flight jobs cannot be cancelled (B1). Deleting a book mid-draw and broken PDFs are handled. |
| Code quality | 3 | 3 | Yes | Readable, follows conventions. The queue effect restarts on every shelf change, which makes the queue's own chaining dead in practice (N1). |
| Test quality | 3 | 3 | Yes | Pixel-based cover checks and timed 100-book checks are good. Item 7 has no test that could fail, and the close-time draw is masked by the background queue (N4). |
| Product depth | 4 | 3 | Yes | Real covers, persisted sort, progress bars. |
| Design | 3 | 3 | Yes | Coherent cards in light and dark themes, no sideways scroll at 320/390/1280. Long-title placeholder clips (N3). |

## Blockers

### B1. Cover work runs while a book is opening or open (contract item 7)

There are two paths.

1. **Close-time draw on document swap.** In `src/ui/App.tsx:219-233`, the effect cleanup for the
   previous `doc` draws its cover whenever `book.doc` changes. That also happens when the user
   picks another file with "Open PDF" while reading, which is the normal way to import several
   books in a row.
   - Probe P1: import basic-3-pages, then open long-300-pages from the toolbar while reading.
   - Log: `{"ev":"jpeg","readerOpen":true}` and `{"ev":"coverPut","readerOpen":true}`. The first
     book's cover was drawn while the second was open and drawing its first page.
2. **Background job not cancelled.** `startCoverQueue().stop()` (`src/ui/covers.ts`) lets the job
   in progress finish ("a started job always finishes cleanly"). Opening a book from the shelf
   while a job runs makes the job's `engine.open` and page-1 render compete with the reader.
   - Probe P8: heavy-page-1 book without a cover. Click basic-3-pages 50 ms after the cover job
     reads its file.
   - Click to first page rendered, over 4 runs each:
     - No cover job: 137, 240, 255, 208 ms (median about 224).
     - With a job in flight: 419, 302, 357, 506 ms (median about 388).
   - The cover put landed later with `readerOpen: true` (t=7114 ms).

Expected: no cover work while a book is opening or open. Suggested direction, the author's call:
- Make jobs abortable: `stop()` destroys the in-flight document and skips the put.
- Do not draw on a document swap. Leave that book to the background queue instead of drawing it
  as the next book opens.
- Add an App-level test that fails when a cover is encoded or put while the reader is mounted.

### B2. Two cover jobs can run at once, including for the same book (contract item 7)

The queue effect at `src/ui/App.tsx:241-269` depends on `books` and `shelf`, so any change
restarts it, for example:
- `refreshBooks` after a remove,
- a sync `onRemoteChanges` that calls `loadShelf`,
- another cover finishing.

`stop()` does not end the job in flight, and the new queue rebuilds `missing` from
`shelf.covers`, which does not yet contain the in-flight book. After 1.5 s it starts that same
book again.

Probe P7 (heavy page-1 book, then "Remove from this device" on another book while the job runs)
logged two `bookFiles` reads of the same book from two queues, 1.6 s apart
(`fileGet aaaa t=1601`, `fileGet aaaa t=3265`), with neither finished. That means two documents
were open and drawing at once. Any job longer than 1.5 s triggers this, which is likely for large
real books on an iPhone.

Expected: at most one book opened for a cover at a time. Suggested fix: keep one long-lived queue
(or an in-flight id or set in a ref) that the effect feeds, instead of recreating it.

## Non-blocking findings

- **N1. Every finished cover restarts the queue and re-reads every cover.**
  - Each finished cover calls `loadShelf` (`App.tsx:174-195`). That re-reads all cover bytes from
    IndexedDB, creates a new object URL for every cover and re-renders every `<img>`.
  - Because `shelf` is an effect dependency, the queue then restarts with a fresh 1.5 s delay. So
    the `setTimeout(next, 0)` chaining in `startCoverQueue` never runs in practice.
  - For an upgraded library of 100 books without covers, that is O(n²) cover reads and at least
    150 s of idle delays. The 100-book test only seeds books that already have covers.
- **N2. Books read before this phase show "Not started" even when partly read.**
  - Their saved states have no `pageCount`.
  - `ReaderView` writes the state (`ReaderView.tsx:150`) only after the position changes, so
    opening and closing such a book does not fix it. Only scrolling does.
  - Suggestion: store `pageCount` on open, or from the cover job, which already has the document.
- **N3. The placeholder clips the start of long titles.**
  - `.cover-placeholder` (`app.css:696`) centres the text vertically with `overflow: hidden`, so a
    long title loses its first lines. At 320 px it starts at "Title That Goes On…".
  - The line-clamped `.library-title` also shows a sliver of the third line under the ellipsis
    at 1280 px.
  - Screenshots: /tmp/claude-0/-home-user-book-reader/87ff85ac-1b70-574c-9dd2-22d0006f0672/scratchpad/shots/
- **N4. Tests do not separate the two drawing paths.**
  - If the close-time draw were removed, e2e test 1 would still pass, because the background
    queue draws the cover within the 5 s expect timeout.
  - No test asserts "no cover work while reading" or "one at a time" at the App level.
- **N5. Cover object URLs are not revoked when App unmounts.** This is trivial in practice. Round
  trips do not leak: probe P5 created 14 and revoked 12 over 5 open/close cycles, and 2 are live
  for the 2 covers shown.
- **N6. Background failures are silent.** A broken PDF in the background queue is tried once and
  stays a placeholder, with no alert and no console message, because the `PdfOpenError` kind is
  "expected" (probe P3). That is acceptable for a background task, but nowhere tells the user why
  that book has no cover. A password-protected PDF follows the same path (by code reading, not
  run).
- **N7. Process notes.** The HANDOFF.md AUTO snapshot is stale (it shows branch phase-10 at
  01:07). The build log says the core shelf tests and the e2e spec were not run red first.

## Checked and fine

- Keyboard: Tab order is Open PDF, Theme, Filter, Sort, then each book's open button and Remove.
  Enter on a cover button opens the book.
- Accessible names: the cover is `alt=""` and the placeholder is `aria-hidden`, so the button
  name is the title.
- Dark theme and 320/390 px widths: no horizontal overflow, two-column grid on phones.
- Accent and case-insensitive filter. Whitespace-only filter shows all books.
- Deleting a book mid-draw leaves no orphan cover (`covers.put` checks the book in the same
  transaction).

## Appendix (author, 2026-10-20 07:40 UTC): blockers addressed

- B1 and B2: covers now come from one `CoverWorker` (src/ui/covers.ts) that lives outside React renders: one job
  at a time, never the same book twice, no restart when the shelf changes, paused (and the job in progress
  cancelled: the drawing is cancelled and its document destroyed) as soon as a book starts opening, resumed after
  the Library has been idle for 1.5 s, and jobs back to back afterwards (no 1.5 s gap per book). The closing book's
  cover is drawn only when going back to the Library; replacing it with another book leaves it to the worker.
  Finished covers are added to the shelf one by one (no full reload).
- New tests: 5 unit tests for the worker (red first: no CoverWorker); e2e "no cover is drawn while a book is open,
  even when opening one book after another". Mutation: removing the pauses makes it fail (2 covers stored while
  reading).
- B3: full CI started on this branch after these fixes (see build log).
- Non-blocking: placeholder shows the start of long titles; card titles clamp cleanly. Not changed: progress for
  books read before phase 11 appears after they are next read; a broken PDF keeps its placeholder (logged).
