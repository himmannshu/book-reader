# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Claude Code (Opus 5.5), 2026-10-19
- Phase: 02 Complete; 03 not started
- Branch: phase-02-performance-baseline (pushed; not merged into main)

## Done

- Phases 00 and 01 complete and on main.
- Phase 02 complete: speed budgets enforced by `scripts/verify.sh` (both browsers locally; CI enforces
  Chromium ×4 and reports WebKit), memory planner (B2 fixed), real-book run recorded.

## In flight

- Nothing

## Next action

1. Ask the user before merging phase 02 into main.
2. Open question for the user: investigate the real-book first-page time (462 ms in Chromium on a
   24 MB book, target 400 ms); see the phase-02 context file.
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
Snapshot 2026-10-19 00:12 EDT
- Branch: phase-02-performance-baseline
- HEAD: fb0676e phase 02: context, evidence and handoff (item 11 awaits user)
- Uncommitted files: 0
- Last verify: FAIL at 2026-10-19 00:12 EDT (commit 7d95724)
- Recent commits:
    fb0676e phase 02: context, evidence and handoff (item 11 awaits user)
    7d95724 phase 02: steadier 300-page scroll test (fixed number of evenly spread stops)
    77faa5b phase 02: CI enforces Chromium perf budgets, reports WebKit (contract amendment 1)
    e6d23f8 phase 02: record CI baseline; soft budget checks so every metric is recorded
    b2688e0 phase 02: agreed budgets; perf benchmarks run in verify and CI
<!-- AUTO:END -->
