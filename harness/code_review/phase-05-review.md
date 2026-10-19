# Phase 05 review: Bookmarks

- Reviewer: Claude Code (Opus 5.5), evaluator subagent, fresh context
- Date: 2026-10-19
- Commit reviewed: d6b5517 (branch phase-05-bookmarks, not pushed)
- Inputs: AGENTS.md, harness/EVALUATOR.md, the phase file and the contract. I read the diff, the
  build log and features.json only after I had planned my own checks.

## How I tested

- `scripts/verify.sh` → lint, format, typecheck, unit (8 files, 91 passed), browser (82 passed,
  Chromium + WebKit), perf (8 passed: chromium first page 170 ms, jump 17 ms, p95 16.7 ms; webkit
  first page 153 ms, jump 52 ms, p95 32 ms; canvas 67.1 MB) → `--- PASS`, exit 0.
- I served the production build with `vite preview --port 4199` and drove it with Playwright scripts
  kept in the session scratchpad (outside the repo), in Chromium and WebKit, against the repo fixtures:
  labels at page 1, 2 and 12; double and triple clicks on the toggle (UI compared against the
  `bookmarks` object store); importing an already-stored file again through Open PDF; switching books
  with the panel open; storage unavailable (`IDBFactory.open` throws SecurityError); the book removed
  in a second tab and then bookmarked in the first; Escape after clicking the panel heading; a 600 px
  and a 320 px window; a window resize; the `strips-40-pages` fixture; tall narrow windows
  (420x1150, 480x1300, 700x1400) with `outline-12-pages`; a hand-built v1 database (books + bookFiles
  only) opened by the v2 app; keyboard Space/Enter on the toggle.
- I ran mutation checks on a `git archive HEAD` copy in the scratchpad, never in the repo. Each one
  ran all unit tests plus Chromium e2e for bookmarks, contents and library. See Test quality.

## Contract items

| # | Result | What I ran and saw |
|---|---|---|
| 1 | **FAIL** | verify e2e passes (one page on screen at a time). Probe: when two or more pages fit fully in the reader, pressing "Bookmark page" with page N at the top often marks a later page. Both browsers, `outline-12-pages` at 420x1150: page 3 at the top (offset -0.19 px) → stored page 4; page 5 → 6; page 8 → 9; page 10 → 11. At 480x1300: page 2 at the top (offset +0.05 px, not cut at all) → stored page 3. `strips-40-pages` at 1280x900: page 6 at the top (offset +0.91 px) → "Page 8". By the contract's own definition, these are ties (each page is fully visible), and ties go to the earlier page. See B1. |
| 2 | **FAIL** | Same root cause (B1). Chromium, `strips-40-pages`: bookmark page 21, scroll to the top, choose "Page 21" in the panel. Page 21 lands at -0.38 px and the toggle shows `aria-pressed="false"`. Pressing it would bookmark page 22. In the single-page-on-screen e2e case it works, and I confirmed it after a resize (current page 3 → pressed). |
| 3 | PASS | verify e2e. Probe: jumps to page 1, 10 and 12 (last page) land 0–1 px from the top and are drawn, in both browsers. A narrow-window jump closes the panel and focuses the pages. (The toggle state after a jump is wrong in the B1 case; I count that under item 2.) |
| 4 | PASS | verify e2e (added 9, 2, 12, 5 → listed in page order). Probe: also after a reload. Note M4: nothing tests the order after a reload (see T2). |
| 5 | PASS | verify e2e. Probe: also when the stored file is imported again through Open PDF instead of the Library (the list comes back). Switching to another book and back shows each book's own list. |
| 6 | PASS | verify e2e. Probe: double click on the toggle → one bookmark in the UI and in the DB; triple click → UI and DB agree; after a reload the list matches the DB. |
| 7 | PASS | verify e2e (object store count 1 → 0). Probe: removing the book in tab B and then bookmarking in tab A shows "This book is no longer stored on this device, so its bookmarks can't be changed." and leaves no orphan record. |
| 8 | PASS | verify e2e with basic-3-pages: "No bookmarks yet." then "Page 2". |
| 9 | PASS | Unit: ReaderView tests cover the unsaved reason (`title` and panel text), the quota message and an unreadable list. Probe with IndexedDB throwing: the toggle is disabled with `title="Bookmarks need this book saved on this device."`, the panel shows the same text, and the App alert explains the browser mode. Caveat N2: the reason is only a tooltip on the toggle itself. |
| 10 | PASS | verify e2e. Probe: Escape after a mouse click on the panel heading closes the panel (document-level listener). 600 px: the panel is 320 px wide at x=0 over the pages, closes after a choice, and the pages get focus. Space and Enter on the focused toggle add and remove, and focus stays on it. |
| 11 | PASS | `npx vitest run`: currentPageAt, label/id/sort and the v1→v2 upgrade are unit-tested. Probe: a real v1 database (built by hand in both browsers) upgrades to v2 with all three stores, the v1 book opens, and its new bookmark survives a reload. But the currentPageAt tests use only whole-pixel layouts, and the "tie" test is not a tie (T1). |
| 12 | PASS | perf inside verify: 8/8, first page 170/153 ms. Bookmarks are listed in an effect after the viewer starts. |
| 13 | **NOT MET** | Local `scripts/verify.sh` → PASS. CI has not run: `git branch -r` has no phase-05 branch. Pushing needs the user's OK. |
| 14 | **NOT MET** (pending user) | The build log has no user report on a real book. |

## Rubric

