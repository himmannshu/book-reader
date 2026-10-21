# Contract: Phase 22 Library shelf redesign

Agreed definition of done, written before any code. The author drafts it. The user or the
reviewing agent approves it. After approval, only append clearly marked amendments.

- Approved by: agent under the user's standing instruction of 2026-10-21 (see harness/HANDOFF.md). Judgment
  calls: harness/context/phase-22-library-shelf-context.md.

## Checkable items

| # | Behavior | How to verify | Result (filled in at review) |
|---|---|---|---|
| 1 | The library shows a `title-xl` heading, filter chips, a sort control and a grid/list control above the books | e2e | |
| 2 | In grid view each book is a BookCard: a 2:3 cover (`cover-width`), title (two lines at most), author when known, progress or one badge, and a More button; in list view the same as rows with a 64 px cover | e2e | |
| 3 | A book without a drawn cover shows the typographic cover with its title | e2e | |
| 4 | The author comes from the PDF's metadata and shows on the card; a book without one shows none | unit + e2e | |
| 5 | Badges: In cloud for a book not on this device, Downloading with its percent, New for a book not started, Finished at the last page; never more than one | unit + e2e | |
| 6 | Chips All, Reading, Unread, Finished (and In cloud when any) show their counts; choosing one shows only those books; the title filter still works with them | unit + e2e | |
| 7 | Grid or list is remembered after a reload, like the sort | unit + e2e | |
| 8 | A card's More menu removes the book from this device or deletes it everywhere, each after a confirmation in the card | e2e + sync e2e | |
| 9 | An empty library shows the designed empty state | e2e | |
| 10 | Layout works at 320, 390, 820 and 1280 px: no sideways scroll, three covers a row on a 390 px phone, 44 px targets on touch screens | e2e | |
| 11 | Earlier tests pass, changed only for renamed or moved controls (each change in the build log; no check loosened) | browser + sync suites | |
| 12 | Lint, format, types and unit tests pass | local run | |
| 13 | Full `scripts/verify.sh` and CI: deferred by the user's standing instruction (no perf-sensitive change) | recorded as deferred | |
| 14 | User-checked on Mac, iPad and iPhone | User report | |

## Out of scope for this contract

- Editing or syncing authors, collections, statistics, titles from metadata.

## Amendments

(none)
