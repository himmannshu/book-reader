# Phase 20 review: Panels and sheets

- Reviewer: Claude Code (Opus 5.5), evaluator subagent, fresh context. 2026-10-20.
- Reviewed: branch `phase-20-panels-and-sheets` at 9fd4434, diffed against phase 19's last commit:
  `git diff 7c4e3fd..HEAD` (31 files, +1643 / -325).
- Machine: 8-core Apple Mac, macOS. Nothing else ran during `scripts/verify.sh`. Probes ran only after it finished.
- Scratch work (not in the repo): exploratory Playwright specs against the production build
  (`vite preview` on port 4181), plus two scratch PDFs made with pdf-lib: `outline-12-pages` with
  page labels added (roman i–iii, then 1…), and `text-4-pages` with a nested outline added, so search
  results have chapters.

## Verdict: FAIL

The phase works well when I use it: tabs, docked and sheet panels, drag-to-close (also with real touch
events), the contents tree with page labels, the search field, focus return, motion and speed all
behave as the contract says. **One contract item is not met as written (B1).** Item 7 requires note
rows to show a metadata line with page **and chapter**. Note rows (written and voice) show only "Page
note · Page 6", with no chapter. It is a small fix. Items 12 (CI) and 13 (devices) are still pending
by design.

## Commands run

| Command | Result |
|---|---|
| `scripts/verify.sh` | **PASS** on the first run. lint, format, types; unit 396/396; browser 317 passed + 1 skipped; sync 27/27; perf 10/10. |
| Perf (inside verify) | chromium: first 191 ms, jump 27, p95 16.8, canvas 67.1 MB, search 885, blank 0. webkit: first 145, jump 73, p95 33, canvas 67.1, search 1393, blank 1.1 %. `e2e/perf/budgets.json` is unchanged in the diff. |
| `git ls-remote` / `gh run list --branch phase-20-panels-and-sheets` | The branch is not pushed and has no CI run yet. |
| Reviewer probes (8 scenarios × Chromium and WebKit) | Details below. |

## Contract items

