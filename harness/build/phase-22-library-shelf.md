# Phase 22: Library shelf redesign

- Status: In progress (plan approved by the agent under the user's standing instruction of 2026-10-21)
- Branch: phase-22-library-shelf (cut from `phase-21-highlight-colours`; main has none of 19–21 yet)
- Depends on: 18

## Objective

The library becomes the design's shelf: a `title-xl` heading, filter chips with counts, a segmented
control for sort and for grid or list, and the designed BookCard for each book (cover, title, author,
progress, at most one status badge, a More menu). An empty library shows the designed empty state.
Design references: `harness/context/design-system/components/{BookCard,Badge,Chip,EmptyState,
SegmentedControl}.md`, their sources in `components/src/`, and README "Library".

## In scope

- BookCard in two layouts: grid (cover `cover-width` wide at 2:3, title under it) and row (64 px cover,
  text beside it, a divider). A book without a drawn cover gets the typographic cover (accent band,
  title in Literata, author when known).
- Author: read from the PDF's own metadata (Info Author, else XMP creator) on this device, at the same
  moment as the cover, and kept with the cover (local, never synced, no server change). Covers drawn
  before this phase are drawn again once, in the background, so their author is read too.
- Status badge, at most one: In cloud (no file here), Downloading (with percent), New (not started),
  Finished (last page reached). Otherwise the progress bar with its percent.
- Filter chips: All, Reading, Unread, Finished and In cloud (In cloud only when some book is only in
  the cloud), each with its count; one selected at a time. The title filter field stays.
- Sort (Recent, Title, Progress) and view (Grid, List) as segmented controls. The view is remembered
  on this device, like the sort.
- Each card's More menu: Remove from this device (when the file is here) and Delete everywhere, each
  confirmed in the card before it runs (same effects as today).
- Empty library: the designed EmptyState pointing at Open PDF.

## Non-goals

- Changing what a book's title is (still from the file name), editing authors, or syncing them
- Collections, tags, or a search across all books
- Library-wide reading statistics

## Decisions needing a human

None that block. Judgment calls go in harness/context/phase-22-library-shelf-context.md.

## Expected files or components touched

- `src/core/shelf.ts` (status, counts, filter by status, view), `src/core/library.ts` (clean an author)
- `src/engine/types.ts`, `src/engine/pdfjs-engine.ts` (`author()` on a document)
- `src/storage/types.ts`, `src/storage/preferences.ts` (cover author, shelf view)
- `src/ui/Library.tsx`, new `src/ui/BookCard.tsx`, `src/ui/controls.tsx` (Chip, Badge), `src/ui/covers.ts`,
  `src/ui/App.tsx`, `src/ui/app.css`
- e2e: `library-view.spec.ts`, `library.spec.ts`, specs that press Remove on a book (sync specs)
- Fixtures: a PDF with an author in its metadata

## Verification plan

Scope (standing instruction of 2026-10-21): lint, format, types, unit tests, the full browser suite
(`npm run test:e2e`, both engines; the library opens every spec) and the sync suite (its specs press
Remove on a book). No perf run: nothing in the viewer, engine rendering, or reading path changes; the
cover worker only runs while the library shows. No CI run.

- Red first: unit tests for status, counts and the status filter, the view preference, cleaning an author;
  `e2e/library-view.spec.ts` cases for the cards, badges, chips, view toggle, More menu and author.
- Green: the model, engine, cover and UI changes.

## Acceptance criteria

See harness/contracts/phase-22-contract.md.

## Risks and recovery

- Test churn: many specs open a book from the library by its title, so the open button keeps the
  book's title as its name. Changes to other specs are listed in the build log; none loosened.
- Redrawing old covers costs one background page draw per book, once, only while the library shows.

## Stop condition

Stop when every contract item has observed evidence in harness/build-log.md (items the standing
instruction defers are recorded as deferred).
