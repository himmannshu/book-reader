# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Claude Code (Opus 5.5), 2026-10-18
- Phase: 01 Complete; 02 not started
- Branch: phase-01-open-and-read-pdf (not pushed, not merged)

## Done

- Phase 00 complete and on origin/main; CI green.
- Phase 01 complete: engine interface + PDF.js adapter (src/engine), virtualized viewer
  (src/viewer), open flow and error messages (src/ui), deterministic fixtures, 20 unit + 16
  browser tests, lint rule keeping PDF.js inside src/engine. Verify PASS; item 11 user-checked
  with a real book.

## In flight

- Nothing

## Next action

1. Evaluator review done (PASS, harness/code_review/phase-01-review.md); B1, B5, B6 fixed.
2. Ask the user before pushing the branch or merging into main.
3. Then plan phase 02 (performance baseline): post the plan and contract, wait for approval.

## Decisions worth remembering

- Engine API and memory bounds: harness/context/phase-01-open-and-read-pdf-context.md.
- Layout uses page 1's size as an estimate, then corrects after loadPageSizes() (anchor kept).
- pdfjs-dist 6.4 → minimum Safari/iOS 17.4.
- TypeScript pinned to 6.0.x until typescript-eslint supports 7 (phase-00 context file).

## Blockers and doubts

- Deferred review findings (user's call, see harness/code_review/phase-01-review.md):
  - B2: if more than 8 pages fit on screen, the extras stay blank. Revisit with phase 02 budgets.
  - B3: a page that fails to draw shows only a white box and is not retried.
  - B4: the PDF.js lint boundary misses dynamic `import()` and `.js` files under src/.
- Page drawing is on the main thread; phase 02 benchmarks decide if that matters.

<!-- AUTO:BEGIN -->
Snapshot 2026-10-18 23:16 EDT
- Branch: phase-01-open-and-read-pdf
- HEAD: 922e9db phase 01: fix review findings B1 (height resize), B5 (keyboard focus), B6 (top gap)
- Uncommitted files: 0
- Last verify: PASS at 2026-10-18 23:16 EDT (commit eecdf5a)
- Recent commits:
    922e9db phase 01: fix review findings B1 (height resize), B5 (keyboard focus), B6 (top gap)
    eecdf5a phase 01: evaluator review (PASS)
    5a41e4b phase 01: refresh handoff snapshot
    53729a6 phase 01: item 11 user-checked; phase complete
    433fd62 phase 01: refresh handoff snapshot
<!-- AUTO:END -->
