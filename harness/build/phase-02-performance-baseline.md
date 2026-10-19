# Phase 02: Performance baseline

- Status: In progress (items 1–10 observed; item 11 awaits user)
- Branch: phase-02-performance-baseline
- Depends on: 01

## Objective

Make speed measurable and enforced. A large test PDF and automated budgets for opening, scrolling, jumping and memory run inside `scripts/verify.sh`, so a regression fails the build.

## In scope

- A large generated (or public domain) test PDF, several hundred pages
- Browser benchmarks: time to first page, scroll smoothness, jump-to-page latency
- A memory cap on the page bitmap cache, checked by a test
- Budgets recorded in one place, with the machine they were measured on
- Fix anything the benchmarks reveal in the phase 01 viewer

## Non-goals

- Switching engines (only if a budget cannot be met; that needs a human decision)
- Profiling dashboards

## Expected files or components touched

- e2e/ benchmarks
- tests/fixtures/
- src/viewer cache

## Decisions needing a human

- Agree the initial budget numbers after the first measurements

## Verification plan

- Red: Benchmark with a deliberately tight budget fails, proving the check bites
- Green: Budgets set from measured numbers with headroom; benchmarks pass
- Focused command: `npm run test:e2e -- perf`
- Full command: `scripts/verify.sh`

## Acceptance criteria

Mirror these in harness/contracts/phase-02-contract.md as checkable items.

- Benchmarks run as part of `scripts/verify.sh`
- Time to first page on the large fixture is within the agreed budget
- Jumping to a far page shows it within the agreed budget
- Bitmap cache memory stays under its cap while scrolling the whole book
- A deliberately slowed renderer makes verify fail

## Risks and recovery

Timing tests can be flaky across machines; use generous budgets and repeated runs.

## Stop condition

Stop when every contract item has observed evidence in harness/build-log.md.
Do not start the next phase.
