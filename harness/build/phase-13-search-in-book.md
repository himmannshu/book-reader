# Phase 13: Search inside a book

- Status: In progress
- Branch: phase-13-search-in-book
- Depends on: 02

## Objective

Search the full text of the open book and jump to each match, with matches highlighted on the page.

## In scope

- Text extraction through the engine interface, off the main thread
- Search box, results list, next/previous
- Match highlighting on the page

## Non-goals

- Search across the whole library
- Search inside scanned (image-only) pages

## Expected files or components touched

- src/engine
- src/core
- src/ui
- e2e/

## Decisions needing a human

- none

## Verification plan

- Red: Browser test searches a known word in the fixture and expects its page visible; fails
- Green: Text index + search + jump
- Focused command: `npm run test:e2e -- search`
- Full command: `scripts/verify.sh`

## Acceptance criteria

Mirror these in harness/contracts/phase-13-contract.md as checkable items.

- Searching a known word lists every page it appears on
- Choosing a result jumps to it with the match highlighted
- Searching the large fixture stays within a budget added to the phase 02 benchmarks

## Risks and recovery

Indexing a long book can be slow or memory-hungry; index lazily in a worker.

## Stop condition

Stop when every contract item has observed evidence in harness/build-log.md.
Do not start the next phase.

## Plan (2026-10-20)

Approved by: agent under the user's standing instruction of 2026-10-20. Stacked on phase 12's
branch. Judgment calls: harness/context/phase-13-search-in-book-context.md.

1. src/core/search.ts (unit tests first): folding, matches with original offsets, snippets.
2. Engine `pageText`; viewer `setSearch` marks matches in text layers and reveals the current one.
3. useSearch + SearchPanel, Search button and Cmd/Ctrl+F in the reader.
4. e2e/search.spec.ts; `searchMs` in the benchmarks (report-only).
5. Verify, perf, full CI, evaluator.