| Criterion | Score | Threshold | Notes |
|---|---|---|---|
| Contract fidelity | 2 | 5 | Items 1 and 2 fail when two pages fit on screen (B1). Items 13 and 14 have no evidence. |
| Functionality | 3 | 4 | Persistence, removal, cascade on book removal, re-import, switching books, private mode and the other-tab case all work. But the core action, "bookmark the page I'm on", marks the wrong page in tall narrow windows (Mac split view, iPad split view) and in any book with short pages. It does this silently, and the label carries the wrong page's chapter. |
| Robustness | 4 | 4 | Storage failures map to readable messages (quota, not-found, unavailable). An unreadable list shows a panel message and is logged. A failed outline only costs the chapter name. No console errors or warnings in any probe. Rapid clicks keep the UI and the DB consistent. |
| Code quality | 4 | 3 | Clean split: pure model in src/core, a v2 store behind the interface, a shared `usePanelKeys`, and the doc-lifetime fix in App keyed on the document. Nits: `Viewer.currentPage` (viewer.ts:114) is used only by a unit test, and the comment at ReaderView.tsx:240 says "Clicks wait instead", but clicks during a save are dropped (`if (changing) return`). |
| Test quality | 3 | 3 | Mutations caught: no cascade delete (1 unit + 1 e2e fail), no sort on add (1 e2e), bookId change not refetched (1 unit + 11 e2e), no title reason (1 unit), removal not reflected (2 e2e), no chapter in label (4 unit + 8 e2e), no error message (1 unit), no focus return on Escape (2 e2e), no refocus after removal (1 e2e). Survived: ties going to the later page (M1, 0 fails, because the tie test is not a tie), and no sort in `bookmarks.list` (M4, 0 fails; IDB returns `id` order, so "x:11" would come before "x:2" after a reload). No test has more than one page fully on screen, which is why B1 got through. |
| Product depth | 3 | 3 | Real bookmarks: per-page toggle that follows scrolling, chapter-aware names, persistence, cascade delete, keyboard, narrow overlay. |
| Design | 3 | 3 | Screenshots at 1280, 600 and 320 px: the panel matches the Contents panel, and the pressed toggle is filled while unpressed is outlined. The label doesn't change when pressed, and the list doesn't mark the current page. At 320 px the toggle overflows the right edge by about 2 px (x 225.8 + width 96.6). |

**Verdict: FAIL.** Contract fidelity (2 < 5) and Functionality (3 < 4) are below their thresholds
because of B1. Items 13 (CI) and 14 (user check) are also open.

## Bugs and findings

**B1 (high). The current page is decided by floating-point noise when more than one page is fully
visible.** src/viewer/layout.ts:174-175.
`shown = Math.min(page.top + page.height, viewBottom) - Math.max(page.top, scrollTop)` gives
slightly different values for pages that are all fully visible (fractional `top`/`height`), and
`shown > bestShown` then picks whichever one rounded highest. The scroller's integer `scrollTop` also
cuts the top page by a fraction of a pixel, so it loses a tie it should win.
Reproduce (both browsers, production build):
1. Window 420x1150. Import `tests/fixtures/outline-12-pages.pdf`.
2. Scroll so page 3 is at the top of the reader (the page top is within 0.2 px of the reader top).
3. Press "Bookmark page". Open Bookmarks: it lists "Page 4 · Chapter 2", not "Page 3 · Chapter 1".
Also: `strips-40-pages.pdf` at 1280x900, page 6 at the top (+0.91 px) → "Page 8". And in Chromium,
choosing a "Page 21" bookmark leaves the toggle unpressed. A standalone run of `currentPageAt` with
each page placed exactly at the top (letter pages, 808 px viewport, container widths 320–1400) got
the wrong page in 74 of 32,430 cases, and with landscape slides at 1300 px, 1,752 of 32,430.
Expected: among fully visible pages, the topmost one wins, and a sub-pixel cut at the top doesn't
lose it the tie. For example, compare with a tolerance (`shown > bestShown + 0.5`) or round `shown`
to whole CSS pixels. Add a unit test with a fractional layout and several pages on screen, and an e2e
test with strips-40-pages or a tall narrow viewport.

**T1 (test). The "gives a tie to the earlier page" test is not a tie.** src/viewer/layout.test.ts:186.
Viewport [70, 170]: page 0 shows 50 px, but page 1 spans [130, 230] and shows 40 px. Changing `>` to
`>=` at layout.ts:175 passes every test (M1).

**T2 (test). Nothing checks `bookmarks.list` ordering.** src/storage/indexeddb-book-store.ts:205.
Removing `sortByPage` passes every test (M4). Without it, IndexedDB returns the `bookId:pageIndex`
string order, so after a reload page 12 would be listed before page 2. Add a storage unit test with
pages 2 and 12, or reload in the item-4 e2e test.

**N1 (low). Misleading comment.** src/ui/ReaderView.tsx:240 says "Clicks wait instead". Clicks made
during a save are dropped by `if (bookId === null || !items || changing) return;`. The behavior is fine
(UI and DB stay consistent). The comment is wrong.

**N2 (low). The disabled reason is a tooltip only.** ReaderView.tsx:242 sets `title` on a disabled
button. On iPhone and iPad there is no hover, so the reason appears only if the reader opens the
Bookmarks panel (which does show it). This meets item 9 as written. Consider visible helper text.

**N3 (low). Dead getter.** `Viewer.currentPage` (src/viewer/viewer.ts:114) is used only by
viewer.test.ts. The UI uses `onPageChange`.

**N4 (cosmetic). 320 px overflow.** The "Bookmark page" button extends about 2 px past the right edge at
320 px wide.

**Process note.** harness/features.json marks F-006 `passing`. Its evidence is the e2e suite, which
passes, but B1 means the feature does not work in all layouts. Items 13 and 14 are also open.
