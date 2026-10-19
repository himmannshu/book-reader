# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Claude Code (Opus 5.5), 2026-10-19
- Phase: 04 In progress. The evaluator review FAILED (harness/code_review/phase-04-review.md);
  fixing its findings now.
- Branch: phase-04-table-of-contents (not pushed)

## Done

- Phases 00–03 complete and on main (plus the first-page fix).
- Phase 04: outline via the engine (src/engine/outline.ts), Viewer.scrollToPage, Contents panel
  (lazy outline, disabled broken entries, Escape, arrow keys, narrow overlay), e2e/contents.spec.ts.

## In flight

- The user asked (2026-10-19): fix the phase 04 findings with tests, re-run the phase 04 review,
  then run evaluator reviews for phases 02 and 03 one at a time. Skip phase 00.
- Findings to fix: (1) Contents stuck on "Loading contents…" after opening another book with the
  panel open; (2) Escape ignored when no entry has focus; (3) no test for lazy outline loading or
  for (1)/(2); minor: focus stays on the entry after a wide-layout jump.

## Next action

1. Failing tests for the findings, then fixes, then `scripts/verify.sh`.
2. Re-run `/evaluate 04`. Then `/evaluate 02`, then `/evaluate 03` (never overlapping: each runs perf).
3. Phase 04 still needs CI (ask before pushing) and the user's real-book check (item 11).

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
Snapshot 2026-10-19 01:23 EDT
- Branch: phase-04-table-of-contents
- HEAD: 729a719 phase 04: context, evidence and handoff (CI, item 11, review pending)
- Uncommitted files: 0
- Last verify: PASS at 2026-10-19 01:23 EDT (commit f1f3f99)
- Recent commits:
    729a719 phase 04: context, evidence and handoff (CI, item 11, review pending)
    f1f3f99 phase 04: log e2e and mutation checks
    303578d phase 04: e2e for outline order, named and broken destinations, empty state, keyboard, narrow window; arrow-key navigation
    cadc476 phase 04: Contents panel with lazy outline loading and chapter jump
    25c09a5 phase 04: outline mapping in the engine and Viewer.scrollToPage, with unit tests
<!-- AUTO:END -->
