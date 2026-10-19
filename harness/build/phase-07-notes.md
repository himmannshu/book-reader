# Phase 07: Notes

- Status: In progress
- Branch: phase-07-notes
- Depends on: 06

## Objective

Attach a plain-text note to an existing highlight or to the current page. A notes panel lists notes
for the book, lets the reader edit them, and jumps back to their places. Preserve the established
architecture and reuse the completed highlight, viewer and storage foundations (D7, D8).

## In scope

- Add, edit and delete a note on a highlight or a page
- Notes panel with jump
- Note model in src/core, persisted via storage
- Preserve existing books, bookmarks and highlights when adding note storage
- Explicit save/cancel and safe handling of drafts, storage failures and annotation deletion

## Non-goals

- Rich text formatting
- Export (phase 12)
- Autosave or recovery of unsaved drafts after a browser reload
- Handwriting, tagging, note search or a standalone highlights list
- Cloud sync (phase 09), PDF annotation embedding or architecture changes

## Expected files or components touched

- src/core
- src/storage
- src/ui
- src/viewer (navigation to a noted passage)
- e2e/
- tests/fixtures/ only if additional generated test input is needed

## Decisions needing a human

- Plan, contract and interaction defaults approved by the user on 2026-10-19. None outstanding.

## Verification plan

- Red: Browser checks create highlight/page notes and expect them after reopening; unit checks cover
  note validation/order and adding note storage while keeping a real version-3 database intact
- Green: Minimum note model, storage, editor/panel and navigation to satisfy the approved contract
- Focused command: `npm run test:unit` and `npm run test:e2e -- notes`
- Full command: `scripts/verify.sh`

## Acceptance criteria

Mirror these in harness/contracts/phase-07-contract.md as checkable items.

- A note can be attached to a highlight and to a page
- The notes panel lists notes and jumps to their place
- Edits and deletions persist across a reload
- Invalid or failed writes preserve existing notes and show an actionable explanation
- Touch and keyboard flows work; existing annotation data and speed budgets remain intact

## Risks and recovery

- Storage migration and deletion cascades can lose data: test preservation and atomic failure behavior.
- Opening panels changes page layout; iOS focus/keyboard and floating actions need touch coverage.
- Changed drafts must not disappear silently during navigation; failed saves must retain entered text.
- WebKit has limited performance headroom: preserve the existing budgets and keep work off idle scroll.

## Stop condition

Stop when every contract item has observed evidence in harness/build-log.md.
Do not start the next phase.

## Observed implementation status (2026-10-19)

- Local implementation ready at 117ed45; `scripts/verify.sh` PASS (137 unit, 166 browser, 8 perf).
  F-008 locally passing. Detailed contract-item evidence is in harness/build-log.md.
- Contract 17 remains open for CI (push not authorized); contract 18 awaits the user's Phase 07
  real-book/device check. Phase remains In progress, not Complete. No independent review yet.
