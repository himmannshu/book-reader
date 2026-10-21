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

## Recheck (2026-10-21)

- Reviewer: Claude Code (Opus 5.5), evaluator subagent, fresh context. Recheck of the fixes made after the review above.
- Checked: branch `phase-21-highlight-colours` at **8113d9a** (working tree clean). Read `git diff fab20ab..HEAD`
  (code changes are in 814f19d: SelectionActions.tsx, useHighlights.ts, NotesPanel.tsx, read-aloud.ts, app.css,
  ReaderView.tsx, plus tests) after forming my own checks against the contract.
- Probes (not in the repo): Playwright specs against the production build (`vite preview`, port 4181), Chromium and
  WebKit, with iPhone 13 emulation at 390, 375 and 320 px wide, iPad (gen 7) portrait with the Notes panel docked,
  and desktop 1280 px. Clipboard, share sheet and speech were recording stand-ins, as in the phase's own spec.
  26 probe cases ran; 24 passed, 2 failed (both are N6 below, one per engine).

### Verify and speed

| Run | Result |
|---|---|
| `scripts/verify.sh` #1 | FAIL on one check: lint, format, types OK; unit 404/404; browser 352 + 2 skipped; sync 29/29; perf 9/10. **WebKit steady-scroll p95 52 ms, budget 40.** |
| `scripts/verify.sh` #2 | FAIL on one check: unit, browser, sync all pass; perf 9/10. **Chromium first page 296 ms, budget 250.** |
| `scripts/verify.sh` #3 | FAIL: unit and browser pass; **sync 27/29** (`files.spec` "an interrupted upload resumes…" in Chromium and "offline, or before the upload has finished…" in WebKit). Load average hit 69 while macOS `mobileassetd` / software update ran. Rerun alone, `files.spec` passed 14/14. phase 21 doesn't change `files.spec`, `src/sync` or `functions/`. |
| `scripts/verify.sh` #4 (after the load settled) | FAIL on one check: unit, browser, sync 29/29 pass; perf 9/10. **Chromium first page 257 ms, budget 250.** |
| `npm run test:perf` alone, between verify runs | **PASS 10/10.** chromium: first 205, jump 17, p95 16.8, canvas 67.1, search 867, blank 0. webkit: first 161, jump 62, p95 34, canvas 67.1, search 1387, blank 1.1 %. |
| A/B against phase 20 (b86cf33, extracted with `git archive` to the scratchpad, same node_modules, runs alternated, nothing else of mine running) | WebKit steady-scroll p95: phase 21 32 / 33 / 33 / 36 ms, phase 20 36 / 31 / 34 / 30 ms. Chromium first page: phase 21 186 / 184 / 181 / 191 / 198 ms, phase 20 186 / 181 / 185 / 179 / 188 ms. That is about 4 ms apart on average, well inside run-to-run noise. |

Conclusion: phase 21 adds no measurable cost. The verify misses are timing checks that sit close to their budgets,
running right after the browser and sync suites on an 8 GB machine where the user's Chrome and macOS background
updates were also busy. Still, **I did not see one green `scripts/verify.sh` run in four tries**, so the local half
of item 12 is not met by my runs. The author's last green run was at 814f19d, and the build log records a red run at
de3e7c0. See V1.

### Contract items

