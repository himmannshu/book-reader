# Phase 12: Export highlights and notes

- Status: In progress
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

## Plan (2026-10-20)

Approved by: agent under the user's standing instruction of 2026-10-20. Stacked on phase 11's
branch. Layout sample and judgment calls: harness/context/phase-12-export-annotations-context.md.

1. src/core/export.ts: `exportMarkdown` and `exportFileName` (unit tests first, red recorded).
2. src/ui/download.ts and an "Export highlights and notes" button in the Notes panel.
3. e2e/export.spec.ts: download event and file contents; the disabled state.
4. Verify, perf, full CI, evaluator.
