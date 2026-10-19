# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Claude Code (Opus 5.5), 2026-10-19
- Phase: 04 In progress. Items 1–9 pass (re-review confirmed; N1/T1 also fixed since). Only item 10
  (CI: branch never pushed; needs the user's OK) and item 11 (user's real-book check) remain.
- Branch: phase-04-table-of-contents (not pushed)

## Done

- Phases 00–03 complete and on main (plus the first-page fix).
- Phase 04: Contents panel; review findings fixed (fresh reader per book, Escape from anywhere,
  focus pages after a jump, tests for lazy loading and the unreadable-outline state).
- Evaluator reviews: phase 01 PASS, phase 02 PASS, phase 03 PASS, phase 04 re-review FAIL only on
  items 10/11. Phase 00 skipped by the user's choice. Reviews in harness/code_review/.
- D5b recorded (ArrayBuffers supersede D5a's Blobs) with a phase 03 contract amendment.

## In flight

- Nothing running.

## Next action

1. Ask the user to OK pushing phase-04-table-of-contents for CI (item 10) and to check Contents on
   a real book (item 11). Then mark phase 04 Complete and ask before merging.
2. Ask the user which non-blocking review findings to fix (listed below), and when.
3. Then plan phase 05 (bookmarks).

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
Snapshot 2026-10-19 11:35 EDT
- Branch: phase-04-table-of-contents
- HEAD: 719a4b3 after reviews: handoff lists open findings and next steps
- Uncommitted files: 0
- Last verify: PASS at 2026-10-19 11:16 EDT (commit ca5c0dc)
- Recent commits:
    719a4b3 after reviews: handoff lists open findings and next steps
    ca1d8ba phase 03: evaluator review (PASS); D5b and contract amendment for ArrayBuffer storage
    66c8daa phase 02: evaluator review (PASS)
    974294a phase 04: log N1/T1 fixes; F-005 passing again
    ca5c0dc phase 04: Escape closes Contents from anywhere (N1); test the unreadable-outline state (T1)
<!-- AUTO:END -->
