# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Claude Code (Opus 5.5), 2026-10-19
- Phase: 06 In progress. Highlights built; `scripts/verify.sh` PASS; items 1–12 observed (build log 14:45).
  Open: 13 (CI, needs a push the user approves), 14 (user's real-book check), evaluator review.
- Branch: phase-06-highlights (from main at a9c3832; not pushed). main has one unpushed commit (a9c3832).

## Done

- Phases 00–05 complete and on main (pushed at be88ca0).
- Phase 06: PDF.js text layer through the engine (visible pages, after a scroll pause), floating Highlight
  button, Remove highlight on click, highlights in PDF points + quote, may span pages, IndexedDB v3.
- Evaluator reviews: 01–03 PASS, 04 FAIL only on 10/11 (since done), 05 FAIL on B1 (fixed, not re-reviewed).

## In flight

- Nothing running.

## Next action

1. Ask the user to push phase-06-highlights (CI, item 13) and to check item 14 on a real book.
2. Run the evaluator review (`/evaluate 06`) if the user wants it before closing.
3. When 13 and 14 have evidence: set phase 06 Complete, ask before merging.

## Decisions worth remembering

- Engine API and memory bounds: harness/context/phase-01-open-and-read-pdf-context.md.
- Layout uses page 1's size as an estimate, then corrects after loadPageSizes() (anchor kept).
- pdfjs-dist 6.4 → minimum Safari/iOS 17.4.
- TypeScript pinned to 6.0.x until typescript-eslint supports 7 (phase-00 context file).

## Blockers and doubts

- Open, non-blocking review findings (user to decide):
  - Phase 05 minor: disabled toggle's reason only a tooltip (iOS can't show it); unused Viewer.currentPage;
    toggle ~2 px past the edge at 320 px.
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
Snapshot 2026-10-19 14:09 EDT
- Branch: phase-06-highlights
- HEAD: c4be6a2 phase 06: keep scrolling cheap: text layers wait for a scroll pause; scroll listener idle without a button
- Uncommitted files: 3
- Last verify: PASS at 2026-10-19 14:09 EDT (commit c4be6a2)
- Recent commits:
    c4be6a2 phase 06: keep scrolling cheap: text layers wait for a scroll pause; scroll listener idle without a button
    ac5f44d phase 06: e2e for the unsaved-book Highlight reason
    f7e4871 phase 06: log build progress
    7195126 phase 06: highlights e2e (Chromium + WebKit); quote spaces across lines and pages; line height from the text box; keep the offered selection when focus moves (Safari)
    1fd619a phase 06: Highlight button under a selection, Remove highlight on click; highlights load with the book
- Changed files:
     M harness/HANDOFF.md
     M harness/build-log.md
     M harness/features.json
<!-- AUTO:END -->
