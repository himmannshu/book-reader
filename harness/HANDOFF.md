# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Claude Code (Opus 5.5), 2026-10-19
- Phase: 04 In progress (items 1–9 observed, verify PASS; CI, item 11 and evaluator review pending)
- Branch: phase-04-table-of-contents (not pushed yet)

## Done

- Phases 00–03 complete and on main (plus the first-page fix).
- Phase 04: outline via the engine (src/engine/outline.ts), Viewer.scrollToPage, Contents panel
  (lazy outline, disabled broken entries, Escape, arrow keys, narrow overlay), e2e/contents.spec.ts.

## In flight

- The user asked for an evaluator review after phase 04.

## Next action

1. Run the evaluator (`/evaluate 04`), relay the verdict.
2. With the user's OK: push the branch for CI. The user checks Contents on a real book (item 11).
3. Mark phase 04 Complete only when items 10 (CI) and 11 have evidence; ask before merging.

## Decisions worth remembering

- Engine API and memory bounds: harness/context/phase-01-open-and-read-pdf-context.md.
- Layout uses page 1's size as an estimate, then corrects after loadPageSizes() (anchor kept).
- pdfjs-dist 6.4 → minimum Safari/iOS 17.4.
- TypeScript pinned to 6.0.x until typescript-eslint supports 7 (phase-00 context file).

## Blockers and doubts

- Deferred review findings (user's call, see harness/code_review/phase-01-review.md):
  - B3: a page that fails to draw shows only a white box and is not retried.
  - B4: the PDF.js lint boundary misses dynamic `import()` and `.js` files under src/.
- WebKit p95 frame time is 28–33 ms on the M2, right at the 34 ms target (main-thread drawing).
- WebKit sometimes freezes ~2.5 s while scrolling the heavy book (pre-existing; phase-03 context file).
  Off-main-thread drawing or PDFium is a user decision (phase-02 context file).

<!-- AUTO:BEGIN -->
Snapshot 2026-10-19 01:03 EDT
- Branch: main
- HEAD: 6e44e61 Merge branch 'perf-first-page-investigation': draw overscan after visible pages
- Uncommitted files: 0
- Last verify: PASS at 2026-10-19 01:03 EDT (commit 7837cee)
- Recent commits:
    6e44e61 Merge branch 'perf-first-page-investigation': draw overscan after visible pages
    7837cee phase 03: refresh handoff snapshot
    c7ce9a8 phase 03: item 12 user-checked in Safari; phase complete
    5533f82 phase 03: refresh handoff snapshot
    511803b phase 03: scroll benchmark is a median of 3; record save A/B, CI and WebKit stall finding
<!-- AUTO:END -->
