# Phase 06: Highlights

- Status: Not started
- Branch: phase-06-highlights
- Depends on: 03

## Objective

Select text on a page and highlight it. Highlights are anchored in PDF coordinates plus the quoted text, so they stay in the right place at any zoom and survive a reload.

## In scope

- Selectable text layer through the engine interface
- Create and delete a highlight
- Highlight overlay that tracks the page at any scale
- Highlight model in src/core, persisted via storage

## Non-goals

- Highlight colors beyond one default (can come with reading comfort)
- Notes (phase 07)

## Expected files or components touched

- src/engine
- src/viewer
- src/core
- src/storage
- e2e/

## Decisions needing a human

- none

## Verification plan

- Red: Unit test converting a selection to PDF-coordinate rectangles; browser test that a highlight survives reload
- Green: Text layer + selection-to-anchor + overlay + persistence
- Focused command: `npm run test:unit` and `npm run test:e2e -- highlights`
- Full command: `scripts/verify.sh`

## Acceptance criteria

Mirror these in harness/contracts/phase-06-contract.md as checkable items.

- Selecting text and choosing Highlight draws a highlight over exactly that text
- The highlight stays aligned when the page is drawn at a different scale (e.g. window resize)
- Highlights are still there after a reload
- Stored highlights contain PDF coordinates and the quoted text, not screen pixels

## Risks and recovery

Text selection across PDF.js text layers is a known source of bugs; test multi-line selections.

## Stop condition

Stop when every contract item has observed evidence in harness/build-log.md.
Do not start the next phase.
