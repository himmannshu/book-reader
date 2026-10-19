# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Claude Code (Opus 5.5), 2026-10-19
- Phase: 03 Complete; 04 not started
- Branch: phase-03-local-book-persistence (pushed; CI run 39200828535 green; not merged into main)

## Done

- Phases 00–02 complete and on main.
- Phase 03: IndexedDB book store (D5a; bytes stored as ArrayBuffers), "Your books" list with
  open/remove (confirmed), Library button, storage error messages, lint boundary for browser storage,
  scroll benchmark now median of 3.

## In flight

- Branch `perf-first-page-investigation` (local only, from the first-page investigation session):
  draws visible pages before starting overscan; real-book first page 469 → 136 ms (Chromium).
  Not merged. It touches src/viewer, so merge it after phase 03, or ask the user.

## Next action

1. Ask the user before merging phase 03 (and separately the investigation branch) into main.
2. Then plan phase 04 (table of contents).

## Decisions worth remembering

- Engine API and memory bounds: harness/context/phase-01-open-and-read-pdf-context.md.
- Layout uses page 1's size as an estimate, then corrects after loadPageSizes() (anchor kept).
- pdfjs-dist 6.4 → minimum Safari/iOS 17.4.
- TypeScript pinned to 6.0.x until typescript-eslint supports 7 (phase-00 context file).

## Blockers and doubts

- Deferred review findings (user's call, see harness/code_review/phase-01-review.md):
  - B3: a page that fails to draw shows only a white box and is not retried.
  - B4: the PDF.js lint boundary misses dynamic `import()` and `.js` files under src/.
- WebKit p95 frame time is 28–33 ms on the M2, right at the 34 ms target (main-thread drawing).
- WebKit sometimes freezes ~2.5 s while scrolling the heavy book (pre-existing; phase-03 context file).
  Off-main-thread drawing or PDFium is a user decision (phase-02 context file).

<!-- AUTO:BEGIN -->
Snapshot 2026-10-19 00:56 EDT
- Branch: phase-03-local-book-persistence
- HEAD: 511803b phase 03: scroll benchmark is a median of 3; record save A/B, CI and WebKit stall finding
- Uncommitted files: 0
- Last verify: PASS at 2026-10-19 00:55 EDT (commit c6c3f9e)
- Recent commits:
    511803b phase 03: scroll benchmark is a median of 3; record save A/B, CI and WebKit stall finding
    c6c3f9e phase 03: lint boundary for browser storage; docs; correct build-log timestamps
    c1095e5 phase 03: e2e for remove with confirmation, dedupe, recency order, Library button
    a597856 phase 03: library list, reopen after reload, saved-state notice; store bytes as ArrayBuffers
    39d7880 phase 03: storage interface and IndexedDB book store with unit tests
<!-- AUTO:END -->
