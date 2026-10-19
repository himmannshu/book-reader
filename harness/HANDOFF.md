# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Claude Code (Opus 5.5), 2026-10-18
- Phase: 01 In progress (contract items 1–10 observed; item 11 waits for the user)
- Branch: phase-01-open-and-read-pdf (not pushed, not merged)

## Done

- Phase 00 complete and on origin/main; CI green.
- Phase 01: engine interface + PDF.js adapter (src/engine), virtualized viewer (src/viewer),
  open flow and error messages (src/ui), deterministic fixtures, 20 unit + 16 browser tests,
  lint rule keeping PDF.js inside src/engine. `scripts/verify.sh` → PASS at 5d07bf2.

## In flight

- Contract item 11: the user opens one of their own PDF books in `npm run dev` and scrolls it.

## Next action

1. Record the user's item 11 result in the build log. If it passes, set phase 01 Complete
   (build file, PLANS.md, build-log summary). If not, fix what they saw first.
2. Independent review recommended (`/evaluate 01`, or Codex with harness/prompts/03-evaluate.md).
3. Ask before pushing the branch or merging into main.

## Decisions worth remembering

- Engine API and memory bounds: harness/context/phase-01-open-and-read-pdf-context.md.
- Layout uses page 1's size as an estimate, then corrects after loadPageSizes() (anchor kept).
- pdfjs-dist 6.4 → minimum Safari/iOS 17.4.
- TypeScript pinned to 6.0.x until typescript-eslint supports 7 (phase-00 context file).

## Blockers and doubts

- None technical. The page drawing is on the main thread; phase 02 benchmarks decide if that matters.

<!-- AUTO:BEGIN -->
Snapshot 2026-10-18 22:49 EDT
- Branch: main
- HEAD: 0912b2c phase 00: record first green CI run
- Uncommitted files: 0
- Last verify: PASS at 2026-10-18 22:38 EDT (commit 28a4c32)
- Recent commits:
    0912b2c phase 00: record first green CI run
    812f49d phase 00: refresh handoff snapshot
    b72230c phase 00: CI workflow, commands, evidence; phase complete
    28a4c32 phase 00: verify.local.sh wires all checks into scripts/verify.sh
    69a9679 phase 00: unit tests, lint, format and typecheck
<!-- AUTO:END -->
