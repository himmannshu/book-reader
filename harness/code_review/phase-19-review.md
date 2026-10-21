# Phase 19 review: Reader chrome

- Reviewer: Claude Code (Opus 5.5), evaluator subagent, fresh context. 2026-10-20.
- Reviewed: branch `phase-19-reader-chrome` at 0d6bddc, diffed against its base `mac-webkit-baseline`
  (13988a3): `git diff 13988a3..HEAD` (46 files, +2239 / -606).
- Machine: 8-core Apple Mac, macOS, quiet (nothing else running during the perf run).
- Reviewer scratch work (not in the repo): exploratory Playwright specs against the production build
  (`vite preview` on port 4185), and a `git archive` copy of 13988a3 for A/B suite runs.

## Verdict: FAIL

One confirmed functional blocker (B1: on a 320 px phone the "Sign in to sync" badge covers the
Library button, so you cannot leave the book), and one contract item whose wording the code does not
meet (B2: focus after a click outside Reading settings). Everything else is solid. Speed budgets
pass unchanged in both engines, and the toolbar, Reading settings and page pill work well when
exercised. Both blockers are small to fix.

## Commands run

| Command | Result |
|---|---|
| `scripts/verify.sh` | **FAIL** at browser tests: 284 passed, 1 skipped, 1 failed: chromium `voice-notes.spec.ts:59` ("The voice note couldn't be recorded"). Lint, format, types and unit tests (391) passed. Sync and perf did not run because verify stops at the first failure. |
| `npx playwright test e2e/voice-notes.spec.ts --project=chromium --repeat-each=5` | 25/25 pass. It fails under load and passes alone, as the build log already says. |
| Full browser suite (`npx playwright test`), branch, run twice more | Each run had 1 failure, a different test each time: webkit `design.spec.ts:84` (zoomed reopen, page not rendered in time), then webkit `library-view.spec.ts:160` (100 books within 1 s). Both pass alone (5/5 and 10/10). |
| Full browser suite, baseline 13988a3 (scratch copy), run twice | 251/251 pass both times. |
| `npm run test:perf` (alone) | 10/10 pass. chromium: first 190 ms, jump 19, p95 16.7, canvas 67.1 MB, blank 0. webkit: first 147, jump 78, p95 31, canvas 67.1, blank 1.1. `e2e/perf/budgets.json` is unchanged in the diff. |
| `gh run list --branch phase-19-reader-chrome` / `git ls-remote` | The branch has not been pushed and there is no CI run yet. |
| Reviewer exploratory specs (Chromium and WebKit, 70 cases) | Details below. |

## Contract items

