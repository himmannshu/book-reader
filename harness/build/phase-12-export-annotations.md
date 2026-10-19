# Phase 12: Export highlights and notes

- Status: Not started
- Branch: phase-12-export-annotations
- Depends on: 07

## Objective

Export a book's highlights and notes to a Markdown file, grouped by chapter or page. This also gives the user a personal backup.

## In scope

- Markdown export of highlights and notes for one book
- Download as a .md file

## Non-goals

- Other export formats
- Importing annotations back

## Expected files or components touched

- src/core export
- src/ui

## Decisions needing a human

- Confirm the Markdown layout from a sample

## Verification plan

- Red: Unit test: given fixture annotations, expected Markdown output; fails
- Green: Pure export function in src/core + download button
- Focused command: `npm run test:unit`
- Full command: `scripts/verify.sh`

## Acceptance criteria

Mirror these in harness/contracts/phase-12-contract.md as checkable items.

- Export produces Markdown with each highlight's text, page, and attached notes
- Output order follows the book order
- The file downloads in a browser test

## Risks and recovery

none

## Stop condition

Stop when every contract item has observed evidence in harness/build-log.md.
Do not start the next phase.
