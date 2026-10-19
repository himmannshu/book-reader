# Phase 00: Repository foundation

- Status: Complete
- Branch: phase-00-repository-foundation
- Depends on: none

## Objective

Set up the project so that every later phase has a working build, test and verify loop. An empty app shell loads in a real browser, and `scripts/verify.sh` runs lint, type checks, unit tests and browser tests through `scripts/verify.local.sh`.

## In scope

- Vite + React + TypeScript (strict) app shell that shows a placeholder screen
- Vitest unit test setup with one trivial passing test
- Playwright setup with one test that loads the app shell
- ESLint + Prettier, `npm run lint` and `npm run typecheck`
- `scripts/verify.local.sh` wiring all checks into `scripts/verify.sh`
- CI workflow file (GitHub Actions) that runs the same verify; not pushed without asking
- Fill in the Commands section of AGENTS.md with the real commands

## Non-goals

- Any PDF handling
- Folder scaffolding beyond what the shell needs
- Deployment

## Expected files or components touched

- package.json, lockfile, tsconfig, vite config
- eslint/prettier config
- playwright and vitest config
- scripts/verify.local.sh
- .github/workflows/

## Decisions needing a human

- Resolved: the repo will live on GitHub (user, 2026-10-18)

## Verification plan

- Red: Playwright test expecting the app shell title fails because there is no app yet
- Green: Minimal Vite + React shell renders the title
- Focused command: `npm run test:e2e`
- Full command: `scripts/verify.sh`

## Acceptance criteria

Mirror these in harness/contracts/phase-00-contract.md as checkable items.

- `scripts/verify.sh` reports PASS on a clean checkout after `npm ci`
- A deliberately broken type or lint error makes `scripts/verify.sh` fail
- The browser test loads the app shell and sees its title

## Risks and recovery

Browser binaries for Playwright must install on both agents' machines; record the install command.

## Stop condition

Stop when every contract item has observed evidence in harness/build-log.md.
Do not start the next phase.
