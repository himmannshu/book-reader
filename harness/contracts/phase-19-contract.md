# Contract: Phase 19 Reader chrome

Agreed definition of done, written before any code. The author drafts it. The user or the
reviewing agent approves it. After approval, only append clearly marked amendments.

- Approved by: the user, 2026-10-20 (plan approved in the local session, with Bookmarks and Notes
  beside Contents and Open PDF and the sync line out of the reader). Judgment calls:
  harness/context/phase-19-reader-chrome-context.md.

## Checkable items

| # | Behavior | How to verify | Result (filled in at review) |
|---|---|---|---|
| 1 | The reader toolbar shows Library, Contents, Bookmarks, Notes, the title, then Search, Listen, Reading settings and Bookmark (last), each with an accessible name and a tooltip; the open tool and a bookmarked page show pressed | e2e | |
| 2 | The title shows the book's title and the current chapter, and the chapter updates as the reader moves between chapters | e2e | |
| 3 | On narrow screens the toolbar is compact: Contents, Bookmarks, Notes and Search are in a More menu, every control is at least 44 × 44 px, and nothing scrolls sideways at 320 and 390 px | e2e | |
| 4 | The toolbar fades while the reader scrolls, comes back on a tap on the page or keyboard focus, never hides while a panel, popover, menu, highlight menu, search bar or player is open, and does not animate under reduced motion | e2e | |
| 5 | Reading settings: the theme applies at once to the chrome and the pages and persists; zoom steps through the designed levels; Fit Width, Page and Custom behave as designed (a zoom choice switches to Custom); highlights stay aligned after zoom and fit changes | e2e + unit | |
| 6 | Reading settings closes with Escape or a click outside and returns focus to its button; on narrow screens it is a bottom sheet | e2e | |
| 7 | The page pill reads "Page N of M · P%", uses the PDF's page labels when defined, appears while scrolling or jumping and fades about a second after the page settles | e2e + unit | |
| 8 | Open PDF is only in the library; in the reader, sync status appears only when it needs the reader | e2e | |
| 9 | Pages keep the theme styling (canvas, page shadow, Sepia tint, Dark filter) with the new chrome | existing e2e | |
| 10 | Earlier tests pass, changed only for renamed or moved controls (each change recorded in the build log; no check loosened) | full suite | |
| 11 | Speed budgets pass unchanged in both engines | perf | |
| 12 | `scripts/verify.sh` passes locally and the full CI run on the branch is green | local run; GitHub run URL | |
| 13 | User-checked on Mac, iPad and iPhone: the toolbar, its fading, Reading settings and the page pill | User report | |

## Out of scope for this contract

- Tabbed panel, bottom-sheet panels and the contents tree (phase 20); highlight colours (21);
  library redesign (22); listen bar (23).

## Amendments

(none)
