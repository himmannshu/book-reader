# Phase 19: Reader chrome

- Status: In progress (plan approved by the user, 2026-10-20)
- Branch: phase-19-reader-chrome (cut from `mac-webkit-baseline`, where local verify is green)
- Depends on: 18

## Objective

The reader takes on the designed chrome from the Book Reader design system: one quiet toolbar
(book and chapter title, tools in the designed order, a compact form on phones, fading while the
reader scrolls), a Reading settings popover for theme, zoom and fit, and a page pill. Pages keep
the per-theme styling from phase 18. Design references:
`harness/context/design-system/components/{ReaderToolbar,ReadingSettings,PagePill,SegmentedControl}.md`,
their sources in `components/src/`, and the README's "Screens, composed".

## In scope

- Toolbar: Library, Contents, Bookmarks, Notes | title and current chapter | Search, Listen,
  Reading settings, Bookmark (last). Bookmarks and Notes stay beside Contents until phase 20 folds
  them into a tabbed panel (user's choice). The open tool and a bookmarked page show pressed.
- Compact toolbar on narrow screens (the existing 699 px breakpoint): Contents, Bookmarks, Notes and
  Search move into a More menu; the title aligns left.
- The toolbar fades while the reader scrolls (opacity only) and comes back on a tap on the page or
  keyboard focus. It never hides while a panel, popover, menu, highlight menu, search bar or
  player is open, and it does not animate under reduced motion.
- Reading settings popover behind the Aa button, replacing the reader's Theme picker, zoom select
  and the narrow-screen Display popover: Theme (segmented, with paper swatches), Zoom (− value +),
  Fit (Width, Page, Custom). A bottom sheet on narrow screens.
- Page pill: "Page N of M · P%", using the PDF's page labels when the book defines them. Shows while
  scrolling or jumping and fades about a second after the page settles.
- Open PDF moves out of the reader (library only). In the reader, sync status shows as a small
  badge only when it needs the reader (offline, failed, sign in, storage full); the full sync line
  stays in the library (user's choice).
- Controls ported from the design sources: SegmentedControl, ReaderToolbar, ReadingSettings,
  PagePill.

## Non-goals

- The tabbed Contents/Bookmarks/Notes panel, bottom-sheet panels, the contents tree (phase 20)
- Highlight menu and colours (21), library redesign (22), listen bar (23)
- Moving the 699 px breakpoint to the design's 720 px (phase 20, with the sheets)

## Expected files or components touched

- `src/ui/ReaderView.tsx`, `src/ui/App.tsx`, `src/ui/controls.tsx` (or a new reader-chrome module),
  `src/ui/app.css`, `src/ui/SyncStatusLine.tsx`
- `src/core/reading-state.ts` (zoom steps and fit), page-label formatting in `src/core`
- `src/engine/types.ts` and the PDF.js adapter (page labels)
- `scripts/generate-fixtures.mjs` (a fixture with page labels)
- e2e: a new `reader-chrome.spec.ts`; existing specs that use renamed or moved controls

## Decisions needing a human

- Made by the user on 2026-10-20: Bookmarks and Notes beside Contents until phase 20; Open PDF and
  the sync line out of the reader. Other judgment calls go in
  harness/context/phase-19-reader-chrome-context.md.

## Verification plan

- Red first: `e2e/reader-chrome.spec.ts` (tool order and names, title and chapter, compact More menu,
  fading, Reading settings, page pill) and unit tests for SegmentedControl, zoom and fit logic and
  page-label formatting
- Green: the toolbar, popover, pill and engine changes
- Focused command: `npm run test:unit` and `npm run test:e2e -- reader-chrome design comfort`
- Full command: `scripts/verify.sh`, then `gh workflow run verify.yml --ref phase-19-reader-chrome`

## Acceptance criteria

See harness/contracts/phase-19-contract.md.

## Risks and recovery

- WebKit scrolling p95 has thin headroom. Fading and the pill must add no per-frame work: a class
  flip once when scrolling starts and stops, and the pill fed by the viewer's existing page
  callback. The perf budgets decide.
- Many existing tests name the old controls. Renames are mechanical; each one is recorded in the
  build log and no check is loosened.
- Bottom sheets and safe-area insets can only be judged on a device (contract item 13).

## Stop condition

Stop when every contract item has observed evidence in harness/build-log.md.
Do not start the next phase.
