# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Claude Code (Opus 5.5), 2026-10-19
- Phase: 02 Complete; 03 not started. Side task done: real-book first-page investigation.
- Branch: perf-first-page-investigation (from phase-02-performance-baseline; local only, not pushed)

## Done

- Phases 00 and 01 complete and on main.
- Phase 02 complete on phase-02-performance-baseline (pushed; not merged into main).
- First-page investigation: the slow first page on DDIA (469 ms) came from page 2's CMYK JPEG
  decode (~300 ms) blocking page 1 in the single PDF.js worker. The viewer now draws overscan
  pages only after the visible ones. DDIA first page 133 ms (Chromium) / 129 ms (WebKit).
  Details: harness/context/first-page-investigation-context.md.

## In flight

- Nothing

## Next action

1. Ask the user whether to push perf-first-page-investigation and merge it (it sits on top of
   phase 02, so merge phase 02 first or together).
2. Ask the user before merging phase 02 into main.
3. Then plan phase 03 (local book persistence).

## Decisions worth remembering

- Engine API and memory bounds: harness/context/phase-01-open-and-read-pdf-context.md.
- Layout uses page 1's size as an estimate, then corrects after loadPageSizes() (anchor kept).
- Overscan pages wait for visible pages (single PDF.js worker); see the investigation context.
- pdfjs-dist 6.4 → minimum Safari/iOS 17.4.
- TypeScript pinned to 6.0.x until typescript-eslint supports 7 (phase-00 context file).

## Blockers and doubts

- Deferred review findings (user's call, see harness/code_review/phase-01-review.md):
  - B3: a page that fails to draw shows only a white box and is not retried.
  - B4: the PDF.js lint boundary misses dynamic `import()` and `.js` files under src/.
- WebKit p95 frame time is 28–33 ms on the M2 (noisy, up to ~40+ when the machine is hot),
  close to the 40 ms budget (main-thread drawing). Off-main-thread drawing or PDFium is a user
  decision (phase-02 context file).
- A page with a slow image (DDIA page 2) still takes ~300 ms to draw when reached; engine-level.

<!-- AUTO:BEGIN -->
Snapshot 2026-10-19 00:39 EDT
- Branch: perf-first-page-investigation
- HEAD: 4a92ad3 phase 02: draw overscan pages after visible ones (real-book first page 469 → 133 ms)
- Uncommitted files: 0
- Last verify: PASS at 2026-10-19 00:38 EDT (commit d841b09)
- Recent commits:
    4a92ad3 phase 02: draw overscan pages after visible ones (real-book first page 469 → 133 ms)
    d841b09 phase 02: refresh handoff snapshot
    bf249ca phase 02: real-book benchmark recorded; clean perf results per run; phase complete
    b21023e phase 02: refresh handoff snapshot
    fb0676e phase 02: context, evidence and handoff (item 11 awaits user)
<!-- AUTO:END -->
