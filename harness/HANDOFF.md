# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Codex, 2026-10-19
- Phase: 06 (highlights) In progress. User authorized fixing review blockers B1–B3.
  B1–B2 fixed; latest `scripts/verify.sh` PASS (122 unit, 122 e2e, 8 perf; WebKit p95 33 ms).
  B3 still open; F-007 remains failing until all fixes are verified.
- Branch: phase-06-highlights (not pushed). main is one commit ahead of origin (a9c3832, handoff only).

## Done this session

- Orientation baseline PASS at db28d3c (122 unit, 110 e2e, 8 perf); clean tree.
- B1 test-first: iPhone 13 and iPad (gen 7) WebKit taps on Highlight and Remove each failed before
  the fix. Removed pointerdown prevention; retained mousedown prevention and the saved range.
  Updated the unit assertion and phase context. Full verify PASS includes all eight new touch checks
  in Chromium + WebKit, including save/remove persistence after reopening.
- B2 test-first: two activations before the write finishes stored two identical records in both
  browsers. useHighlights now guards the pending write synchronously and releases the guard in
  finally. Full verify PASS includes exactly-one-record, full removal/reopen, and quota-failure retry.

## In flight

- B1 committed as 4341f7c; B2 complete. B3 has not started. This pass is authorized;
  no further routine approval needed.

## Next action

1. Reproduce B3 with browser regressions, then invalidate the floating action when its selected text
   layer is removed. Run full verify and record the evidence. Do not push.

## Decisions worth remembering

- Engine API and memory bounds: harness/context/phase-01-open-and-read-pdf-context.md.
- Layout uses page 1's size as an estimate, then corrects after loadPageSizes() (anchor kept).
- pdfjs-dist 6.4 → minimum Safari/iOS 17.4.
- TypeScript pinned to 6.0.x until typescript-eslint supports 7 (phase-00 context file).
- Highlights: rects in PDF points, top-left origin, rotation applied (same space as PageSize); line top/height
  from the text span's box, since Chromium rounds selection boxes to whole px (phase-06 context file).
- Text layers only for visible pages, after a scroll pause; the highlight hook's scroll listener must stay idle
  while no floating button shows, or WebKit p95 reaches the 40 ms budget.

## Blockers and doubts

- Phase 06 review (blocking until fixed):
  - B1 fixed in emulation; confirm on a real device with contract item 14.
  - B2 fixed: repeated activation during a pending save now stores one record.
  - B3 (low-medium): after a resize/rotation rebuilds the text layer, the Highlight button stays but does
    nothing (no selectionchange fires).
  - N1 Highlight before highlights load silently does nothing; N2 WebKit has thin performance headroom
    (budget 40 ms) and the benchmark never measures text layers; N3 unsaved note touches the edge at 320 px.
    N4 duplicate import cleaned up with B2.
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
Snapshot 2026-10-19 15:12 EDT
- Branch: phase-06-highlights
- HEAD: 4341f7c phase 06: restore touch highlight actions in WebKit
- Uncommitted files: 4
- Last verify: PASS at 2026-10-19 15:12 EDT (commit 4341f7c)
- Recent commits:
    4341f7c phase 06: restore touch highlight actions in WebKit
    db28d3c handoff: build-log times match their commits
    f30eb4c handoff: correct build-log timestamp
    c701158 handoff: Claude Code (Opus 5.5) 2026-10-19
    52724f8 phase 06: evaluator review (FAIL on B1 touch, B2, B3); F-007 failing until fixed
- Changed files:
     M e2e/highlights.spec.ts
     M harness/HANDOFF.md
     M harness/build-log.md
     M src/ui/useHighlights.ts
<!-- AUTO:END -->
