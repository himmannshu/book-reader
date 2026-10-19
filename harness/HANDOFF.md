# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Claude Code (Opus 5.5), 2026-10-18
- Phase: planning done; phase 00 not started (see PLANS.md)
- Branch: planning

## Done

- Architecture decided with the user: harness/context/architecture-decisions.md (D1–D6)
- AGENTS.md Project, Commands (planned) and Conventions filled in; GOALS.md and PLANS.md updated
- Phase files harness/build/phase-00…13-*.md; features F-001…F-015 added (all failing)

## In flight

- Nothing

## Next action

1. Run `/start-session` (or harness/prompts/00-orient.md).
2. Plan phase 00 (repository foundation): post scope, files, tests and risks, then wait for
   the user's approval before writing code.

## Decisions worth remembering

- PWA, TypeScript strict, React + Vite, PDF.js only through `src/engine`, viewer outside React.
- Local-first (OPFS + IndexedDB); Cloudflare cloud from phase 08/09. Agents never handle keys
  or deploy without asking.
- Speed is enforced by benchmarks in `scripts/verify.sh` from phase 02.

## Blockers and doubts

- Phase 00: will the repo live on GitHub? (affects the CI workflow file only)
- `scripts/verify.sh` reports NOT CONFIGURED until phase 00 adds scripts/verify.local.sh.

<!-- AUTO:BEGIN -->
Snapshot 2026-10-18 22:29 EDT
- Branch: planning
- HEAD: 128f52e planning: architecture decisions and phase roadmap
- Uncommitted files: 0
- Last verify: NOT CONFIGURED at 2026-10-18 22:25 EDT (commit none)
- Recent commits:
    128f52e planning: architecture decisions and phase roadmap
<!-- AUTO:END -->
