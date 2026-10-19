# Phase 03: Local book persistence

- Status: Complete
- Branch: phase-03-local-book-persistence
- Depends on: 01

## Objective

Books that have been opened stay on the device. After a reload, a simple list shows them and reopens any one without importing it again. All storage goes through the storage interface.

## In scope

- Storage interface for books and metadata
- Local adapter: PDF bytes in OPFS, metadata in IndexedDB (superseded by D5a during planning: everything in IndexedDB; see the contract)
- Simple list of stored books with title; open and remove
- Readable error when storage is full or unavailable

## Non-goals

- Covers, progress, sort/filter (phase 11)
- Cloud copy (phase 09)

## Expected files or components touched

- src/storage
- src/core library model
- src/ui

## Decisions needing a human

- none

## Verification plan

- Red: Browser test imports a book, reloads, expects it in the list; fails
- Green: Local adapter persists the book and the list reads it back
- Focused command: `npm run test:e2e -- library`
- Full command: `scripts/verify.sh`

## Acceptance criteria

Mirror these in harness/contracts/phase-03-contract.md as checkable items.

- An imported book appears in the list after a page reload
- Opening it from the list renders it without re-picking the file
- Removing a book removes it from the list and from storage
- UI code does not call IndexedDB or OPFS directly

## Risks and recovery

Stored data format becomes something later phases must migrate; version it from the start.

## Stop condition

Stop when every contract item has observed evidence in harness/build-log.md.
Do not start the next phase.
