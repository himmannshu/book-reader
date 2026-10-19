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
Snapshot 2026-10-18 23:02 EDT
- Branch: phase-01-open-and-read-pdf
- HEAD: 1f9e6e7 phase 01: context, evidence and handoff (item 11 awaits user)
- Uncommitted files: 0
- Last verify: PASS at 2026-10-18 23:01 EDT (commit 5d07bf2)
- Recent commits:
    1f9e6e7 phase 01: context, evidence and handoff (item 11 awaits user)
    5d07bf2 phase 01: lint rule keeps PDF.js inside src/engine
    a83c512 phase 01: e2e coverage for scrolling, memory cap, sizes, errors, replace and resize
    209a1da phase 01: engine interface, PDF.js adapter, viewer and open flow
    3034421 phase 01: pure layout and visible-range logic with unit tests
<!-- AUTO:END -->
