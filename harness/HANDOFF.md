# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Claude Code (Opus 5.5), 2026-10-19
- Phase: 06 (highlights) In progress. Built; `scripts/verify.sh` PASS at 52724f8 (122 unit, 110 e2e, 8 perf;
  WebKit p95 37 ms). Evaluator review FAIL (harness/code_review/phase-06-review.md): B1–B3 below.
  F-007 set failing until they are fixed.
- Branch: phase-06-highlights (not pushed). main is one commit ahead of origin (a9c3832, handoff only).

## Done this session

- Phase 04 closed (CI 39279260419 green); phase 05 (bookmarks) built, reviewed (its B1 page-tie bug fixed),
  CI 39291151035 green, user-checked. Both merged to main and pushed (be88ca0).
- Phase 06 built test-first (build log 14:20, 14:45): text-4-pages fixture; src/core/highlights.ts; IndexedDB
  v3 with one per-book store shared with bookmarks; engine `renderTextLayer` (PDF.js TextLayer + ported
  selection fix, src/engine/text-selection.ts); viewer text layers for visible pages after a 200 ms scroll
  pause; floating Highlight / Remove highlight (src/ui/SelectionActions.tsx, src/ui/useHighlights.ts);
  e2e/highlights.spec.ts (Chromium + WebKit). A WebKit scroll p95 regression was found and fixed (c4be6a2).

## In flight

- No code is half done. The user has not answered yet whether to fix B1–B3 before pushing (their last
  instruction was "review, then push"; the review failed, so this was asked first).

## Next action

1. Ask the user whether to fix B1–B3 (plus N1, N4) before pushing. If yes, start with B1 and a touch e2e test
   (Playwright WebKit `iPhone 13` / `iPad (gen 7)` profiles with `hasTouch`, `tap()`): drop the
   `onPointerDown` preventDefault in src/ui/SelectionActions.tsx (touch WebKit then fires no click), keep
   `onMouseDown` preventDefault for desktop, and rely on the saved `offeredRange` in useHighlights.ts. The unit
   test in SelectionActions.test.tsx that requires pointerdown preventDefault changes with it.

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
  - B1 (high): touch WebKit (iPhone/iPad emulation): tapping Highlight or Remove does nothing; pointerdown
    preventDefault suppresses the click. Confirm on a real device with contract item 14.
  - B2 (medium): a double press on Highlight saves two records (no in-flight guard in useHighlights.ts).
  - B3 (low-medium): after a resize/rotation rebuilds the text layer, the Highlight button stays but does
    nothing (no selectionchange fires).
  - N1 Highlight before highlights load silently does nothing; N2 WebKit p95 36–39 ms (budget 40) and the
    benchmark never measures text layers; N3 unsaved note touches the edge at 320 px; N4 duplicate import.
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
Snapshot 2026-10-19 14:42 EDT
- Branch: phase-06-highlights
- HEAD: 52724f8 phase 06: evaluator review (FAIL on B1 touch, B2, B3); F-007 failing until fixed
- Uncommitted files: 1
- Last verify: PASS at 2026-10-19 14:42 EDT (commit 52724f8)
- Recent commits:
    52724f8 phase 06: evaluator review (FAIL on B1 touch, B2, B3); F-007 failing until fixed
    9547db8 phase 06: perf headroom restored; verify PASS; items 1–12 observed; F-007 passing; handoff
    c4be6a2 phase 06: keep scrolling cheap: text layers wait for a scroll pause; scroll listener idle without a button
    ac5f44d phase 06: e2e for the unsaved-book Highlight reason
    f7e4871 phase 06: log build progress
- Changed files:
     M harness/HANDOFF.md
<!-- AUTO:END -->
