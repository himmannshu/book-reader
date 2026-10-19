# Phase 07: Notes

- Status: Not started
- Branch: phase-07-notes
- Depends on: 06

## Objective

Attach a written note to a highlight or to a page. A notes panel lists notes for the book and jumps to them.

## In scope

- Add, edit and delete a note on a highlight or a page
- Notes panel with jump
- Note model in src/core, persisted via storage

## Non-goals

- Rich text formatting
- Export (phase 12)

## Expected files or components touched

- src/core
- src/storage
- src/ui
- e2e/

## Decisions needing a human

- none

## Verification plan

- Red: Browser test adds a note to a highlight, reloads, expects it in the panel; fails
- Green: Note model + persistence + panel
- Focused command: `npm run test:e2e -- notes`
- Full command: `scripts/verify.sh`

## Acceptance criteria

Mirror these in harness/contracts/phase-07-contract.md as checkable items.

- A note can be attached to a highlight and to a page
- The notes panel lists notes and jumps to their place
- Edits and deletions persist across a reload

## Risks and recovery

none

## Stop condition

Stop when every contract item has observed evidence in harness/build-log.md.
Do not start the next phase.
