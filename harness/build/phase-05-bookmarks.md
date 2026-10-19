# Phase 05: Bookmarks

- Status: In progress
- Branch: phase-05-bookmarks
- Depends on: 03

## Objective

Mark places in a book, see them listed, and jump back to them. Bookmarks survive closing and reopening the book.

## In scope

- Add and remove a bookmark at the current position
- Bookmarks list with jump
- Bookmark model in src/core, stored through the storage interface

## Non-goals

- Bookmark labels beyond an automatic name
- Cloud copy (phase 09)

## Expected files or components touched

- src/core
- src/storage
- src/ui
- e2e/

## Decisions needing a human

- none

## Verification plan

- Red: Browser test adds a bookmark, reloads, expects it listed; fails
- Green: Bookmark model + persistence + list UI
- Focused command: `npm run test:e2e -- bookmarks`
- Full command: `scripts/verify.sh`

## Acceptance criteria

Mirror these in harness/contracts/phase-05-contract.md as checkable items.

- Adding a bookmark shows it in the list
- Clicking a bookmark jumps to its place
- Bookmarks are still there after a reload
- Removing a bookmark removes it after reload too

## Risks and recovery

none

## Stop condition

Stop when every contract item has observed evidence in harness/build-log.md.
Do not start the next phase.