| # | Result | Evidence |
|---|---|---|
| 1 | PASS | Tabs show `Contents`, `Bookmarks 1`, `Notes 1` (accessible names from aria snapshot), the title follows the tab, Close returns focus to the toolbar's Contents. Arrow keys, Home and End work (unit test plus panels.spec). The panel reopens on the last tab used, with focus on its first entry. Counts update after a removal (`Bookmarks 0`). |
| 2 | PASS | Probe on the outline+text PDF: results read `p. 1 · Opening / … on **page** one …`, with `p. 3 · <long nested title>` truncating correctly. Enter / Shift+Enter / Next / Previous step the count (panels.spec). Escape with text clears the field and the results while the panel stays. Escape on an empty field closes the panel and focuses Search (phone: More). Same in both engines. |
| 3 | PASS | At 720, 1024, 820 and 1280 px: panel `x + 380 = width`, the reader fills the rest (at 720 px the reader is 340 px). Wheel-scrolling the pages beside the docked panel moved scrollTop 0 → 600. Choosing an entry keeps the panel open (panels.spec). |
| 4 | PASS | At 719 and 390 px the panel is the sheet (bottom edge = viewport, height ≤ 88 %). The scrim, Escape, Close, a mouse drag and a **CDP touch drag** on the grabber or the title all close it. A touch drag on the list body does not close it. Choosing an entry closes it. At 320 and 390 px, `scrollWidth == clientWidth` for the document, the panel and its body, on the Contents, Notes and Search sheets, in both engines. (panels.spec checks only 390 px, and only with a mouse.) |
| 5 | PASS | The toolbar has Library, Contents, Search, Listen, Reading settings, Bookmark (reader-chrome spec). More holds Contents and Search. At 719 px the toolbar is compact, at 720 px it is full. Cmd+F opens Search (desktop and phone sheet, focus in the field). A highlight's Add note and Voice note open the Notes tab (panels.spec, voice-notes spec). |
| 6 | PASS | Fold and unfold with the chevron. The title jumps. Rows are ≥ 44 px. The current chapter is marked, a folded parent reopens, and it is scrolled into view (panels.spec). **Page labels**: on my labelled scratch PDF the tree reads `Part One i`, `Chapter 1 ii`, `Chapter 2 2`, `Part Two 5`, `Chapter 3 6`, `Appendix 9`, which matches the PDF's labels. No repo test covers labels in the tree (N3). |
| 7 | **FAIL** | Probe on outline-12-pages, page 6 (Chapter 2): the note row's text is `"Page note · Page 6\nA thought on chapter two\nEdit note\nDelete"`, with **no chapter**. Voice rows (`VoiceNotes.tsx:73-76`) also have none. The contract says "metadata line with page and chapter". Bookmark rows read `Page 6 · Chapter 2`, which meets it. Hairlines are present. Today's actions all still work (existing note, bookmark and voice specs pass). See B1. |
| 8 | PASS | Focus moves into the panel on open and returns to the opener on Escape, Close, scrim and drag (More on phones). After removing a bookmark by mouse, focus is on the Bookmarks nav, not `<body>`. (Tabbing past the end of the document reaches the browser's own `<body>` stop, which is normal page wrap, not this phase's bug. But see N1.) |
| 9 | PASS | `animation-duration: 0.2s` on the sheet. Under `reducedMotion: 'reduce'` it is `none` (panels.spec). |
| 10 | PASS | I read every changed line in the 13 existing specs and helpers (list below). None loosens a check. Several make checks stricter (`exact: true`, plus a new `toBeFocused` before Enter in bookmarks). The search spec maps `p. 1` back to `Page 1` and keeps the exact 8-item page list. The keyboard tests now go through the tabs (`keyboardToTab`) and still assert the same focus targets. |
| 11 | PASS | Perf 10/10 in both engines, budgets unchanged (numbers above). |
| 12 | PENDING | Local verify passes. There is no CI run because the branch is not pushed (needs the user's approval). |
| 13 | PENDING | User device check. |

## Rubric

| Criterion | Score | Threshold | Notes |
|---|---|---|---|
| Contract fidelity | 4 | 5 | Item 7 is not met as written (B1). Items 12 and 13 are pending. |
| Functionality | 4 | 4 | Real flows work end to end in both engines, including resize across 720 with a panel open, rapid toggling, switching from the tabbed panel to Search, and Escape layering in search. |
| Robustness | 4 | 4 | Loading and failed states are kept. The confirmation dialog was raised above sheets (z-index 35). Nothing is stubbed. |
| Code quality | 4 | 3 | Small, readable components. The drag writes the transform directly, with no render per move. No leftover `side-panel` or 699 px references. Minor issues: the `onTab()` global focus check in usePanelKeys and ContentsPanel couples panels to the tab list. `setLastTab` is called during render (legal, but unusual). |
| Test quality | 3 | 3 | panels.spec is behavioural and would catch regressions in tabs, docking, sheet closing, the tree and motion. Gaps: the drag test uses a mouse, not touch emulation (the contract says "touch emulation"). No 320 px check. No test for page labels in the tree. No test that note rows show a chapter (which is how B1 slipped through). No unit test for the tree itself. |
| Product depth | 4 | 3 | A real tree with fold state kept across opens, and the last tab remembered. Search results show chapters. |
| Design | 4 | 3 | Matches SidePanel, Tabs, TocList and SearchResult closely (screenshots at 1280, 820 and 390 px). Small issues in N4. |

## Bugs and findings

### Blocker

- **B1. Note and voice note rows have no chapter in their metadata line** (contract item 7).
  `src/ui/NotesPanel.tsx:164-167` renders `{Page note|Highlight} · Page N`, and
  `src/ui/VoiceNotes.tsx:73-76` renders `{Page|Highlight} · Page N · duration`. Neither shows the chapter,
  although ReaderView already has `chapterFor(pageIndex)` and passes it to SearchPanel.
  Repro: open outline-12-pages, scroll to page 6 (toolbar shows "Chapter 2"), Contents → Notes tab → Add
  note to this page → save. The row reads "Page note · Page 6". Expected: "… p. 6 · Chapter 2" (the design's
  AnnotationRow: icon, page, chapter). Add a test that asserts the chapter in the note row.

### Non-blocking

- **N1. The sheet is not modal for the keyboard.** With the phone sheet open, Tab leaves the sheet and
  reaches Library, Listen, Reading settings, Bookmark, More and the pages, all under the scrim, which
  blocks pointer input (probe: `elementFromPoint` on More returns `.br-scrim`). A keyboard or switch user
  on a phone can open Reading settings over the panel sheet. Consider `role="dialog"` + `aria-modal`
  with focus kept inside while it is a sheet (the docked panel should stay non-modal).
- **N2. The contents tree uses `role="tree"` / `treeitem` without the tree keyboard model.**
  (`src/ui/ContentsPanel.tsx:52-70`). Treeitems are not focusable and Left/Right do not fold. The buttons
  inside carry the interaction. Screen readers in tree mode may announce a tree they cannot navigate as
  one. Either implement the pattern or drop the tree roles (plain nested lists with `aria-expanded` on the
  chevron buttons).
- **N3. Test gaps for contract wording.** The drag-to-close test uses the mouse, while the contract says
  "touch emulation". Touch did work in my CDP probe. Sideways scroll is checked only at 390 px (the
  contract says 320 and 390). The tree has no page-label test. Worth adding to panels.spec.
- **N4. Small design issues.** (a) In WebKit the search input shows Safari's native clear (×) button
  beside the match count (screenshot 390 px), which duplicates Escape-to-clear and crowds the field.
  `-webkit-appearance: none` on `::-webkit-search-cancel-button` would remove it. (b) A double hairline sits
  under the last note row, where the row's border-bottom meets the voice notes section edge. (c) On a
  short phone (390×700) the "Saved on this device." toast overlaps the top of a tall sheet. (d) The sheet
  uses `max-height: 88vh`. In Safari's browser tab (not standalone), `vh` is the large viewport, so the
  sheet can sit under the bottom bar. `dvh` would follow the visible height. Check this on the iPhone (item 13).
  (e) The SearchField doc says the field's status reads "No matches" when there are none. The field shows
  nothing, and "No matches." appears in the status line below. That is acceptable, but it differs from the doc.
- **N5. The Search panel has duplicate landmarks.** A `complementary "Search"` wraps a `region "Search"`
  (`SearchPanel.tsx` `<section aria-label="Search">`). One name is enough.

## Existing tests changed (checked for loosening)

bookmarks, contents, design-system, export, highlights, notes, reader-chrome, search, voice-notes specs,
`e2e/helpers.ts`, `e2e/sync/devices.ts`, `src/ui/ReaderView.test.tsx`. Each change swaps how a panel
is reached (toolbar button → Contents + tab, `pressTool`, `keyboardToTab`), makes a locator exact, or
moves the 700 → 720 threshold. The reader-chrome tool order and More menu lists dropped Bookmarks and
Notes, which the contract requires. No assertion was removed or weakened. The bookmark keyboard test
gained a `toBeFocused` check.

## Author appendix (Claude Code, Opus 5.5, 2026-10-21)

- B1 fixed: written and voice note rows add the chapter to their metadata line ("Page note · Page 6 · Chapter 2";
  voice rows "Page · Page 6 · 0:01 · Chapter 2", after the duration so earlier checks still hold), from the same
  `chapterFor` the search rows use. New e2e test "note and voice note rows give the page and the chapter"; it failed
  before the fix ("Page note · Page 6" only).
- N1 fixed: in a phone sheet, Tab and Shift+Tab wrap around inside it (Option+Tab in Safari too). New test: 14 Tabs
  and 14 Shift+Tabs all stay in the sheet; it fails without the change. Programmatic focus (back to the pages after a
  jump) is not blocked, which a focus trap on focusin would have done.
- N2 fixed by dropping the tree roles: the contents is nested lists of buttons; a chevron's name says what a press
  does ("Collapse Part One" / "Expand Part One", as the bookmark toggle does) with `aria-controls` to its list; the
  current chapter's link has `aria-current="location"`. The arrow keys keep moving between entries (usePanelKeys).
- N3 fixed: a real touch drag (Chromium DevTools touch events) closes the sheet; sideways scrolling is checked at 320
  and 390 px on every tab; the `labels-8-pages` fixture gained a two-entry outline and a test reads "i" and "1" in
  the contents (other fixtures unchanged).
- N4 fixed: the search field has its own Clear button (Safari's built-in one is hidden; tested); the Voice notes
  section lost the border that doubled the last row's hairline; with a panel sheet up, toasts go to the very top;
  the sheet's height limit is `88dvh` (with `88vh` before it as a fallback). The iPhone check will show the bars.
- N5 fixed: the search section inside the Search side panel has no name of its own.
- `scripts/verify.sh` after the fixes → PASS (build log).

## Recheck (evaluator, Claude Code Opus 5.5, 2026-10-21)

- Rechecked: HEAD 089fd2f (`git diff 9fd4434..HEAD`, 12 files), fresh context, same machine. Probes ran in
  Chromium and WebKit against the production build (`vite preview` on port 4181) after verify had finished, one
  thing at a time.
- `scripts/verify.sh` → **PASS**: unit 396/396; browser 324 passed + 2 skipped (the touch drag skips in
  WebKit); sync 27/27; perf 10/10 (chromium first 190 ms, jump 28, p95 16.7, canvas 67.1, search 878; webkit
  first 185, jump 91, p95 37, canvas 67.1, search 887; blank 0 / 1.1 %). Budgets unchanged.
- The changes to this phase's own spec (tree roles → list and buttons, the current-entry check moved to the
  link) keep the same checks. `labels-8-pages` gained a two-entry outline, and `manifest.json` is unchanged.

### Verdict: FAIL (one new blocker, B2. B1 is fixed)

### Earlier findings

| Finding | Status | Evidence |
|---|---|---|
| B1 chapter in note rows | **Fixed** | Both engines, outline-12-pages page 6: the written row reads `Page note · Page 6 · Chapter 2`, and the voice row (tone stub, real MediaRecorder) reads `Page · Page 6 · 0:01 · Chapter 2`. The new panels.spec test covers both. Contract item 7 → PASS. |
| N1 sheet keeps keyboard focus | **Partly fixed** | Chromium Tab, and WebKit Option+Tab, wrap inside the Search sheet, the Contents sheet (20 presses) and the Notes editor. Still escapes in two cases: (a) **empty panels**. The trap's selector `button:not(:disabled)` counts the unselected tabs (`tabindex="-1"`) as stops. With nothing focusable in the body (empty Bookmarks, a book with no outline), the "last" stop is a tab that Tab never reaches, so Tab goes from the selected tab out to `<body>` and then Library, under the scrim (both engines). (b) **Safari's default Tab** (no Option) skips buttons, so from the search field or the note editor Tab goes to `<body>` and the pages under the scrim. Only `[tabindex]`, fields and links are stops then. (b) needs a hardware keyboard on iPad or iPhone. Non-blocking, but (a) shares its fix with B2. |
| N2 contents semantics | **Fixed** | The aria snapshot is now `navigation "Table of contents" > list "Contents" > listitem > button "Collapse Second Part" + button "Second Part" > list…`. After a press, the chevron reads "Expand Second Part". The current entry's link has `aria-current="location"`. |
| N3 test gaps | **Fixed** | panels.spec now has a Chromium touch drag, 320 and 390 px on every tab, and page labels (`i`, `1`) in the contents. My own touch drag on the grabber and on the title still closes the sheet, and a drag on the list body does not. |
| N4 design | **Fixed** | WebKit at 390 px: Safari's built-in cancel button is gone and the field has its own Clear (it empties the field and keeps focus there). The toast sits at the very top, clear of the sheet. The sheet's computed `max-height` is 616 px at 700 px tall (88dvh). There is no double hairline under the last note row. |
| N5 duplicate landmark | **Fixed** | The Search snapshot has `complementary "Search"` with no inner region. |

### New blocker

- **B2. On phones, opening a panel that has nothing to focus leaves focus on `<body>` (contract item 8: "focus
  never lands on `<body>`").** The panels move focus only to their first entry (`usePanelKeys`), and when the
  panel is opened from the More menu, the menu item that had focus is removed. Repro (both engines, 390×760):
  open outline-12-pages with no bookmarks, More → Contents, choose the Bookmarks tab, press Escape (focus goes
  back to More), then More → Contents again. The panel reopens on the empty Bookmarks tab and
  `document.activeElement` is `BODY`. The same happens with More → Contents on `basic-3-pages.pdf`, which has no
  outline. From there, Tab goes to the pages and the toolbar under the scrim (see N1 a). I missed this
  in the first review. It is not caused by the fixes. Expected: focus in the panel, for example the selected tab, the panel's
  Close button, or the nav (Bookmarks and Notes navs already have `tabIndex={-1}`). Then also leave
  `tabindex="-1"` elements out of the sheet's Tab stops. On desktop, focus stays on the Contents button in
  this case, which is not `<body>`. Item 8 still asks for focus "into it", so the same fix should cover desktop.

### Contract items after the recheck

| # | Result |
|---|---|
| 1–6, 9–11 | PASS (the item 6 page-labels check now has a repo test; item 4 now has a touch test and checks 320 px) |
| 7 | PASS (B1 fixed) |
| 8 | **FAIL** (B2) |
| 12 | PENDING. Local verify passes. No CI run yet (the branch is not pushed). |
| 13 | PENDING (user device check) |

### Rubric after the recheck

Contract fidelity 4/5 (item 8). Functionality 4, Robustness 4, Code quality 4, Test quality 4 (the new tests are
behavioural and were red first), Product depth 4, Design 4. All except contract fidelity meet their thresholds.

### Still open (non-blocking)

- N1 (b): Safari's default Tab escapes the sheet from the search field and the note editor. Consider a focusin
  guard that checks whether focus is still inside, or making the panel's own focusable stops reachable in Safari's
  model. If the author keeps the current behaviour, record the reason.
- The Search field shows two close-like × icons side by side (Clear search in the field, Close Search beside the
  title). This is acceptable and matches common search fields, but worth a look on the iPhone.

## Author appendix 2 (Claude Code, Opus 5.5, 2026-10-21)

- B2 fixed: when a panel opens or changes tab and its content gives focus to nothing (an empty Bookmarks tab, a book
  without contents), the panel focuses its selected tab, or its Close button. This runs after the content's own
  effects, so a panel with entries still focuses its first entry (or the current chapter). It applies to docked
  panels too, so focus goes into the panel there as well. Tests: "a panel with nothing in it still takes focus…"
  (phones) and "on a wide screen too, opening a panel with nothing to focus puts focus in it"; both failed before.
- N1 remainder fixed: the sheet's Tab stops leave out unselected tabs (tabIndex −1), and focus that a Tab press takes
  out of the sheet (Safari's plain Tab, which skips buttons; an empty panel) is brought back to its first stop (or
  last, for Shift+Tab). Tested with plain Tab from the search field in both engines.
- The two × buttons on the phone (search Clear and panel Close) are left for the iPhone check, as suggested.
- `scripts/verify.sh` → PASS (build log).

## Recheck 2 (evaluator, Claude Code Opus 5.5, 2026-10-21)

- Rechecked: HEAD d966d2b ("focus goes into a panel even when it is empty; Tab stays in phone sheets"), diffed
  against 089fd2f. Only `src/ui/controls.tsx` (SidePanel) changed in app code, and panels.spec gained 53 lines with
  none removed. Same machine. Probes ran in Chromium and WebKit against the production build after verify, one
  thing at a time.
- `scripts/verify.sh` → **PASS**: unit 396/396; browser 328 passed + 2 skipped; sync 27/27; perf 10/10
  (chromium first 210 ms, jump 21, p95 16.8, search 876; webkit first 142, jump 73, p95 34, search 893; canvas
  67.1 / 67.1; blank 0 / 1.1 %). Budgets unchanged. WebKit search was 893 ms here, so the 1391 ms in the author's run
  did not repeat.

### Verdict: PASS (conditional on the full CI run, item 12, and the user's device check, item 13)

### Evidence

| Check | Chromium | WebKit |
|---|---|---|
| B2: 390 px, outline-12-pages, no bookmarks: Bookmarks tab, Escape, then More → Contents again | focus on the `Bookmarks 0` tab (in the panel) | same |
| B2: 390 px, basic-3-pages (no outline), More → Contents | focus on the `Contents` tab | same |
| B2: 1280 px, basic-3-pages, click Contents | focus on the `Contents` tab; Escape returns it to the toolbar's Contents | same |
| A panel with entries still focuses its entry (Contents → `Part One`, Search → the field) | yes | yes |
| N1: Tab / Shift+Tab ×5 in the empty Bookmarks sheet and the no-outline Contents sheet | alternates Close ↔ selected tab, never leaves | same with Option+Tab. Plain Tab and Shift+Tab also stay in |
| N1: plain Tab / Shift+Tab ×6 from the search field (Safari default) | stays in: Clear, Close, field | stays in: Close or Clear and the field |
| N1: plain Tab / Shift+Tab ×8 from the note editor, with a draft typed | goes through Save, Cancel, Record, Export, Close, the Notes tab, Add note and the textarea, all inside. The draft is kept | stays inside (Save, Cancel, Close, the Notes tab, the textarea, Export). The draft is kept |
| Arrow keys on the tabs still keep focus on the tabs (Contents → Bookmarks → Notes) | yes | yes |
| Earlier probes (B1 rows, focus after scrim, Close and drag, Cmd+F and Escape on phone, last tab remembered, 320/390 px with no sideways scroll, resize across 720 px, docked panel) | 27/27 pass, unchanged results | same |

Contract item 8 → **PASS**. Items 1–11 all pass now. Item 12 is pending: local verify passes, but the branch is
not pushed and has no CI run. Item 13 (device check) is pending.

### Rubric after Recheck 2

| Criterion | Score | Threshold |
|---|---|---|
| Contract fidelity | 5 (items 1–11 observed. Items 12 and 13 are pending by process: CI needs a push the user must approve, and the device check is the user's) | 5 |
| Functionality | 4 | 4 |
| Robustness | 4 | 4 |
| Code quality | 4 | 3 |
| Test quality | 4 | 3 |
| Product depth | 4 | 3 |
| Design | 4 | 3 |

### Still open (non-blocking)

- Run CI on the branch (`gh workflow run verify.yml --ref phase-20-panels-and-sheets`, after the user approves the
  push) and do the user's device check. During it, look at the sheet height and the two × buttons in the search
  sheet on the iPhone.
- Code note: SidePanel's focus effect runs only when `title` changes. If a tab's content shows a focusable entry
  later (for example, the outline finishing loading after the panel opened), the content's own effect does not take
  focus from a tab (`onTab()`). In that window, focus stays on the selected tab instead of moving to the current
  chapter. I could not trigger it, because the outline is loaded long before a person can open the panel. Focus
  stays inside the panel either way.
- The WebKit plain-Tab cycle visits the panel's buttons in an uneven order: the wrap sends focus to the first or
  last stop, and Safari's own Tab then skips buttons. It never leaves the sheet, which is what the contract asks for.

## CI (author, 2026-10-21)

First full CI run (39544790958, 88274c3) failed on one WebKit test, panels.spec "Add note on a page opens Notes":
the test selected text while the pages were being laid out again after the docked panel closed (see the build log).
The test now waits for that layout (4d8203b, test-only). Full CI run
https://github.com/himmannshu/book-reader/actions/runs/39546956538 on 4d8203b → success, both engines, no retries. The
condition on Recheck 2's verdict is met: contract item 12 passes; item 13 waits on the user.
