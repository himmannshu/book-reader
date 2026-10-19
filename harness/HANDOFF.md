# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Claude Code (Opus 5.5), 2026-10-19
- Phases 00–07 Complete and merged into main (5ba0694); main pushed; CI run 39334209183 green.
- Branch: main. No phase in progress.

## Done (this session)

- Took over phase 07 from Codex; recorded CI and the user's check; phase 07 Complete.
- Merged phase-07-notes (with phase 06) into main; verify PASS (137/166/8); CI green on main.
- Issue #2 diagnosed: the book's embedded outline only contains the Preface (5 entries, 152 pages);
  the app shows it faithfully. Contents generation would be a new enhancement.

## In flight

- Nothing running.

## Next action

1. Ask the user what comes next. Options already raised: an independent review of phase 07
   (`/evaluate 07`, never done); commenting the issue #2 diagnosis on GitHub (needs OK); a
   contents-generation enhancement for books with incomplete outlines; the printed page-number UX
   follow-up; open review findings (below); then plan phase 08 (installable and hosted).

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
Snapshot 2026-10-19 18:29 EDT
- Branch: main
- HEAD: 64a0195 after phase 07: record merge and green CI on main
- Uncommitted files: 0
- Last verify: PASS at 2026-10-19 18:20 EDT (commit 5ba0694)
- Recent commits:
    64a0195 after phase 07: record merge and green CI on main
    5ba0694 Merge branch 'phase-07-notes': phases 06 (highlights) and 07 (notes)
    7d7798d phase 07: refresh handoff snapshot
    a09b202 phase 07: takeover; CI green and user check recorded; phase complete; issue #2 diagnosis
    26875e4 phase 07: record verified push and CI authorization
<!-- AUTO:END -->