| # | Result | Evidence |
|---|---|---|
| 1 | PASS | `reader-chrome.spec` order test passed in both engines. Manually: after clicking, Contents shows `is-pressed` and aria-expanded. The bookmark is `is-pressed` with the name "Remove bookmark". Every button's `title` equals its `aria-label` (the only exception is the unsaved-book reason). Screenshot at 1280 px: Library, Contents, Bookmarks, Notes, then the centred title and chapter, then Search, Listen, Aa, Bookmark. |
| 2 | PASS | The spec passed. Manually: jumping to Chapter 3 from Contents changed the chapter line to "Chapter 3" in both engines. Long titles truncate. 820 px has no overflow. |
| 3 | **FAIL (B1)** | With sync idle or synced it works: at 320 and 390 the toolbar is Library, title, Listen, Aa, Bookmark, More. The More menu holds Contents, Bookmarks, Notes and Search. Every control is at least 44 px, there is no sideways scroll, and Escape returns focus to More. **But at 320 px with the signed-out badge, the badge is drawn over the Library button.** `elementFromPoint` at Library's centre hits the badge's SVG, and tapping there does not open the library. This reproduced in both engines. The book title also collapses to 0 px at 320 whenever any badge shows. |
| 4 | PASS | The spec passed. Manually: Page Down in the pages fades the toolbar, and Shift+Tab (Alt+Shift+Tab in WebKit) brings it back. A tap where the faded toolbar was brings it back and does not activate the button underneath (`pointer-events: none`). It stays visible while the highlight menu, the More menu, the phone search bar or the player is open, and fading works again after the player stops. Under reduced motion, `transition-duration` is 0. |
| 5 | PASS | The spec passed. Manually: zoom out from Width (110%) goes 100, 90, 75, 67, 50, 25 (disabled at 25), and zoom in goes 50 … 400 (disabled at 400). Fit Page shows 66%, and Zoom in then switches to Custom at 67%. Dark applies to `html[data-theme]` and to the page filter, and is kept after a reload. Highlights stay aligned at 50%, 200% and fit page (`highlights.spec.ts:431`, which now goes through Reading settings) in the verify run. |
| 6 | **FAIL (B2, wording)** | Escape closes it and focus returns to Aa. With a panel also open, Escape closes Reading settings first and leaves the panel open. A click outside closes it. **After a click outside, focus does not return to the button.** A click on the toolbar title leaves focus on `<body>`, and a click on the pages focuses the pages. The code chooses this on purpose (`onDismiss={() => closeSettings(false)}`, ReaderView.tsx). The spec's test is titled "closes with Escape or a click outside, and focus goes back to its button", but it only checks focus after Escape. Narrow screens: the bottom sheet is flush to the left, right and bottom edges at 390 and 320, with no overflow. |
| 7 | PASS | The spec and the unit tests passed. Manually: a Contents jump shows the pill ("Page 9 of 12 · 75%"), and it hides about 1.3 s later in both engines. Page labels: "Page i of 5" (spec). |
| 8 | PASS (untested in the suite, N3) | Open PDF is only in the library (spec). I stubbed `/api/sync`: 401 shows "Sign in to sync", 500 shows "Sync failed", offline shows "Offline", and 200 (synced) shows no badge, at 320, 390 and 1280 in both engines. |
| 9 | PASS | `comfort.spec` themes test (canvas, Sepia tint, Dark filter, no light flash) and `design-system.spec` "on the page" passed in the verify run. |
| 10 | PASS, with one weakened check (N2) | I read every changed test against 13988a3. The renames are mechanical: the bookmark's aria-pressed became checks on its name and its `is-pressed` class, combobox values became the Reading settings helpers, `book-info` became `book-title` plus the page count. The notes guard lost its "open a file from the reader" step because that path no longer exists. `library-view.spec.ts:253` was weakened (N2). |
| 11 | PASS | Perf run above. The budgets file is unchanged. |
| 12 | **FAIL / PENDING** | My `scripts/verify.sh` run failed (load flake, see N1). The author's run 6 passed. There is no CI run on the branch. |
| 13 | PENDING (user) | Mac, iPad and iPhone device check. |

## Rubric

| Criterion | Score | Threshold | Notes |
|---|---|---|---|
| Contract fidelity | 3 | 5 | Item 3 fails (B1) and item 6 does not meet its wording (B2). 12 and 13 are pending. |
| Functionality | 3 | 4 | The main flows are good. B1 traps a signed-out iPhone SE reader in the book. |
| Robustness | 4 | 4 | Page-label errors are logged and fall back to numbers. No swallowed errors. Load flakiness is higher than the baseline's (N1). |
| Code quality | 4 | 3 | The components are clear and follow the design sources. Old CSS was removed. Nit: a `tool-label` class with no CSS is left on the library's Open PDF. |
| Test quality | 3 | 3 | Good new spec. Gaps: no test of the reader's sync badge, no test of focus after a click outside, and no test that menu, highlight menu, search bar or player hold the toolbar (item 4 lists them). |
| Product depth | 4 | 3 | Real fit modes, PDF page labels, an announced pill. |
| Design | 4 | 3 | Matches the design sources well (screenshots at 1280, 820, 390 and 320, light and dark). B1 is a layout break in one state. |

## Findings

### Blockers

**B1. At 320 px the "Sign in to sync" badge covers the Library button (contract item 3).**

