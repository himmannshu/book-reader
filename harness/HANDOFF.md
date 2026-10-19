# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Claude Code (Opus 5.5), 2026-10-18
- Phase: 00 Complete; 01 not started
- Branch: phase-00-repository-foundation (not merged to main, not pushed)

## Done

- Planning: architecture decisions in harness/context/architecture-decisions.md
- Phase 00: Vite + React + TS shell; Vitest; Playwright (prod build, Chromium + WebKit);
  ESLint + Prettier; `scripts/verify.sh` → PASS; CI workflow file; AGENTS.md Commands filled

## In flight

- Nothing

## Next action

1. User: decide whether to merge phase-00 into main, create the GitHub repo and push (agents
   must ask before pushing). The first push will run CI for the first time (contract item 10).
2. Plan phase 01 (open and read a PDF): post the plan and contract, then wait for approval.

## Decisions worth remembering

- PWA, TypeScript strict, React + Vite, PDF.js only through `src/engine`, viewer outside React.
- TypeScript pinned to 6.0.x until typescript-eslint supports 7 (phase-00 context file).
- Browser tests run on the production build in Chromium and WebKit.
- Local-first (OPFS + IndexedDB); Cloudflare cloud from phase 08/09. Agents never handle keys.

## Blockers and doubts

- CI has never run on GitHub (no remote yet).

<!-- AUTO:BEGIN -->
Snapshot 2026-10-18 22:29 EDT
- Branch: planning
- HEAD: 128f52e planning: architecture decisions and phase roadmap
- Uncommitted files: 0
- Last verify: NOT CONFIGURED at 2026-10-18 22:25 EDT (commit none)
- Recent commits:
    128f52e planning: architecture decisions and phase roadmap
<!-- AUTO:END -->
