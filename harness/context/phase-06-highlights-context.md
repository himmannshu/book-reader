# Phase 06 context: highlights

Material decisions only. The user chose the interaction choices in chat on 2026-10-19.

## Interaction

- Selecting text in the pages shows a floating "Highlight" button below the selection. Pressing it
  keeps the selection (its pointerdown is prevented), saves the highlight and clears the selection.
- Clicking or tapping a highlight shows a "Remove highlight" button. A single tap never deletes.
- One highlight may span a page break: one quote, with rectangles on each page it covers.
- Overlapping highlights are allowed. Clicking where several overlap picks the newest.

## Coordinates

- Rectangles are in **PDF points in the page's displayed orientation, origin top-left**: the same
  space as `PageSize` (PDF.js viewport at scale 1, rotation applied). Converting from the screen is a
  division by the layout scale. No screen pixels are stored (AGENTS.md convention).
- If a later phase needs true PDF user space (bottom-left origin, unrotated), the engine can convert,
  because it knows each page's view box and rotation.
- The overlay positions each rectangle in percent of the page size, so it follows any scale with no
  recomputation.

## Text layer

- `PdfDoc.renderTextLayer(index, container, scale)` wraps PDF.js's `TextLayer`. Only src/engine
  imports PDF.js, so the text-layer CSS lives there too (minimal copy of PDF.js's rules, Apache-2.0).
- The text layer is built only for visible pages, after their canvas finishes drawing, and released
  with the canvas. That keeps the scroll cost bounded (the speed budgets are the check).

## Storage

- `Highlight { id, bookId, pageIndex, rects, quote, createdAt }`. The id is random (`crypto.randomUUID`),
  since a page can hold many highlights. `pageIndex` is the first page the highlight touches.
- IndexedDB schema version 3 adds a `highlights` store (keyPath `id`, index `bookId`). Removing a book
  deletes its highlights in the same transaction.
