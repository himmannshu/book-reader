# Phase 20 context: panels and sheets

Material decisions only. Plan and contract: harness/build/phase-20-panels-and-sheets.md,
harness/contracts/phase-20-contract.md. Plan posted to the user on 2026-10-20; not yet approved.

## Judgment calls (proposed)

- Branch cut from `phase-19-reader-chrome`, since main has neither the Mac WebKit fix nor phase 19.
- The panel's title is the open tab's name (the design's SidePanel has a title; the tabs sit under it).
- Rows keep today's actions in this phase; the AnnotationRow More menu (Change colour, Share, Copy)
  lands with phase 21's colours and selection menu, so a row's menu is designed once.
- The breakpoint becomes the design's 720 px for both the sheets and the compact toolbar (phase 19
  kept 699 px until the sheets arrived).
- Drag-to-close listens on the grabber and the panel's header only, so lists inside the sheet keep
  their normal touch scrolling.
