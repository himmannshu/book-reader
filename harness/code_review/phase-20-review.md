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
