# Phase 20: Panels and sheets

- Status: Planned (awaiting the user's approval, 2026-10-20)
- Branch: phase-20-panels-and-sheets (cut from `phase-19-reader-chrome`; main has neither yet)
- Depends on: 19

## Objective

The reader's panels take on the design's SidePanel: Contents, Bookmarks and Notes share one tabbed
panel, and Search has its own. Panels dock on the right beside the page on Mac and iPad, and rise as
bottom sheets on iPhone. The contents becomes a tree that folds and shows the current chapter.
Design references: `harness/context/design-system/components/{SidePanel,Tabs,TocList,SearchField,SearchResult,AnnotationRow}.md`,
their sources in `components/src/`, and the README's "Screens, composed" and breakpoints.

## In scope

- One SidePanel for Contents, Bookmarks and Notes, with Tabs (Bookmarks and Notes show their counts)
  and the arrow-key tab pattern. Its title is the open tab's name, with a Close button.
- Search in its own SidePanel: the SearchField pinned under the title (match count, previous and
  next inside it; Enter, Shift+Enter, Escape) and SearchResult rows (page, chapter, a line of context
  with the match marked, the shown match marked as current).
- Presentation by width, at the design's breakpoint: from 720 px the panel docks on the right at
  `panel-width` (380 px) and the page stays readable beside it; under 720 px it is a bottom sheet (at
  most 88 % of the height, a grabber, rounded top, a scrim). The sheet closes with its Close button, a
  tap on the scrim, Escape, or a drag down. The compact toolbar follows the same 720 px breakpoint.
- The toolbar loses its Bookmarks and Notes buttons (phase 19 kept them until now): Contents opens
  the tabbed panel. The phone toolbar's More menu holds Contents and Search, as in the design.
  Everything that opened the Notes or Bookmarks panel (Add note, a voice note, Cmd/Ctrl+F for Search)
  opens the right tab or panel.
- The contents tree (TocList): parents fold and unfold with a chevron; the title always jumps; page
  numbers on the right (the PDF's page labels when it has them); the chapter being read is marked,
  its parents open when the panel opens, and it is scrolled into view. Rows at least 44 px tall.
- Bookmark and note rows restyled to the design's AnnotationRow layout (a metadata line with page and
  chapter, the passage, the note, hairline dividers), keeping today's actions (jump, edit, remove,
  voice notes). The full AnnotationRow More menu (Change colour, Share, Copy) comes with phase 21.
- Choosing an entry jumps to it; on phones the sheet then closes, on larger screens the panel stays.
- Motion: the sheet slides up in 200 ms; nothing moves under reduced motion.

## Non-goals

- Highlight colours, the selection menu and the AnnotationRow More menu (phase 21)
- The voice note strip with a waveform and the listen bar (phase 23)
- Library changes (phase 22)
- A tappable sync badge (review R1 of phase 19): not in this phase unless the user asks

## Expected files or components touched

- New: a SidePanel and Tabs in `src/ui/controls.tsx` (or a panel module), a TocList, a SearchField
  and SearchResult in `src/ui/SearchPanel.tsx`
- `src/ui/ContentsPanel.tsx`, `BookmarksPanel.tsx`, `NotesPanel.tsx`, `SearchPanel.tsx`,
  `ReaderView.tsx`, `ReaderToolbar.tsx`, `controls.tsx` (`NARROW_QUERY` → 720 px), `app.css`
- `src/core`: the current outline entry and its parents (pure, unit-tested); search context cutting
  at word boundaries if the existing search core does not already
- e2e: a new `panels.spec.ts`; existing specs that open panels (`contents`, `bookmarks`, `notes`,
  `search`, `design`, `reader-chrome`, sync helpers) move to tabs and the new names

## Decisions needing a human

- Approve this plan. In particular: rows keep today's actions in this phase, with the AnnotationRow
  More menu in phase 21 (recommended), or the whole AnnotationRow now.
- Other judgment calls go in harness/context/phase-20-panels-and-sheets-context.md.

## Verification plan

- Red first: `e2e/panels.spec.ts` (tabs and counts, side vs sheet at 1280/820/390 px, sheet closing
  by scrim, Escape and drag, the tree folding and the current chapter, search field count and
  previous/next) and unit tests for the current-outline-entry logic, Tabs keys and the tree
- Green: the panel, tabs, tree, search field and toolbar changes
- Focused command: `npm run test:unit` and `npm run test:e2e -- panels contents bookmarks notes search`
- Full command: `scripts/verify.sh`, then `gh workflow run verify.yml --ref phase-20-panels-and-sheets`
  (push only with the user's approval)

## Acceptance criteria

See harness/contracts/phase-20-contract.md.

## Risks and recovery

- Test churn: many specs open panels by their old names. Changes are mechanical and each is recorded
  in the build log; none loosened.
- Speed: a docked panel narrows the page column (as today); opening and closing must not redraw more
  than it does now. The sheet's scrim and slide must add no work to scrolling. The perf budgets decide.
- Drag-to-close uses pointer events on the grabber and header only, so the panel's own lists still
  scroll normally on touch.
- The 699 → 720 px breakpoint moves iPad split view (about 700–719 px) to the compact toolbar and
  sheets, as the design intends.

## Stop condition

Stop when every contract item has observed evidence in harness/build-log.md.
Do not start the next phase.
