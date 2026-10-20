# Phase 11: Library view

- Status: In progress
- Branch: phase-11-library-view
- Depends on: 03

## Objective

Replace the simple book list with a shelf: covers, reading progress, sort and filter.

## In scope

- Cover thumbnails from the first page
- Reading progress per book
- Sort (recent, title) and filter by text

## Non-goals

- Collections or tags
- Metadata editing beyond title

## Expected files or components touched

- src/ui
- src/core
- src/storage

## Decisions needing a human

- none

## Verification plan

- Red: Browser test expects a cover and a progress indicator for an imported book; fails
- Green: Cover generation + progress + shelf UI
- Focused command: `npm run test:e2e -- library-view`
- Full command: `scripts/verify.sh`

## Acceptance criteria

Mirror these in harness/contracts/phase-11-contract.md as checkable items.

- Each book shows a cover and its reading progress
- Sort and filter change what the shelf shows
- The shelf stays responsive with 100 books

## Risks and recovery

Generating covers for many books at once can be slow; generate lazily and cache.

## Stop condition

Stop when every contract item has observed evidence in harness/build-log.md.
Do not start the next phase.

## Plan (2026-10-20)

Approved by: agent under the user's standing instruction of 2026-10-20. Judgment calls are in
harness/context/phase-11-library-view-context.md. Branch stacked on phase 10's.

1. Core: progress from a reading state, shelf sort and filter (unit tests first).
2. Storage: `CoverStore` (v8), `ReadingStateStore.list`, page count in reading state, sort in
   preferences.
3. UI: cover drawing helper and background queue, shelf grid, sort and filter controls.
4. e2e/library-view.spec.ts (red first), including 100 seeded books.
5. Verify, perf, full CI, evaluator.
