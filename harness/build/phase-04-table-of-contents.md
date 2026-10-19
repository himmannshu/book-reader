# Phase 04: Table of contents

- Status: In progress (items 1–9 observed; CI, item 11 and the evaluator review pending)
- Branch: phase-04-table-of-contents
- Depends on: 01

## Objective

A panel shows the book's outline (chapters and sections). Choosing an entry jumps straight to it.

## In scope

- Outline from the engine interface
- TOC panel with nested entries
- Jump to an entry's destination
- Clear empty state for PDFs with no outline
- Fixture PDF with a known outline

## Non-goals

- Generating a TOC for PDFs that have none
- Bookmarks

## Expected files or components touched

- src/engine
- src/ui
- e2e/

## Decisions needing a human

- none

## Verification plan

- Red: Browser test clicks a chapter in the fixture's TOC and expects its page visible; fails
- Green: Outline read through the engine and wired to the viewer's jump
- Focused command: `npm run test:e2e -- toc`
- Full command: `scripts/verify.sh`

## Acceptance criteria

Mirror these in harness/contracts/phase-04-contract.md as checkable items.

- The TOC panel lists the fixture's chapters in order, with nesting
- Clicking a chapter shows that chapter's page
- A PDF without an outline shows an empty state, not an error

## Risks and recovery

none

## Stop condition

Stop when every contract item has observed evidence in harness/build-log.md.
Do not start the next phase.
