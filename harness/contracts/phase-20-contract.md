# Contract: Phase 20 Panels and sheets

Agreed definition of done, written before any code. The author drafts it. The user or the
reviewing agent approves it. After approval, only append clearly marked amendments.

- Approved by: (pending: posted to the user for approval on 2026-10-20)

## Checkable items

| # | Behavior | How to verify | Result (filled in at review) |
|---|---|---|---|
| 1 | Contents, Bookmarks and Notes are tabs of one panel; Bookmarks and Notes show their counts; the tabs work with a click and with the arrow keys; the panel's title is the open tab and it has a Close button | e2e + unit | |
| 2 | Search has its own panel: the search field shows the match count and has previous and next inside it; Enter and Shift+Enter step through matches, Escape clears; results show page, chapter and a line of context with the match marked, and the shown match is marked as current | e2e | |
| 3 | From 720 px wide the panel docks on the right at 380 px and the page stays visible and usable beside it; choosing an entry keeps the panel open | e2e (1280 and 820 px) | |
| 4 | Under 720 px the panel is a bottom sheet (at most 88 % of the height, grabber, scrim); it closes with Close, a tap on the scrim, Escape, or a drag down; choosing an entry closes it; nothing scrolls sideways at 320 and 390 px | e2e (touch emulation for the drag) | |
| 5 | The toolbar has no Bookmarks or Notes buttons: Contents opens the tabbed panel; on phones More holds Contents and Search; Add note, voice notes and Cmd/Ctrl+F open the right tab or panel; the compact toolbar starts below 720 px | e2e | |
| 6 | The contents tree folds and unfolds with a chevron, and the title always jumps; page numbers show (the PDF's labels when it has them); the current chapter is marked, its parents open and it is scrolled into view when the panel opens; rows are at least 44 px tall | e2e + unit | |
| 7 | Bookmark and note rows follow the design's row layout (metadata line with page and chapter, passage, note, hairline dividers) with today's actions still working (jump, edit, remove, voice notes) | e2e (existing behaviour tests) | |
| 8 | Keyboard: opening a panel moves focus into it, Escape closes it and returns focus to the button that opened it (More on phones), and focus never lands on `<body>` | e2e | |
| 9 | The sheet slides in 200 ms; under reduced motion nothing moves | e2e | |
| 10 | Earlier tests pass, changed only for renamed or moved controls (each change recorded in the build log; no check loosened) | full suite | |
| 11 | Speed budgets pass unchanged in both engines | perf | |
| 12 | `scripts/verify.sh` passes locally and the full CI run on the branch is green | local run; GitHub run URL | |
| 13 | User-checked on Mac, iPad and iPhone: the docked panel, the sheet and its drag, the tabs, the contents tree, search | User report | |

## Out of scope for this contract

- Highlight colours, the selection menu and the AnnotationRow More menu (phase 21); the voice note
  strip and listen bar (phase 23); the library (phase 22).

## Amendments

(none)
