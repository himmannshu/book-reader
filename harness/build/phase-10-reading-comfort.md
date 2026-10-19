# Phase 10: Reading comfort

- Status: Not started
- Branch: phase-10-reading-comfort
- Depends on: 01

## Objective

Make long reading sessions pleasant: dark and sepia themes, zoom and fit modes, and each book reopens exactly where I left off.

## In scope

- Light, dark and sepia themes
- Zoom in and out, fit width, fit page
- Remember and restore the reading position per book

## Non-goals

- Paginated reading mode
- Custom fonts (PDF text is fixed)

## Expected files or components touched

- src/ui
- src/viewer
- src/core
- src/storage

## Decisions needing a human

- none

## Verification plan

- Red: Browser test scrolls to page N, reloads, expects page N visible; fails
- Green: Position saved through storage and restored on open
- Focused command: `npm run test:e2e -- comfort`
- Full command: `scripts/verify.sh`

## Acceptance criteria

Mirror these in harness/contracts/phase-10-contract.md as checkable items.

- Reopening a book returns to the last position
- Theme choice persists and applies to pages and chrome
- Zoom and fit modes work, and any existing highlights stay aligned
- Speed budgets from phase 02 still pass

## Risks and recovery

Re-rendering at new zoom levels can blow the memory cap; keep the phase 02 benchmarks green.

## Stop condition

Stop when every contract item has observed evidence in harness/build-log.md.
Do not start the next phase.
