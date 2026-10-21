# Contract: Phase 21 Highlight colours

Agreed definition of done, written before any code. The author drafts it. The user or the
reviewing agent approves it. After approval, only append clearly marked amendments.

- Approved by: (pending: posted to the user for approval on 2026-10-21, with two decisions open)

## Checkable items

| # | Behavior | How to verify | Result (filled in at review) |
|---|---|---|---|
| 1 | Over a fresh selection the menu offers four colour swatches, Add note, Copy, Share and Listen from here; choosing a colour creates the highlight in that colour and the menu stays for it | e2e | |
| 2 | Over an existing highlight the menu rings its colour; choosing another recolours it; it offers Add or Edit note, Copy, Share, Listen from here and Remove highlight | e2e | |
| 3 | The menu sits above the selection (below when there is no room), never covers the selected text, and its targets are at least 40 px (44 px on touch screens) | e2e | |
| 4 | Each highlight is drawn in its colour's `hl-*` fill on the page, in Light, Sepia and Dark; highlights saved before this phase draw yellow | e2e + unit | |
| 5 | A highlight's colour is kept after a reload, and a colour change made on one device appears on the other | e2e + sync e2e | |
| 6 | Copy puts the passage on the clipboard; Share hands it on with the title and page (phase 17); Listen from here starts reading at the sentence where the passage starts | e2e + unit | |
| 7 | List rows show a highlight's passage with its colour, and each row has a More menu (Edit note, Change colour for highlights, Share, Copy, Delete) whose actions work | e2e | |
| 8 | (Decision 1) The Notes tab lists highlights as decided by the user, each with its colour | e2e | |
| 9 | The Markdown export names each highlight's colour | unit + e2e | |
| 10 | Earlier tests pass, changed only for renamed or moved controls (each change recorded in the build log; no check loosened) | full suite | |
| 11 | Speed budgets pass unchanged in both engines | perf | |
| 12 | `scripts/verify.sh` passes locally and the full CI run on the branch is green | local run; GitHub run URL | |
| 13 | User-checked on Mac, iPad and iPhone: making and recolouring highlights with the menu (also mid-selection with a thumb), the colours in each theme, the lists, the export | User report | |

## Out of scope for this contract

- Colour filters, custom colours; the listen bar and voice note strip (phase 23); the library (phase 22).

## Amendments

(none)