- Where: `src/ui/app.css`, `.br-toolbar__lead, .br-toolbar__trail { min-width: 0 }` together with
  `.br-toolbar__trail { justify-content: flex-end }` and `.br-toolbar.is-compact { grid-template-columns: auto 1fr auto }`.
  The trail is wider than its track, so it overflows to the left, over the title and the Library button.
- How to reproduce:
  1. Route `/api/sync` to return 401, with service workers blocked.
  2. Set a 320 × 700 viewport and open `outline-12-pages.pdf`.
  3. The badge box is x = 17.6 to 124. Library is 8 to 52.
  4. `document.elementFromPoint` at Library's centre returns the badge's icon, and tapping there does not open the library. This happens in Chromium and WebKit.
- At 320, "Sync failed" (x = 36) and "Storage full" also overlap Library's edge, and the title is 0 px wide whenever a badge shows.
- 320 px is a width the contract tests, and signed-out is a real state (an expired Access session).
- Expected: Library always reachable. For example, an icon-only badge on compact screens, or a trail that keeps its minimum width while the title gives way.
- Add an e2e check that covers a badge state.

**B2. Reading settings does not return focus to its button after a click outside (contract item 6).**

- The contract says it "closes with Escape or a click outside and returns focus to its button".
  Escape does this. A click outside does not, by design (`closeSettings(false)`). A click on a
  non-focusable spot (the title, the header) leaves focus on `<body>`.
- The spec's test title claims focus returns after both, but it only asserts it after Escape.
- Two ways to resolve it:
  - Return focus to Aa when the click lands on nothing focusable, and keep the clicked target's focus otherwise (returning focus on every click would take it away from the pages). Then assert this in the test.
  - Or the user agrees to the light-dismiss behaviour, and that is appended as a contract amendment and the test is renamed.

### Non-blocking

