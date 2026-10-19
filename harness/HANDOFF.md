# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Claude Code (Opus 5.5), 2026-10-19, taking over from Codex (usage limit).
- Phase 07 (notes) Complete: CI run 39331468496 green on 26875e4; local verify PASS (137/166/8);
  item 18 user-checked including editing. No independent review of phase 07 yet.
- Phase 06 Complete (CI 39320769897). Neither 06 nor 07 is merged into main.
- Branch: phase-07-notes (contains phases 04–06). origin/phase-07-notes is at 26875e4; later commits
  here are harness docs only, not pushed. main has phases 00–05; local main is one handoff commit
  (a9c3832) ahead of origin/main.

## Done (this session)

- Recorded CI, the user's editing confirmation and phase 07 completion; added the missing build-log
  summary rows for phases 06 and 07; committed Codex's pending harness notes.
- Issue #2 diagnosed (with the user's permission to read the local PDF's outline): the book's
  embedded outline really contains only "Preface.pdf" > "Preface" + 3 sections (5 entries, 152
  pages). The app shows it faithfully. Not a parser bug. Chapters for such books need contents
  generation (out of scope since phase 04).

## In flight

- Nothing running.

## Next action

1. Ask the user before merging phase 06 + 07 into main and pushing main.
2. Optional: independent review of phase 07 (`/evaluate 07`), as done for earlier phases.
3. Issue #2: with the user's OK, comment the diagnosis on the issue. Contents generation would be a
   new phase or enhancement to plan, not a bug fix.
4. Then plan the next phase (08, installable and hosted), after asking.

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
Snapshot 2026-10-19 18:16 EDT
- Branch: phase-07-notes
- HEAD: a09b202 phase 07: takeover; CI green and user check recorded; phase complete; issue #2 diagnosis
- Uncommitted files: 0
- Last verify: PASS at 2026-10-19 18:13 EDT (commit 26875e4)
- Recent commits:
    a09b202 phase 07: takeover; CI green and user check recorded; phase complete; issue #2 diagnosis
    26875e4 phase 07: record verified push and CI authorization
    43c3efa handoff: clarify PDF versus printed page numbering
    04da1da handoff: record reported notes and bookmark jump failures
    798c536 handoff: Codex 2026-10-19 phase 07 locally verified
<!-- AUTO:END -->