| # | Result | Evidence |
|---|---|---|
| 1 | PASS | Unchanged since the first review, and the spec passes in all four verify runs. Probe: a fresh selection at 390/375/320 px shows 4 swatches and Add note, Copy, Share, Listen from here, every target 44 px and on screen. Pink creates one highlight, and the menu stays with Pink ringed. |
| 2 | PASS | B1 is fixed. Over an existing highlight on a phone, the menu stacks: colours on the first row; Add note, Voice note, Copy, Share, Listen from here and Remove highlight on the second. At 390 px it runs 64–346 px, at 320 px 30–312 px, at 375 px 85–367 px. That holds for a selection near the right edge as well (both engines). After a reload, tapping the highlight rings Pink, and Listen from here and Remove highlight can be tapped. The highlight-colours spec now taps Remove highlight at 390 and 320 px. |
| 3 | PASS | Every target is ≥ 44 px on touch and inside the viewport at 320, 375 and 390 px. The menu never overlaps the selection or the highlight (it goes above with room, below near the top: at 320 px the selection was at y 159–166 and the menu at 172–270). N1 is fixed: iPad portrait with Notes docked, reader 0–430 px. The fresh menu runs 37–422 px in one row; over a highlight, 69–351 px, stacked. Desktop: 40 px targets. See N7 for a resize while the menu is open. |
| 4 | PASS | Unchanged code. The per-theme fill test passes in every verify run. |
| 5 | PASS | Reload probes keep Pink and Blue. The sync spec "a highlight's colour, and a later change of colour, reach the other device" passed in verify runs 1, 2 and 4 in both engines. |
| 6 | PASS | B2 is fixed. Probe: a blue highlight from mid-sentence on page 1 ("sentence starts…") to "and Juliet ten" on page 2. After a reload I clicked its box on page 2 and pressed Listen from here. The first spoken text is "India nine: this sentence starts at the foot of page one" (both engines). The new unit cases cover the longest-start match. Copy and Share are unchanged and pass. |
| 7 | PASS | B4 is fixed. A page note's More menu is Edit note, Share, Copy, Delete. Share sends `{title: 'text-4-pages', text: '“My page thought”\n— text-4-pages, page 1'}` and Copy writes "My page thought" (both engines). Highlight rows work as before. N2 (bookmark rows) is left as is, with a reason. |
| 8 | PASS | Unchanged. The spec passes. B3 is fixed: in both engines, a voice row is `display: list-item` with the line, the player and the buttons stacked (y 326 → 357 → 396/419) at full width. Highlight and note rows are still flex rows (`.annotation-row`). |
| 9 | PASS | Unchanged. The unit and e2e export checks pass. |
| 10 | PASS | The changes since fab20ab tighten tests. The phone test now really runs at phone width, because `beforeEach` no longer forces 1280 px. It checks on-screen bounds as well as size, over an existing highlight. panels.spec adds a check that voice rows are stacked. Nothing was loosened. |
| 11 | PASS | `npm run test:perf` alone passes 10/10. `e2e/perf/` and the budgets are unchanged. The A/B against phase 20 shows no regression. The misses inside verify are V1. |
| 12 | **PENDING / not met** | Local: `scripts/verify.sh` failed 4 of 4 runs on this machine, each time on a different timing check that passes alone (V1). CI: the branch is not pushed (`git ls-remote` shows no remote branch), so there is no run. A green verify run and the CI run URL are still needed. |
| 13 | PENDING | User device check. |

### Rubric (recheck)

| Criterion | Score | Threshold | Notes |
|---|---|---|---|
| Contract fidelity | 4 | 5 | Items 1–11 pass when exercised. Item 12 is open (no green local verify in my runs, no CI run), and item 13 is pending by design. Neither is a defect in the phase's code, but the contract is not yet complete. |
| Functionality | 4 | 4 | The phone, iPad-docked, cross-page Listen, page-note Share and voice-row flows all work end to end in both engines. N6 and N7 are edge cases. |
| Robustness | 4 | 4 | As before. The N4 fix applies a mid-save swatch press, but it also catches the implicit yellow from Add note (N6). |
| Code quality | 3 | 3 | The scoped `.annotation-row` removes the hidden coupling. `passageSentence`'s binary search is correct, since a prefix that is on the page implies all shorter prefixes are. The stale constant is gone. `ONE_ROW_EXTRA` copies padding, gap and separator sizes from app.css by hand, which is new coupling: a CSS change would misjudge when to stack. `kind: 'remove'` still means "an existing highlight". |
| Test quality | 4 | 3 | Each blocker now has a test that fails if it regresses: on-screen bounds at 320/390 px over an existing highlight, the docked-panel bounds at 760 px, the cross-page Listen e2e and unit cases, voice-row stacking, and page-note Share. No test covers Add note during a save (N6) or a resize with the menu open (N7). |
| Product depth | 4 | 3 | Unchanged. |
| Design | 4 | 3 | The stacked phone menu is tidy: colours on top, six evenly spaced 44 px icons below, the chosen colour ringed (WebKit screenshot checked). Voice rows look right again. There is still no pointer arrow. |

### Earlier findings

