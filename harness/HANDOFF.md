# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Claude Code (Opus 5.5), 2026-10-19
- Phase: 05 In progress. Built and `scripts/verify.sh` PASS; contract items 1–12 observed (build log 12:42).
  Open: 13 (CI, needs a push the user approves), 14 (user's real-book check), evaluator review.
- Branch: phase-05-bookmarks (from main at 71a46b6; not pushed)

## Done

- Phases 00–04 complete and on main (main pushed at 71a46b6).
- Phase 05: page bookmarks (toggle follows the page in view), own Bookmarks panel, "Page N · <chapter>"
  names, IndexedDB v2 `bookmarks` store, bookmarks removed with their book. Fixed a bug the new e2e found:
  App destroyed the open document when a saved file got its id (cleanup effect now keyed on the doc).
- Evaluator reviews: phase 01–03 PASS, 04 re-review FAIL only on items 10/11 (both since done). Phase 00 skipped.

## In flight

- Nothing running. phase-05-bookmarks is committed locally only.

## Next action

1. Ask the user to push phase-05-bookmarks (for CI, item 13), and to check item 14 on a real book
   (`npm run dev`, open the book, bookmark a few pages, reload, jump back).
2. Run the evaluator review (`/evaluate 05`, fresh context) if the user wants it before closing.
3. When 13 and 14 have evidence: set phase 05 Complete (build file, PLANS.md, summary row), ask before merging.
4. Non-blocking review findings (below) stay open until the user picks which to fix.

## Decisions worth remembering

- Engine API and memory bounds: harness/context/phase-01-open-and-read-pdf-context.md.
- Layout uses page 1's size as an estimate, then corrects after loadPageSizes() (anchor kept).
- pdfjs-dist 6.4 → minimum Safari/iOS 17.4.
- TypeScript pinned to 6.0.x until typescript-eslint supports 7 (phase-00 context file).

## Blockers and doubts

- Open, non-blocking review findings (user to decide):
  - Phase 03 F1 (medium, iPhone): book title shrinks to 0 px while confirming removal at 390 px.
  - Phase 03 F2/F3: wrong "unavailable" wording at startup; save-failure alert survives Library.
  - Phase 03 F4–F6, F8: missing-file record stays listed; misleading message on list-refresh failure;
    markOpened failures not logged; remove confirmation not disabled while opening.
  - Phase 02 F1: redraw storm when visible pages exceed the memory budget (matters for zoom-out, phase 10).
  - Phase 02 F2: memory checks pass even with the cap removed; no browser test for lowered resolution.
  - Phase 02 nits: perf-marks uses `performance` in src/core; page:rendered marks accumulate; stale e2e name.
  - Phase 01 B3 (failed page draw shows a white box), B4 (lint misses dynamic import and .js).
  - Header notice causes 5 px sideways scroll at 320 px.
- WebKit p95 frame time ~28–37 ms on the M2 (budget 40); an occasional ~2.4 s WebKit scroll freeze
  is pre-existing and uninvestigated (phase-03 context file).

<!-- AUTO:BEGIN -->
Snapshot 2026-10-19 12:35 EDT
- Branch: phase-05-bookmarks
- HEAD: 03bc129 phase 05: log build progress
- Uncommitted files: 3
- Last verify: PASS at 2026-10-19 12:34 EDT (commit 03bc129)
- Recent commits:
    03bc129 phase 05: log build progress
    57dd51f phase 05: bookmarks e2e (Chromium + WebKit); shared page-at-top and import helpers
    0ffbfed phase 05: keep the open document when a new file gets its stored id
    c6ceff1 phase 05: bookmark model, IndexedDB v2 bookmark store, toggle and Bookmarks panel
    505f713 phase 05: viewer reports the current page (currentPageAt, onPageChange)
- Changed files:
     M harness/HANDOFF.md
     M harness/build-log.md
     M harness/features.json
<!-- AUTO:END -->
