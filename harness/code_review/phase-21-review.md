# Phase 21 review: Highlight colours

- Reviewer: Claude Code (Opus 5.5), evaluator subagent, fresh context. 2026-10-21.
- Reviewed: branch `phase-21-highlight-colours` at fab20ab, diffed against its base:
  `git diff phase-20-panels-and-sheets...HEAD` (39 files, +1685 / -258).
- Machine: Apple Mac, macOS. Nothing else ran during `scripts/verify.sh`. No other perf run was active
  (the other worktree, `perf-first-page-investigation`, was idle). Probes ran only after verify finished.
- Scratch work (not in the repo): exploratory Playwright specs against the production build
  (`vite preview` on port 4181), in Chromium and WebKit, with desktop, iPhone 13 and iPad (gen 7)
  emulation. The clipboard, share sheet and speech were stand-ins that record what they receive, as in
  the phase's own spec.

## Verdict: FAIL

Most of the phase works when I use it. Colours are created, ringed, recoloured, kept after a reload,
synced, drawn in each theme, shown in the lists and named in the export. Unknown and missing colours
read as yellow. Copy failures show a message. Rapid swatch presses leave one highlight in the last
colour. Three problems block a pass:

1. **On an iPhone the menu over an existing highlight is wider than the screen.** Listen from here
   and Remove highlight are off the right edge (B1, contract items 2 and 3).
2. **Listen from here starts at the top of the page for a passage that crosses a page break**, not at
   the sentence where the passage starts (B2, contract item 6).
3. **Voice note rows in the Notes tab are now laid out side by side** and squeezed into columns. The
   new `.note-row { display: flex }` also applies to `.voice-row` (B3, a regression).

Item 7 is also not met as written. A page note's More menu has no Share (B4). Items 12 (CI) and 13
(devices) are still pending by design.

## Commands run

| Command | Result |
|---|---|
| `scripts/verify.sh` | **PASS**. lint, format, types; unit 403/403 (47 files); browser 345 passed + 2 skipped; sync 29/29 (including "a highlight's colour, and a later change of colour, reach the other device" in sync-chromium and sync-webkit); perf 10/10. |
| Perf (inside verify) | chromium: first 201 ms, jump 24, p95 16.7, canvas 67.1 MB, search 1391, blank 0. webkit: first 177, jump 55, p95 32, canvas 67.1, search 1407, blank 1.1 %. `e2e/perf/` is unchanged in the diff. |
| `git ls-remote --heads origin phase-21-highlight-colours`, `gh run list --branch …` | The branch is not pushed and has no CI run. |
| Reviewer probes (16 scenarios × Chromium and WebKit) | Details below. |

## Contract items