| Finding | Status |
|---|---|
| B1 menu wider than an iPhone | **Fixed** (item 2 probe at 320/375/390 px, both engines). |
| B2 Listen from here on a cross-page passage | **Fixed** (probe from mid-sentence, after a reload, from the page 2 box). |
| B3 voice rows laid out side by side | **Fixed** (computed layout and screenshot). |
| B4 page note's More menu without Share | **Fixed** (payload checked). |
| N1 menu spills over a docked panel | **Fixed** (iPad portrait and the 760 px spec). |
| N2 bookmark rows hold only Remove bookmark | Open, accepted by the author with a reason (a bookmark has no passage). Not blocking. |
| N3 Add note then Cancel leaves a yellow highlight | Open, the recorded judgment call. For the device check. |
| N4 swatch press during a save dropped | **Fixed** for swatches: Yellow → Blue → Pink in one tick gives one pink highlight, still pink after a reload. The fix introduced N6. |
| N5 stale `BUTTON_WIDTH` | **Fixed** (removed). |

### New findings

- **V1. `scripts/verify.sh` was not green in four runs on this machine** (item 12, local half). The failures were
  WebKit scroll p95 52 ms (budget 40), Chromium first page 296 and 257 ms (budget 250), and, under a macOS update load
  spike, two `files.spec` sync tests. Each passes when run alone, and the A/B against phase 20 shows no difference, so
  this is not a phase 21 regression. Still, nobody has a green run of the current HEAD on record (the author's last
  green was 814f19d, and a red one was logged at de3e7c0). Before marking item 12, get one green `scripts/verify.sh`
  on a quiet machine (Chrome closed, no macOS update running) plus the CI run. If this keeps happening, raise the
  thin budget headroom inside verify (WebKit p95 sits around 32–38 ms against 40; Chromium first page around 185–205
  against 250, more after the earlier suites) with the user. Do not change budgets alone.
- **N6. Pressing a colour and then Add note during the save leaves the highlight yellow, and no note editor opens**
  (new, from the N4 fix). `ReaderView.tsx:1150` calls `highlightSelection('yellow')` for Add note on a fresh
  selection. While the first save runs, `useHighlights.ts:192-194` stores that `'yellow'` as `pendingColor`. The
  save then rewrites the green highlight as yellow, and Add note gets `null`, so its `.then` opens nothing. Repro (both
  engines): select "Charlie three" and, in one tick, click Green and then Add note (`toolbar.querySelector(...).click()`
  twice). Result: `highlight-box--yellow`, and the note editor does not open. Expected: green, with the note editor
  open (or at least green). Only swatch presses should set `pendingColor`. Add note during a save should wait for the
  save and then open the editor for the new highlight. The window is the length of an IndexedDB write, so on a device
  it takes a quick double tap. Not blocking.
- **N7. The menu does not lay itself out again when the window is resized while it is open.** The layout effect
  in `SelectionActions.tsx` depends only on `[action, reason, noteLabel, color, stacked, bounds]`. Repro: at 1280 px,
  make a green highlight (the menu stays for it), then resize to 390 px. The menu is still one row at 296–773 px, so
  most of it is off screen and no longer next to the highlight (Chromium and WebKit). On a device this is turning an
  iPhone or iPad with the menu open. A tap elsewhere dismisses it, so it is not blocking. Add it to the device check
  (rotate with the menu open), or re-run the layout on resize or dismiss the menu on resize.
- **N8. `ONE_ROW_EXTRA` (`SelectionActions.tsx:54`) copies padding, gap and separator widths from `app.css`.** If the
  CSS changes and this constant doesn't, the stack decision is off by a few pixels. Measuring the toolbar's own padding
  and gap (`getComputedStyle`) would remove the coupling. Code quality only.

### Verdict (recheck)

**PASS on everything I can check, but the phase is not done.** Items 1–11 pass when exercised. Every earlier blocker
(B1–B4) and N1, N4 and N5 are fixed. Functionality, Robustness, Code quality, Test quality, Product depth and Design
meet their thresholds. Contract fidelity cannot reach 5 until item 12 (one green local `scripts/verify.sh` at HEAD
and the green CI run on the branch) and item 13 (the user's device check) are done. Neither can be done by the
reviewer. The phase can be marked complete once those two have evidence in the build log. No code change is required
first. N6 and N7 are worth fixing or adding to the device check.

Top findings: (1) V1, no green local verify in four runs (timing checks, not a phase 21 regression by A/B). (2) N6,
Add note pressed during a colour's save turns the highlight yellow and opens no editor. (3) N7, the menu does not
re-lay out on resize or rotation.
