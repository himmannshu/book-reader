# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Claude Code (Opus 5.5), 2026-10-19
- Phase: 05 Complete. All 14 items have evidence: verify PASS at aa73b5c, CI 39291151035 green on fdaa254,
  item 14 user-checked. The B1 fix (after the evaluator's FAIL) is tested but not re-reviewed.
- Branch: main (fast-forwarded to phase-05-bookmarks at be88ca0; both pushed, user-approved 2026-10-19).

## Done

- Phases 00–05 complete and on main (pushed at be88ca0).
- Phase 05: page bookmarks (toggle follows the page in view; ties within 1 px go to the earlier page),
  own Bookmarks panel, "Page N · <chapter>" names, IndexedDB v2 `bookmarks` store, bookmarks removed with
  their book. Fixed: App destroyed the open document when a saved file got its id.
- Evaluator reviews: 01–03 PASS, 04 FAIL only on 10/11 (since done), 05 FAIL on B1 (since fixed, not re-reviewed).

## In flight

- Nothing. (This handoff refresh is committed on main locally, not pushed.)

## Next action

1. Ask the user whether to re-review phase 05 or fix the open minor findings (below), then plan phase 06
   (highlights) in plan mode.

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
Snapshot 2026-10-19 13:17 EDT
- Branch: main
- HEAD: be88ca0 phase 05: item 14 user-checked; phase complete
- Uncommitted files: 1
- Last verify: PASS at 2026-10-19 13:05 EDT (commit aa73b5c)
- Recent commits:
    be88ca0 phase 05: item 14 user-checked; phase complete
    c0ad137 phase 05: item 13 CI green; handoff
    fdaa254 phase 05: log B1 fix and verify PASS; F-006 passing; handoff
    aa73b5c phase 05: fix B1 (current page ties within 1 px go to the earlier page); T1/T2 tests; comment
    c9cd68b phase 05: evaluator review (FAIL on B1); F-006 failing until fixed
- Changed files:
     M harness/HANDOFF.md
<!-- AUTO:END -->