| # | Result | Evidence |
|---|---|---|
| 1 | PASS | Over a fresh selection the toolbar "Highlight" has the radiogroup Yellow/Green/Blue/Pink, Add note, Copy, Share, Listen from here, and no Remove highlight. Green creates one `highlight-box--green`. The menu stays with Green `aria-checked=true` and Remove highlight shown. Keyboard: Tab → Yellow, ArrowRight → Green, Enter creates green and focus stays on the swatch. Rapid Green → Blue → Pink: one highlight, pink, still pink after a reload (both engines). |
| 2 | **FAIL** | On desktop it works. Clicking a highlight rings its colour, Blue recolours it, and the menu offers Add note, Voice note, Copy, Share, Listen from here and Remove highlight. **On iPhone 13 (390 px)** the menu is 471 px wide inside a 374 px container. Listen from here (x 385–429) and Remove highlight (x 431–475) are off screen. Chromium's click on Remove highlight times out as "outside of the viewport". Screenshot: the trash and headphones buttons are cut off at the right edge. See B1. |
| 3 | **FAIL** | Placement is right. With room it goes above (menu bottom 421.8 < selection top 427.8, near the bottom of the screen). At the top it goes below. Targets are 40 px on desktop and 44 px on touch. But on a phone the existing-highlight menu does not fit (B1). With a docked panel (iPad portrait, desktop 760 px) the 431–471 px menu extends 110–114 px past the reader, over the side panel (N1). The phase's 44 px test checks only the fresh-selection menu, which has 8 targets and barely fits (379 of 390 px). |
| 4 | PASS | `highlight-colours.spec` compares each box's computed fill to the theme's `--hl-*` token in Light, Sepia and Dark. A record with `color` deleted draws yellow. My probe: a record with `color: 'purple'` draws `highlight-box--yellow`, rings Yellow in the menu, and shows `br-mark--yellow` in Notes. Unit test `highlightColor` covers absent and unknown. |
| 5 | PASS | Blue is kept after a reload (spec, plus my P4 probe). The sync spec passed in both engines: green reaches device B, then a recolour to blue from A's row menu replaces it on B (`highlight-box--green` count 0, row mark `br-mark--blue`). |
| 6 | **FAIL** | Copy puts "Charlie three" on the clipboard. With no clipboard it shows "This passage couldn't be copied here." Share sends `{title: 'text-4-pages', text: '“Charlie three”\n— text-4-pages, page 1'}`. Listen from a mid-line passage ("different words") starts at "Bravo two: …", which is correct. **Listen from a highlight that crosses from page 1 to page 2** ("India nine … and Juliet ten") starts at "Alpha one: the first line…", the top of page 1, instead of "India nine: …". Same in both engines. See B2. |
| 7 | **FAIL** | Highlight rows show the passage in a `<mark class="br-mark br-mark--{colour}">`. Their More menu has the four colours, Edit/Add note, Share, Copy, Delete (with a note) and Remove highlight, and all of them work: recolour, Share payload, Copy, Delete note (after an alertdialog; the highlight row stays), Remove highlight (the row and box go). **A page note's More menu is Edit note, Copy, Delete. It has no Share**, which the contract lists for each row (B4). Bookmark rows have only Remove bookmark (N2). Voice note rows have no More menu, and their layout broke (B3). |
| 8 | PASS | A page note, a pink "Alpha one" highlight and a green "Charlie three" highlight are listed in that order (spec). A highlight with no note gets its own row. After deleting its note, the highlight keeps its row. `annotationRows` unit tests cover order and orphaned notes. |
| 9 | PASS | Unit test: `> Green words.\n\n*Green highlight*`. The e2e download contains `> Charlie three\n\n*Green highlight*\n`. An unknown colour exports as Yellow. The wording differs from the phase file's example ("Highlighted in green"), but the file gives it only as an example. |
| 10 | PASS | I read every changed line in the 10 earlier specs, `e2e/sync/devices.ts` and `SelectionActions.test.tsx`. The changes are control renames (Highlight → the Yellow radio), row actions moving into More (`rowAction`), the menu now staying after a highlight is made (asserted as checked swatch plus visible Remove), `color` in the stored keys, and the "No notes yet" expectation changing because of the user's decision 1. None loosens a check, and the keyboard tests add focus assertions. All are recorded in the build log. |
| 11 | PASS | Perf 10/10 in both engines, budgets unchanged (numbers above). |
| 12 | PENDING | Local verify passes. The branch is not pushed, so there is no CI run (pushing needs the user's approval). |
| 13 | PENDING | User device check. B1 would show up at once on an iPhone. |

## Rubric

| Criterion | Score | Threshold | Notes |
|---|---|---|---|
| Contract fidelity | 3 | 5 | Items 2, 3, 6 and 7 fail as exercised (B1, B2, B4). Items 12 and 13 are pending. |
| Functionality | 3 | 4 | Desktop flows work end to end. On an iPhone, which the phase names as the thumb case, an existing highlight cannot be removed or listened from through its menu. Cross-page passages listen from the wrong place. |
| Robustness | 4 | 4 | Failed saves and recolours report through `annotationMessage`. Missing clipboard and speech show messages. Old and unknown colours degrade to yellow, and the save-versus-dismiss race the author found is fixed with a ref. Nothing is stubbed. |
| Code quality | 3 | 3 | The components are readable, and the colour is a class, so a theme change needs no redraw. Issues: `.note-row` was turned into a flex row globally, without checking its other user (`.voice-row`), which is the hidden coupling that caused B3. `BUTTON_WIDTH = 170` in useHighlights.ts is now a stale "rough width" (the menu is 400–470 px), though the layout effect clamps from the real size. The `kind: 'remove'` action name now means "an existing highlight", which reads oddly at the call sites. |
| Test quality | 3 | 3 | The new spec is behavioural and would catch most regressions: fills against tokens per theme, reload, sync, More actions, export. Gaps that let the blockers through: the touch-size test measures only the fresh-selection menu and never checks that the menu fits the viewport. The Listen tests (unit and e2e) use passages that lie on one page. There is no cross-page case, although notes.spec already builds one. No test covers voice rows' layout. |
| Product depth | 4 | 3 | Real colour model, synced, with list and export integration and a working row menu. |
| Design | 3 | 3 | The menu matches the HighlightMenu reference (48 px bar, ringed swatches, separator, icon actions). There is no pointer arrow, which the reference mentions. The overflow on phones and over docked panels, and the broken voice rows, pull this down to the threshold. |

Contract fidelity (3 < 5) and Functionality (3 < 4) are below threshold, so the phase fails.

## Bugs and findings

### Blockers

- **B1. The menu over an existing highlight does not fit an iPhone screen** (items 2 and 3).
  `src/ui/SelectionActions.tsx:103-155` puts 4 swatches and up to 6 icon buttons in one non-wrapping
  flex row (`.br-hlmenu`, `src/ui/app.css:359`). At 44 px (touch / ≤ 719 px, `app.css` media block)
  that is about 471 px. `.selection-actions` has `max-width: calc(100% - 16px)` (`app.css:355`), but
  the inner toolbar overflows it.
  Repro: iPhone 13 emulation, open text-4-pages, select "Charlie three", tap Green. The menu now has
  Voice note and Remove highlight too. Measured: toolbar `right=479` in a 390 px viewport. Listen from
  here is at 385–429 and Remove highlight at 431–475. Chromium refuses the click as outside the
  viewport. Expected: every action reachable inside the screen. For example, wrap to a second row,
  fold the less used actions into an overflow, or move Voice note out (the plan's decision 2
  alternative). Add a test that every menu target is inside the viewport at 390 and 320 px, over an
  existing highlight.
- **B2. Listen from here on a passage that crosses a page break starts at the top of the page**
  (item 6). `src/core/read-aloud.ts:131` searches for the whole collapsed quote in the start page's
  text. A quote that continues onto the next page is never found there, so the function returns
  sentence 0.
  Repro: text-4-pages, select from "India nine" (foot of page 1) to "and Juliet ten" (top of page 2),
  choose a colour, press Listen from here. The first spoken sentence is "Alpha one: the first line of
  selectable text on page one." Expected: "India nine: this sentence starts at the foot of page one".
  The same fallback hits any passage whose page text differs slightly from the selection's text.
  Matching the longest prefix of the passage that is on the page (or the start-page part of the
  rects' text) would fix it. Add a unit case and an e2e case.
- **B3. Voice note rows are laid out horizontally** (regression from phase 20).
  `src/ui/app.css:317-321` adds `.note-row { display: flex; align-items: flex-start; gap: 4px }`. Voice
  rows are `<li class="note-row voice-row">` (`src/ui/VoiceNotes.tsx`), so their metadata, audio
  player and buttons now sit in three columns.
  Repro: a page voice note on text-4-pages, then the Notes tab at 1280 px. Measured: STRONG 65 px wide
  and 72 px tall (the text "Page · Page 1 · 0:02" wraps over three lines), AUDIO beside it at 169 px,
  and the buttons in a 105 px column ("Delete voice note" wraps). Expected: the stacked layout from
  phase 20. Scope the flex rule to rows with a More menu (for example `.note-row:not(.voice-row)` or a
  dedicated class).

### Major

- **B4. A page note's More menu has no Share** (item 7: "each row has a More menu (Edit note, Change
  colour for highlights, Share, Copy, Delete)"). `src/ui/NotesPanel.tsx:150-174` builds Edit note,
  Copy and Delete for `row.kind === 'note'`. Copy already falls back to the note text, so Share could
  use the same text with the title and page. Either add it, or amend the contract with the user's
  agreement.

### Non-blocking

- **N1. With a docked panel the menu spills over the panel.** iPad portrait (810 px, reader 430 px):
  the menu runs 69–540 px. At 760 px desktop: 63–494 px against a reader ending at 380 px. The buttons
  stay clickable because the menu draws over the panel, but it covers the panel's content.
  `useLayoutEffect` clamps `left` to `area.clientWidth - box.width - 8`, which goes negative and is
  then floored at 8.
- **N2. Bookmark rows' More menu has only Remove bookmark.** That is defensible, since a bookmark has
  no passage or note. Share or Copy of the page reference would match the design's list more closely.
- **N3. Add note over a fresh selection, then Cancel, leaves a yellow highlight with no note.** This
  follows the documented judgment call ("a note needs a highlight"), but it may surprise the user.
  Worth a line in the device check.
- **N4. A swatch press during a save is dropped silently.** `highlightSelection` returns null while
  `saving.current` is set. In practice the last press won in my rapid-press probe, because by then the
  menu was for the new highlight. A press landing inside the save window is ignored, with no feedback.
- **N5. The stale constant `BUTTON_WIDTH = 170`** in `src/ui/useHighlights.ts` ("Rough width of the
  menu") no longer matches a 400–470 px menu. The initial `left` it computes is wrong until the layout
  effect corrects it.

## Top three findings for the author

1. B1: on an iPhone, the menu over an existing highlight overflows the screen, and Remove highlight
   and Listen from here are unreachable.
2. B2: Listen from here on a cross-page passage starts at the top of the page (`read-aloud.ts:131`
   needs a prefix match).
3. B3: voice note rows broke into columns because of the global `.note-row { display: flex }`.
   (Also B4: a page note's More menu lacks Share.)
