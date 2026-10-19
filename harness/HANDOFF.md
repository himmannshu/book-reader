# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Codex, 2026-10-19
- Phase: 06 (highlights) In progress. User authorized fixing review blockers B1–B3.
  B1–B3 fixed; latest `scripts/verify.sh` PASS (122 unit, 130 e2e, 8 perf; WebKit p95 31 ms).
  F-007 passing again. Contract 13 (CI) and 14 (real-book/device user check) still pending.
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
- B3 test-first: eight failures before the fix (resize, focused resize, panel relayout, page eviction;
  Chromium + WebKit with selectionchange blocked). The hook observes selected-text removal only
  while offering Highlight; it clears stale actions/ranges and restores reader focus when needed.
  Full verify PASS includes fresh highlighting after each invalidation. A pre-existing viewer test
  hit its fixed 5 ms wait; that test now waits for the actual text-layer result.
- Recorded author correction verification in the original review. Its historical FAIL is preserved;
  an independent re-review has not run. No push, deployment or external writes.

## In flight

- No code is half done. B1 committed as 4341f7c; B2 as 1c5834c; B3 complete and verified locally.

## Next action

1. Obtain permission to push phase-06-highlights and run CI for contract item 13. The user must also
   report the real-book check (item 14), including iPhone/iPad if possible. Leave the phase In progress
   until those checks have evidence. Do not start phase 07.

## Decisions worth remembering

- Engine API and memory bounds: harness/context/phase-01-open-and-read-pdf-context.md.
- Layout uses page 1's size as an estimate, then corrects after loadPageSizes() (anchor kept).
- pdfjs-dist 6.4 → minimum Safari/iOS 17.4.
- TypeScript pinned to 6.0.x until typescript-eslint supports 7 (phase-00 context file).
- Highlights: rects in PDF points, top-left origin, rotation applied (same space as PageSize); line top/height
  from the text span's box, since Chromium rounds selection boxes to whole px (phase-06 context file).
- Text layers only for visible pages, after a scroll pause; the highlight hook's scroll listener must stay idle
  while no floating button shows, or WebKit p95 reaches the 40 ms budget.
- Touch actions must not cancel pointerdown: WebKit then suppresses the click. Keep mousedown
  prevention for desktop and use offeredRange for touch/keyboard focus changes.
- Ranges move when nodes are removed. The create-offer observer keeps the original endpoint nodes
  and disconnects on dismissal; it adds no observer/layout work to idle scrolling.

## Blockers and doubts

- Phase 06:
  - B1–B3 corrected and verified locally; physical-device confirmation remains part of item 14.
  - CI has not run for this branch; no real-book user report yet (contract items 13 and 14).
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
Snapshot 2026-10-19 15:16 EDT
- Branch: phase-06-highlights
- HEAD: 1c5834c phase 06: prevent duplicate pending highlight saves
- Uncommitted files: 8
- Last verify: PASS at 2026-10-19 15:15 EDT (commit 1c5834c)
- Recent commits:
    1c5834c phase 06: prevent duplicate pending highlight saves
    4341f7c phase 06: restore touch highlight actions in WebKit
    db28d3c handoff: build-log times match their commits
    f30eb4c handoff: correct build-log timestamp
    c701158 handoff: Claude Code (Opus 5.5) 2026-10-19
- Changed files:
     M e2e/highlights.spec.ts
     M harness/HANDOFF.md
     M harness/build-log.md
     M harness/code_review/phase-06-review.md
     M harness/context/phase-06-highlights-context.md
     M harness/features.json
     M src/ui/useHighlights.ts
     M src/viewer/viewer.test.ts
<!-- AUTO:END -->
