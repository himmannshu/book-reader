# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Claude Code (Opus 5.5), 2026-10-19
- Phase: 02 In progress (contract items 1–10 observed; item 11 waits for the user)
- Branch: phase-02-performance-baseline (pushed; CI run 39197818164 green; not merged)

## Done

- Phases 00 and 01 complete and on main.
- Phase 02: heavy benchmark book, User Timing marks, `npm run test:perf` (Chromium + WebKit, DPR 2),
  user-agreed budgets in e2e/perf/budgets.json, perf step in verify and CI (CI enforces Chromium ×4,
  reports WebKit: contract amendment 1), memory planner replacing the 8-page cap (B2), visible pages
  drawn before overscan.

## In flight

- Contract item 11: the user runs `PERF_BOOK=/path/to/book.pdf npm run test:perf` on one real book.

## Next action

1. Record the user's item 11 numbers in the build log. Then set phase 02 Complete (build file,
   PLANS.md, build-log summary) and refresh the handoff.
2. Ask before merging into main.
3. Then plan phase 03 (local book persistence).

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
  Off-main-thread drawing or PDFium is a user decision (phase-02 context file).

<!-- AUTO:BEGIN -->
Snapshot 2026-10-18 23:26 EDT
- Branch: main
- HEAD: 794d4b8 phase 01: record merge and green CI
- Uncommitted files: 0
- Last verify: PASS at 2026-10-18 23:22 EDT (commit fd874e8)
- Recent commits:
    794d4b8 phase 01: record merge and green CI
    844e7a5 phase 01: make the 300-page scroll test fit CI WebKit time limits
    fd874e8 phase 01: refresh handoff snapshot
    922e9db phase 01: fix review findings B1 (height resize), B5 (keyboard focus), B6 (top gap)
    eecdf5a phase 01: evaluator review (PASS)
<!-- AUTO:END -->
