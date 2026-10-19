# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Claude Code (Opus 5.5), 2026-10-18
- Phase: 00 Complete; 01 not started
- Branch: main (phase 00 merged; pushed to github.com/himmannshu/book-reader, private)

## Done

- Planning: architecture decisions in harness/context/architecture-decisions.md
- Phase 00: Vite + React + TS shell; Vitest; Playwright (prod build, Chromium + WebKit);
  ESLint + Prettier; `scripts/verify.sh` → PASS; CI workflow file; AGENTS.md Commands filled

## In flight

- Nothing

## Next action

1. Run `/start-session` (or harness/prompts/00-orient.md).
2. Plan phase 01 (open and read a PDF): post the plan and contract, then wait for approval.

## Decisions worth remembering

- PWA, TypeScript strict, React + Vite, PDF.js only through `src/engine`, viewer outside React.
- TypeScript pinned to 6.0.x until typescript-eslint supports 7 (phase-00 context file).
- Browser tests run on the production build in Chromium and WebKit.
- Local-first (OPFS + IndexedDB); Cloudflare cloud from phase 08/09. Agents never handle keys.

## Blockers and doubts

- None. CI is green on GitHub (run 39191648738).

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
