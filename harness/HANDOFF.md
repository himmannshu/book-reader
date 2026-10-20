# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Claude Code (Opus 5.5), 2026-10-20
- Phase 09b In progress on branch phase-09b-sync-book-files, pushed (98f0915). Items 1–12 observed
  (CI run 39367480019 green; preview deployed; /api/files redirects to Access when logged out).
  R2 set up by the user. Remaining: item 13 on real devices using the preview
  https://phase-09b-sync-book-files.book-reader-cpi.pages.dev
- Phase 09a merged and deployed; still In progress only for its annotation check on two devices.
- Phase 08 Complete with exceptions (iPhone offline deferred). Phases 14–16 added for later.

## In flight

- Waiting on the user: the two-device check on the 09b preview.

## Next action

1. If the preview can't download ("isn't set up here yet"), the Preview FILES binding is missing;
   after a fix the user redeploys. "Still uploading": the Mac hasn't finished; keep the app open.
2. After item 13 passes: mark 09b (and 09a, if its annotation check is reported) Complete, then
   ask before merging into main (production deploy).

## Decisions worth remembering

- Phase 07 direction: D7–D9; contract approved by the user (Amendment 01 records approval).
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
- Fixture drawText uses unkerned Tj advances; sum individual glyph widths for the manifest. pdf-lib's
  whole-string width includes kerning that its PDF output does not apply.

## Blockers and doubts

- Phase 07: CI/full user checklist confirmation outstanding. Main lacks the completed
  Phase 06 dependency; the Phase 07 branch deliberately starts at 8372a99 instead of main.
- Phase 06:
  - No blocking contract items remain. B1–B3 corrected, user check confirmed, CI green.
  - N1 Highlight before highlights load silently does nothing; N2 WebKit has thin performance headroom
    (budget 40 ms) and the benchmark never measures text layers; N3 unsaved note touches the edge at 320 px.
    N4 duplicate import cleaned up with B2.
- Historical non-blocking review findings (not all rechecked in Phase 07; user to decide):
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
- WebKit has limited local perf headroom (latest pass 34 ms against 40; Phase 06 had a 51 ms
  failure under load). An occasional ~2.4 s scroll freeze is pre-existing (phase-03 context file).

<!-- AUTO:BEGIN -->
Snapshot 2026-10-20 00:20 EDT
- Branch: phase-09b-sync-book-files
- HEAD: 98f0915 phase 09b: evidence, F-010 passing locally, handoff
- Uncommitted files: 2
- Last verify: PASS at 2026-10-19 23:38 EDT (commit 2c6d7e4)
- Recent commits:
    98f0915 phase 09b: evidence, F-010 passing locally, handoff
    2c6d7e4 phase 09b: R2 dashboard path in the deploy guide
    50d5415 phase 09b: deploy guide for R2 (section 2c); AGENTS notes
    5832abb phase 09b: delete-everywhere e2e checks the cloud file is really gone
    846429e phase 09b: two-device e2e for book files (local R2); shared device fixture
- Changed files:
     M harness/HANDOFF.md
     M harness/build-log.md
<!-- AUTO:END -->