- **N1. Full-suite flakiness is up on this branch.**
  - Branch: 3 of 3 full browser runs had exactly one failure, a different load-sensitive test each time (voice-notes chromium, design zoomed-reopen webkit, library 100-books webkit).
  - Baseline 13988a3: 2 of 2 runs were clean on the same quiet machine.
  - Each failing test passes when run alone, so this is not a functional regression. The branch adds 34 tests and does more work per open (outline and page labels after the first page, and the toolbar's backdrop blur).
  - Watch it in the CI run. If it persists, consider fewer workers or hardening those three tests.
- **N2. `e2e/library-view.spec.ts:253` was weakened.**
  - It used to require 0 covers drawn while a book is open.
  - It now allows up to 1 cover, measured after the second book has rendered, so a cover drawn while the second book is open would still pass.
  - Tighter: measure the cover count right after returning to the library (before opening the second book), then require no change once the second book is open.
- **N3. Item 8's badge has no automated test.**
  - `SyncStatusLine.test.tsx` has no `compact` cases, and no e2e test looks at `.br-badge`.
  - Add unit cases: offline, failed, signed-out and storage full show a badge; synced, syncing and uploading do not.
- **N4. The zoom buttons drop keyboard focus at the limits.** At 25% or 400% the pressed button becomes `disabled`, and focus falls to `<body>` inside the open dialog. This happened in both engines. The repo already avoids this for the bookmark toggle (aria-disabled plus ignoring the click).
- **N5. The screen-reader page announcement is stale on reopen.** `settledPage` starts at 0, so after reopening a book at page 3 the hidden live region says "Page 1 of 300 · 0%" while the pill says "Page 3 of 300 · 1%", until the first scroll settles. Seed it from the viewer's first page change.
- **N6. A 1% zoom step.** From Fit Page (66%), Zoom in goes to 67%, which looks like nothing happened. Consider skipping levels within about 3% of the current zoom.
- **N7. The "Saved on this device." toast is drawn over the bottom sheet's Fit row at 320 px.** It goes away when the toast fades. Cosmetic.
- **N8. Leftover `tool-label` class.** `src/ui/App.tsx:533` keeps `className="tool-label"`, but no CSS rule for it remains.

## What was done well

- The toolbar fade adds no per-frame work. The wheel and touch listeners are removed while the toolbar is faded, and the perf budgets confirm it.
- The outline and page labels now load after the first page is drawn. There is a viewer unit test for this, and first-page time stayed at 190 ms in Chromium.
- SegmentedControl is a proper radio group: roving tabindex, arrow keys that wrap, and a swatch that previews each theme's paper.

## Author appendix (Claude Code, Opus 5.5, 2026-10-20)

- B1 fixed. The toolbar's lead and trail no longer shrink (`min-width: 0` removed), so only the title gives way;
  in the compact toolbar the badge shows its icon only (the words stay in its tooltip and the polite live
  region). At 320 px with the signed-out badge the element at Library's centre is Library and tapping it opens
  the library; the title keeps 29 px. New e2e test ("on a 320 px phone the badge leaves the Library button free
  to tap") fails with the fix taken out and passes with it.
- B2 fixed, to the contract's wording. After a click outside, focus stays where the click put it when that takes
  focus (the pages), and goes back to the Aa button when it does not (the title): checked once the browser has
  handled the click. The spec now checks both (title click → Aa focused; pages click → pages focused).
- N1 noted. The branch adds 44 browser tests (251 → 295), so the full run is longer under the same load; each
  flaky test passes alone and none is phase-19 code. Watch in CI.
- N2 fixed, stricter than before. A recorder logs every write to the covers store with its book and time: no
  cover may be written once the next book shows, and none ever for the book being opened (only the closing
  book's, by the phase 11 design). Mutation check: letting the cover worker run while reading makes it fail.
- N3 fixed. e2e tests stub `/api/sync` (service worker blocked): 404 shows no badge, 401 "Sign in to sync",
  500 "Sync failed", plus the 320 px test above. Item 4's holds also got a test: the highlight menu and the
  More menu keep the toolbar (mutation check: dropping the highlight menu from the hold makes it fail).
- N4 fixed: the zoom buttons use aria-disabled at the ends and ignore the press; a test keeps focus on Zoom out
  at 25 %.
- N5 fixed: the announced page starts at the page the book opens at, and while the pages are still it is the
  current page. The test reads the announcement once, as soon as the reopened page is drawn (it read "Page 1"
  before the fix).
- N6 fixed: stepping skips a level within 2 % of the zoom shown (66.4 % → 75 %); unit test added, the existing
  half-a-percent cases still pass.
- N7 fixed: on phones, with the Reading settings sheet up, toasts show under the toolbar (toast bottom 112 px,
  sheet top 406 px at 320 × 700).
- N8 fixed: the class is gone from the library's Open PDF label.
- `scripts/verify.sh` after the fixes → PASS (see build log).

## Recheck (evaluator, Claude Code Opus 5.5, 2026-10-20, HEAD 7a039dc)

I reran everything against a fresh production build of 7a039dc. I ran the software one thing at a
time, with no perf run in parallel. I read the diff `0d6bddc..7a039dc`; it touches only the files
listed in the author appendix. I wrote no app code.

### Verdict: PASS (conditional on the full CI run, item 12; item 13 is the user's device check)

### Blockers

- **B1: fixed.** My original reproduction (routed `/api/sync`, service workers blocked, 320 and 390 px,
  Chromium and WebKit) for 401, 500 and offline gives the same result in every case:
  - There are no overlaps between any toolbar buttons or the badge, nothing sits outside the bar, and nothing scrolls sideways.
  - The title keeps 29 px at 320 and 99 px at 390.
  - The element at Library's centre is Library, and tapping it opens the library.
  - On compact screens the badge shows its icon only. The full words are in its `title` and in the polite live region.
  - The new spec test ("on a 320 px phone the badge leaves the Library button free to tap") checks the hit target, the title width and sideways scrolling.
- **B2: fixed, to the contract's wording.** Each result was the same in Chromium and WebKit:

  | Action | Where focus goes |
  |---|---|
  | Mouse click on the title | Reading settings button |
  | Mouse click on the pages | pages (Page Down then still scrolls them) |
  | Mouse click near the bottom of the pages | pages |
  | Escape | Reading settings button |
  | Click on Contents while settings is open | settings closes, the panel opens, focus stays in the panel |
  | iPhone 13 emulation, tap on the title (WebKit) | Reading settings button |
  | iPhone 13 emulation, tap on the pages (WebKit) | pages |

  The spec now asserts both the title and the pages cases.

### Non-blocking items

| Item | Status | What I saw |
|---|---|---|
| N1 | Watch in CI | My verify at 7a039dc passed on the first try (below). The earlier pattern was one load flake per full run, each test passing alone. One clean run doesn't disprove that. |
| N2 | Fixed, stricter than the original | The test logs every `covers` store `put` with its book and time. It requires no writes after the next book shows, and none for that book at all. |
| N3 | Fixed (e2e) | 404 gives no badge, 401 "Sign in to sync", 500 "Sync failed", plus the 320 px test. There are still no `compact` unit cases in `SyncStatusLine.test.tsx`, but the e2e checks are enough. The new hold test covers the highlight menu and the More menu. |
| N4 | Fixed | Zoom out pressed repeatedly with Enter stops at 25% with `aria-disabled="true"`, focus stays on Zoom out, and one more Enter changes nothing. |
| N5 | Fixed | `settledPageIndex` is the current page while the pages are still, and starts from the saved position. The spec checks "Page 3 of 4" at once after a reopen. |
| N6 | Fixed | 2% relative step tolerance: 66.4% steps to 75%, 65% still steps to 67%. The unit test passes. |
| N7 | Fixed | iPhone 13 emulation with the sheet up: the toast is at y 60–112, the sheet starts at y 370. |
| N8 | Fixed | The `tool-label` class is gone from the library's Open PDF label. |

### Test artifacts I hit (not app bugs)

- Clicking Aa right after Page Down waits forever, because the faded toolbar has `pointer-events: none` until you tap the page. This is intended.
- Playwright's `click()` waits on an `aria-disabled` button, because it treats it as disabled. Pressing Enter shows the app correctly ignores the press.

### New minor note

**R1:** on phones the badge is an icon only, and iOS shows no tooltips. A sighted iPhone reader sees an alert or offline icon without words. Screen readers still get the words. The full sync line, with Retry, is in the library. This is acceptable for this phase. Phase 20 could make the badge tappable to say what it means.

### Item 12

`scripts/verify.sh` at 7a039dc on this machine: **PASS** (exit 0).

| Step | Result |
|---|---|
| Lint, format, types | pass |
| Unit | 392 passed |
| Browser | 295 passed, 1 skipped |
| Sync | 27 passed |
| Perf | 10 passed |

| Perf metric | Chromium | WebKit |
|---|---|---|
| firstPageMs | 186 | 144 |
| jumpMs | 32 | 67 |
| p95FrameMs | 16.8 | 31 |
| maxCanvasMB | 67.1 | 67.1 |
| blankFramePct | 0 | 1 |

`budgets.json` is unchanged. Item 12 passes locally. Its CI half is still **PENDING**: the branch is
not pushed and has no `verify.yml` run. If that run is red, this verdict becomes FAIL.

### Updated contract results

- Items 1–11: PASS. Item 3 and item 6 were the two that failed before; both now pass.
- Item 12: local PASS, CI PENDING.
- Item 13: PENDING (user).

### Updated rubric

| Criterion | Score | Threshold | Notes |
|---|---|---|---|
| Contract fidelity | 5 | 5 | Items 1–11 pass; 12 depends on CI; 13 is the user's check. |
| Functionality | 4 | 4 | |
| Robustness | 4 | 4 | |
| Code quality | 4 | 3 | |
| Test quality | 4 | 3 | The new tests were mutation-checked by the author, and I confirmed the B1 and B2 cases independently. |
| Product depth | 4 | 3 | |
| Design | 4 | 3 | |

## CI (author, 2026-10-20)

The condition on the recheck verdict is met: full CI run
https://github.com/himmannshu/book-reader/actions/runs/39533163830 on c240000 → success (chromium and webkit jobs,
no retries). Contract item 12 passes; item 13 waits on the user.
