# Contract: Phase 00 Repository foundation

Agreed definition of done, written before any code. The author drafts it. The user or the
reviewing agent approves it. After approval, only append clearly marked amendments.

- Approved by: Himanshu (user), 2026-10-18

## Checkable items

Each item is a behavior someone can verify by running the software. Be specific.

| # | Behavior | How to verify | Result (filled in at review) |
|---|---|---|---|
| 1 | From a clean clone, `npm ci` plus the Playwright browser install succeed | Run both in a fresh `git worktree` of the branch | |
| 2 | `scripts/verify.sh` runs lint, format check, typecheck, unit and e2e, and reports PASS (exit 0) | Run it; the output shows each step; `harness/.last-verify` says PASS | |
| 3 | A type error makes verify FAIL (nonzero exit) | Add `const x: number = "a"`, run verify, revert | |
| 4 | A lint error makes verify FAIL | Add an unused variable, run verify, revert | |
| 5 | A failing unit test makes verify FAIL | Flip an assertion, run verify, revert | |
| 6 | A failing browser test makes verify FAIL | Change the expected heading, run verify, revert | |
| 7 | The production build loads in Chromium and WebKit and shows the heading "Book Reader" | `npm run test:e2e` output lists both browsers passing | |
| 8 | `npm run dev` serves the shell locally | Open the dev URL in a browser and see the heading | |
| 9 | Running verify without `node_modules` prints a clear "run npm ci" message instead of a stack trace | Run verify in a fresh worktree before `npm ci` | |
| 10 | The CI workflow runs the same `scripts/verify.sh` | Read `.github/workflows/verify.yml`. The run on GitHub is observed only after the user allows a push; until then it is recorded as "not run" | |
| 11 | The AGENTS.md Commands section matches the package.json scripts | Run each listed command once | |

## Out of scope for this contract

- PDF features
- Deployment
- A GitHub Actions run before the user allows a push

## Amendments

(none)
