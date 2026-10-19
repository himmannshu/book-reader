# Phase 01: Open and read a PDF

- Status: In progress (items 1–10 observed; item 11 awaits user)
- Branch: phase-01-open-and-read-pdf
- Depends on: 00

## Objective

Pick a PDF from disk and read it with continuous vertical scrolling. Rendering goes through the PDF engine interface (PDF.js in a Web Worker), and only pages near the viewport are drawn.

## In scope

- File picker to open a PDF
- PDF engine interface with a PDF.js adapter running in a worker
- Plain-TS viewer: continuous scroll, virtualized pages, placeholders at correct size
- Readable error when a file is not a valid PDF
- Small generated test PDF fixture

## Non-goals

- Saving books between sessions (phase 03)
- Zoom controls and themes (phase 10)
- Speed budgets (phase 02)
- Text selection

## Expected files or components touched

- src/engine
- src/viewer
- src/ui
- e2e/
- tests/fixtures/

## Decisions needing a human

- none

## Verification plan

- Red: Browser test opens the fixture PDF and expects page 1 to be drawn; fails
- Green: Engine interface + PDF.js adapter + viewer render visible pages
- Focused command: `npm run test:e2e -- open-pdf`
- Full command: `scripts/verify.sh`

## Acceptance criteria

Mirror these in harness/contracts/phase-01-contract.md as checkable items.

- Opening the fixture PDF shows page 1 in a browser test
- Scrolling to the end shows the last page
- In a long fixture, the number of drawn page canvases stays small while scrolling
- An invalid file shows an error message instead of a blank screen
- No module outside src/engine imports PDF.js

## Risks and recovery

PDF.js worker bundling with Vite can be fiddly; pin the pdfjs-dist version.

## Stop condition

Stop when every contract item has observed evidence in harness/build-log.md.
Do not start the next phase.
