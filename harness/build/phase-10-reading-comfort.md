# Phase 10: Reading comfort

- Status: In progress
- Branch: phase-10-reading-comfort (cloud: phase-10-reading-comfort-k8v7pk)
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

## Plan (2026-10-20)

Approved by: agent under the user's standing instruction of 2026-10-20. Judgment calls are in
harness/context/phase-10-reading-comfort-context.md.

1. Core (src/core/reading-state.ts): zoom setting type, zoom levels and stepping, reading-state
   validation. Unit tests first.
2. Layout (src/viewer/layout.ts): fit width, fit page and percentage zoom, page left positions and
   content width; planRender gets a per-canvas pixel cap and a stable resolution when over budget
   (phase 02 F1). Unit tests first.
3. Viewer: initial position and zoom, `setZoom`, `position`, horizontal anchoring, relayout on
   height change in fit page.
4. Storage: `ReadingStateStore` (IndexedDB v7 `readingState`, deleted with the book) and
   `Preferences` (theme, localStorage). Unit tests with fake IndexedDB, including the v6 upgrade.
5. UI: zoom controls and keys in the reader tools, theme picker in the toolbar, theme CSS for chrome
   and pages, save and restore of the reading state in ReaderView and App.
6. e2e/comfort.spec.ts (red first): resume, themes, zoom and fit, sideways scroll, highlight
   alignment, memory at 400%.
7. Verify (cloud stand-in), full CI run on the branch, evaluator review.

Risks: zoomed canvases blowing the memory cap (item 9), WebKit scroll headroom (filters only apply
in Sepia/Dark; the scroll listener for saving stays trivial), a flash of the light theme at start.
