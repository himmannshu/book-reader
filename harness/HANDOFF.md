# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Claude Code (Opus 5.5), 2026-10-19
- Phase: 02 Complete; 03 not started
- Branch: main (phase 02 merged and pushed; CI run 39198849866 green)

## Done

- Phases 00 and 01 complete and on main.
- Phase 02 complete: speed budgets enforced by `scripts/verify.sh` (both browsers locally; CI enforces
  Chromium ×4 and reports WebKit), memory planner (B2 fixed), real-book run recorded.

## In flight

- A separate Claude Code session is investigating the real-book first-page time (462 ms in Chromium
  on a 24 MB book, target 400 ms) on its own branch and worktree. Check its branch before merging
  anything that touches src/engine or src/ui/App.tsx.

## Next action

1. Run `/start-session` (or harness/prompts/00-orient.md).
2. Plan phase 03 (local book persistence): post the plan and contract, wait for approval.

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
Snapshot 2026-10-19 00:22 EDT
- Branch: main
- HEAD: e7442ac phase 02: record merge and green CI
- Uncommitted files: 0
- Last verify: PASS at 2026-10-19 00:16 EDT (commit b21023e)
- Recent commits:
    e7442ac phase 02: record merge and green CI
    d841b09 phase 02: refresh handoff snapshot
    bf249ca phase 02: real-book benchmark recorded; clean perf results per run; phase complete
    b21023e phase 02: refresh handoff snapshot
    fb0676e phase 02: context, evidence and handoff (item 11 awaits user)
<!-- AUTO:END -->
