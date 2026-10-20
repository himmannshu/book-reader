# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Claude Code (Opus 5.5), 2026-10-19
- Phase 09a In progress on branch phase-09a-sync-library-and-annotations, pushed. Items 1–12
  observed (CI run 39358742684 green; preview deployed; /api/sync redirects to Access when logged
  out). User finished the D1 / env var setup. Remaining: item 13 (the user checks sync on two real
  devices using the preview URL https://phase-09a-sync-library-and-a.book-reader-cpi.pages.dev).
- Phase 08 Complete with exceptions (iPhone offline deferred). Phase 09b planned as an outline.
  Phases 14–16 (voice notes, listen to a book, share excerpts) added to PLANS.md for later.

## In flight

- Waiting on the user: the two-device check on the preview (item 13).

## Next action

1. If the preview's status line says "Sign in again to sync" or "Sync failed", check the
   preview's ACCESS_AUD against the audience tag in the Access login redirect (starts 498b4e00)
   and the DB binding for Preview, then have the user redeploy.
2. After item 13 passes: mark 09a Complete, ask before merging into main (production deploy),
   then plan 09b in detail.

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
Snapshot 2026-10-19 22:35 EDT
- Branch: phase-09a-sync-library-and-annotations
- HEAD: 27f0197 planning: add voice notes, listen to a book, share excerpts as later phases
- Uncommitted files: 2
- Last verify: PASS at 2026-10-19 21:34 EDT (commit 6899844)
- Recent commits:
    27f0197 planning: add voice notes, listen to a book, share excerpts as later phases
    591048d phase 09a: refresh handoff snapshot
    2089d47 phase 09a: F-016 passing locally; handoff
    cd04837 phase 09a: two-device e2e covers highlights too (contract item 1)
    541e72d phase 09a: sync in verify; deploy guide for D1; AGENTS, context and build log
- Changed files:
     M harness/HANDOFF.md
     M harness/build-log.md
<!-- AUTO:END -->
