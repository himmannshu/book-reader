# Phase 21: Highlight colours

- Status: Planned (awaiting the user's approval, 2026-10-21)
- Branch: phase-21-highlight-colours (cut from `phase-20-panels-and-sheets`; main has none of 19–20 yet)
- Depends on: 20

## Objective

Highlights come in the design's four colours, and the menu over a selection becomes the design's
HighlightMenu: four colour swatches, a note, copy, share and listen from here. A highlight's colour
is kept, synced to the reader's other devices, drawn on the page, and shown in the lists and the
Markdown export. The rows in the panels get the design's More menu (deferred from phase 20 by the
user's choice). Design references:
`harness/context/design-system/components/{HighlightMenu,AnnotationRow}.md`, their sources in
`components/src/`, and the colour tokens (`hl-*` for the page, `swatch-*` for menus and lists).

## In scope

- Colour on every highlight: yellow (default), green, blue, pink. Highlights saved before this phase
  read as yellow; an unknown colour from another device reads as yellow too. Changing a colour is an
  ordinary edit, synced last-write-wins like any other (no server or D1 change: items travel as JSON).
- On the page each highlight is filled with its `hl-*` colour, in every theme.
- The selection menu (HighlightMenu), replacing today's floating buttons:
  - Over a fresh selection: the four swatches (choosing one creates the highlight at once and the
    menu stays, now for that highlight), Add note (creates a yellow highlight with the note editor
    open), Copy, Share and Listen from here.
  - Over an existing highlight: its colour ringed (choosing another recolours it), Add or Edit note,
    Copy, Share, Listen from here and Remove highlight.
  - Placed above the selection, below when there is no room; it never covers the selected text;
    40 px targets (44 px on touch screens, the app's rule).
- Copy puts the passage on the clipboard; Share is phase 17's (title and page). Listen from here
  starts reading aloud at the sentence where the passage starts.
- Lists: rows show a highlight's passage with its colour behind it (as on the page), and each row
  gets the design's More menu: Edit note, Change colour (for highlights), Share, Copy, Delete.
- Export: each highlight's colour is named in the Markdown (for example "Highlighted in green").

## Non-goals

- Colour filters in the lists, or custom colours
- The listen bar (phase 23) and the voice note strip (phase 23)
- The library (phase 22)

## Decisions needing a human

1. **Highlights in the Notes tab.** Today it lists notes only, so a highlight without a note is in no
   list. Recommended: list every highlight there (with its colour, and its note if it has one), as
   the design's AnnotationRow does. Alternative: keep listing notes only, with the colour shown on
   notes attached to highlights.
2. **Voice notes in the selection menu.** The design's menu has no Voice note button. Recommended:
   keep it in the menu until phase 23 redesigns voice notes (as phase 19 kept Bookmarks and Notes
   until phase 20). Alternative: move it into the note editor now.
- Other judgment calls go in harness/context/phase-21-highlight-colours-context.md.

## Expected files or components touched

- `src/core/highlights.ts` (colour type, default, reading old records), `src/core/export.ts`,
  `src/core/read-aloud.ts` (start at a passage)
- `src/ui/SelectionActions.tsx` → the HighlightMenu, `src/ui/useHighlights.ts`, `src/ui/useReadAloud.ts`,
  `src/ui/NotesPanel.tsx` (rows, More menu), `src/ui/BookmarksPanel.tsx` (More menu),
  `src/viewer/viewer.ts` (fill per colour), `src/ui/app.css`
- e2e: a new `highlight-colours.spec.ts`; existing specs that press Highlight, Remove highlight,
  Add note or Share on the old buttons (`highlights`, `notes`, `share`, `voice-notes`, sync tests)

## Verification plan

- Red first: unit tests for the colour default and reading old records, export naming colours, and
  finding the sentence a passage starts in; `e2e/highlight-colours.spec.ts` (create in each colour,
  recolour, colour kept after reload, drawn per theme, menu actions, More menu, export) and a sync
  test that a colour change reaches the other device
- Green: the model, menu, lists, export and read-aloud changes
- Focused command: `npm run test:unit` and `npm run test:e2e -- highlight-colours highlights notes`
- Full command: `scripts/verify.sh`, then `gh workflow run verify.yml --ref phase-21-highlight-colours`
  (push only with the user's approval)

## Acceptance criteria

See harness/contracts/phase-21-contract.md.

## Risks and recovery

- Test churn: many specs press the old floating buttons. Changes are mechanical and each is recorded
  in the build log; none loosened.
- Older app versions (the deployed main) on another device will receive coloured highlights: they
  ignore the field and draw yellow, and a recolour made there is impossible, so nothing is lost.
- Speed: drawing a colour per highlight must not add work while scrolling (fills are CSS classes on
  boxes already drawn). The perf budgets decide.

## Stop condition

Stop when every contract item has observed evidence in harness/build-log.md.
Do not start the next phase.
