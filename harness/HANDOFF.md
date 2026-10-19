# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Codex, 2026-10-19
- Phase: 06 (highlights) In progress. User authorized fixing review blockers B1–B3.
  B1–B3 fixed; latest `scripts/verify.sh` PASS with fixture fix (122 unit, 130 e2e, 8 perf; WebKit p95 37 ms).
  F-007 passing again. Contract 14 passed by the user's real-book/device report on 2026-10-19.
  Contract 13 (CI) failed: https://github.com/himmannshu/book-reader/actions/runs/39310131762.
  One Chromium fixture-width assertion failed; the manifest used kerned widths for unkerned PDF text.
  Generator/manifest corrected; local verification PASS; another authorized CI push is next.
- Branch: phase-06-highlights, pushed at 9463bfc and tracking origin/phase-06-highlights.
  main is one commit ahead of origin (a9c3832, handoff only).

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
  an independent re-review has not run.
- User confirmed the real-book/device check works (contract 14). Fresh local verify PASS at ad3ec91
  (122 unit, 130 e2e, 8 perf; WebKit p95 38 ms). User check committed as 9463bfc and pushed as
  authorized. GitHub run 39310131762 is executing scripts/verify.sh. No merge or deployment.

## In flight

- No code is half done. B1 committed as 4341f7c; B2 as 1c5834c; B3 as 57fa6ad, all verified locally.
  CI run 39310131762 failed on 9463bfc (122 unit and 129 browser checks passed; perf did not run).
  scripts/generate-fixtures.mjs now sums unkerned glyph advances; regenerated manifest widths.
  PDF bytes unchanged; runtime, test tolerance and budgets unchanged. Regression check red → green.
  First local verify of the fixture fix passed 122 unit/130 browser checks but WebKit p95 was 51 ms
  (budget 40); full rerun PASS, p95 37 ms. Host load averages at retry: 11.33, 8.26, 6.57.

## Next action

1. Commit and push the verified fixture correction (authorized), and monitor CI.
   If CI passes, record its run URL and close phase 06. Do not merge or start phase 07.

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
  - B1–B3 corrected and verified locally; the user confirmed the real-book/device check works.
  - CI failed its first run; verified fixture metadata correction ready to push (contract item 13).
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
Snapshot 2026-10-19 16:32 EDT
- Branch: phase-06-highlights
- HEAD: 9463bfc phase 06: record user device check and pre-CI verification
- Uncommitted files: 4
- Last verify: PASS at 2026-10-19 16:32 EDT (commit 9463bfc)
- Recent commits:
    9463bfc phase 06: record user device check and pre-CI verification
    ad3ec91 handoff: Codex 2026-10-19 phase 06 blockers corrected
    57fa6ad phase 06: dismiss stale highlight offers when text is released
    1c5834c phase 06: prevent duplicate pending highlight saves
    4341f7c phase 06: restore touch highlight actions in WebKit
- Changed files:
     M harness/HANDOFF.md
     M harness/build-log.md
     M scripts/generate-fixtures.mjs
     M tests/fixtures/manifest.json
<!-- AUTO:END -->
