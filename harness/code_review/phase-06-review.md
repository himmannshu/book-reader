# Phase 06 review: Highlights

- Reviewer: Claude Code (Opus 5.5), evaluator subagent, fresh context
- Date: 2026-10-19
- Commit reviewed: 9547db8 (branch phase-06-highlights, not pushed)
- Inputs: AGENTS.md, harness/EVALUATOR.md, the phase file and the contract. I read the diff, the
  build log and features.json only after I had planned my own checks.

## How I tested

- `scripts/verify.sh` → lint, format, typecheck, unit (10 files, 122 passed), browser (110 passed,
  Chromium + WebKit), perf (8 passed: chromium first page 173 ms, jump 19 ms, p95 16.7 ms; webkit
  first page 189 ms, jump 83 ms, p95 39 ms; canvas 67.1 MB) → `--- PASS`, exit 0.
  Two more `npm run test:perf` runs, nothing else running: webkit p95 37 and 36 ms (budget 40), chromium
  first page 220 and 179 ms (budget 250).
- I served the production build (`vite preview --port 4199`) and drove it with Playwright scripts kept
  in the session scratchpad (outside the repo), in Chromium and WebKit:
  - A real, text-heavy PDF that is not the user's (macOS's own
    /Library/Documentation/License.lpdf/.../English.lproj/License.pdf, copied to the scratchpad):
    a mouse drag over four lines of a justified paragraph, which contains a split "fi" ligature.
  - The `text-4-pages` fixture: a mouse drag across the page break; the same line highlighted at window
    widths 1280, 900, 700, 480, 360 and 320; a double click on Highlight; selecting text and then
    resizing, scrolling away or opening a panel; Escape and Tab; select-all.
  - Touch: WebKit with the `iPhone 13` and `iPad (gen 7)` profiles, and Chromium with `Pixel 7`.
    I tapped Highlight, the highlight and Remove highlight.
  - A real v2 database. I built the `main` branch (DB v2) in a scratchpad copy, imported a book and
    bookmarked it in a persistent profile, then opened the phase-06 build with the same profile.
- I ran mutation checks on a `git archive HEAD` copy in the scratchpad, never in the repo. Each one
  ran all unit tests plus Chromium e2e for highlights, bookmarks and library (see Test quality).

## Contract items

| # | Result | What I ran and saw |
|---|---|---|
| 1 | **FAIL** (touch) | Desktop: verify e2e passes, and on License.pdf a 4-line drag gave boxes within 1.1 px of the selection rects in both browsers (the screenshot looks exact). Touch, in WebKit (the engine iPhone and iPad use), iPhone 13 and iPad profiles: tapping "Highlight" does nothing. No click event fires and no record is stored. See B1. Chromium with touch (Pixel 7) works. |
| 2 | PASS | verify e2e (mouse drag). Probe: a drag on License.pdf over 4 justified lines → one record with 4 rects and the right quote (the ligature reads "files"). |
| 3 | PASS | verify e2e (programmatic range). Probe: a real mouse drag from "India nine" on page 1 to the end of "Juliet ten" on page 2 → one record, rects on pages 0 and 1, quote "…page one and Juliet ten…", in both browsers. |
| 4 | PASS | verify e2e (1280 → 700). The width sweep below also lines up. |
| 5 | PASS | verify e2e. Probe: it also survives a v2→v3 upgrade with a real database (see item 11). |
| 6 | PASS | verify e2e. Probe: the same line highlighted at 6 widths (1280 down to 320) stores x 71.96–71.97, y 240.29–240.75, width 333.49–333.8, height 13.98–14.01 in both browsers. The fixture says x 72, width 331.91. |
| 7 | **FAIL** (touch) | Desktop: verify e2e passes. Probe: scrolling hides the Remove offer. Touch, in WebKit (iPhone and iPad profiles): tapping a highlight shows "Remove highlight", but tapping it does nothing (the record stays and the button stays up). Same cause as B1. Separately, B2 can leave a duplicate under the removed one, so the highlight looks like it wasn't removed. |
| 8 | PASS | verify e2e. Mutation M3 (no cascade for highlights) is caught by 1 unit and 1 e2e test. |
| 9 | PASS | verify e2e + SelectionActions unit tests. Probe: with select-all in WebKit (393 chars, toolbar included) no button appears. The unsaved reason shows as visible text at 320 px. But see B3: a stale Highlight button can stay up after its selection is gone, and pressing it does nothing silently. |
| 10 | PASS | verify e2e. Probe (Chromium): Tab from the pages focuses Highlight, and Escape hides it and returns focus to the pages. WebKit's default Tab order skips buttons, as Safari does, so there you need Option+Tab or a click. That's expected. |
| 11 | PASS | `npx vitest run`: the core/highlights, store and viewer tests cover everything listed. Probe: a real v2 database (made by the main build) upgrades to v3 in both browsers. The bookmark is kept, and a new highlight saves. |
| 12 | PASS (thin) | perf inside verify plus two more runs: all within budget. WebKit p95 frame time is now 36–39 ms against a budget of 40 (phase 05 review: 32 ms). Note that text layers wait for a 200 ms scroll pause, so the steady-scroll benchmark never measures text-layer cost. |
| 13 | **NOT MET** | Local `scripts/verify.sh` → PASS. CI has not run: `git branch -r` has no phase-06 branch. Pushing needs the user's OK. |
| 14 | **NOT MET** (pending user) | The build log has no user report. Given B1, the iPhone/iPad part of this check would most likely fail. |

## Rubric

| Criterion | Score | Threshold | Notes |
|---|---|---|---|
| Contract fidelity | 2 | 5 | Items 1 and 7 fail for touch input in WebKit (B1). Items 13 and 14 have no evidence. |
| Functionality | 3 | 4 | On desktop, the core flows are solid: real-PDF multi-line drags, cross-page drags, any width, reload, the v2→v3 upgrade, removal, the cascade, the unsaved mode. But on iPhone and iPad, which GOALS/AGENTS name as targets, neither Highlight nor Remove can be pressed (B1). A double click on Highlight stores the highlight twice (B2). |
| Robustness | 3 | 4 | Failed saves and unreadable lists give readable messages, and there are no console errors in any probe. But there are silent no-ops: the stale button (B3), pressing Highlight before the list has loaded returns without a word (N1), and touch presses vanish (B1). |
| Code quality | 4 | 3 | Clean layering: the pure model in src/core, PDF.js only in src/engine, a shared per-book store and shared error messages, viewer text work kept off the scroll path. The selection fix is attributed to PDF.js. Nits are listed below. |
| Test quality | 4 | 3 | 21 mutations; every one but M10 was caught in Chromium, and M10 was caught in WebKit (by design). Caught: no line merge, no space join, no cascade, no clipping, oldest-wins, no pointerdown preventDefault, char-rect height, no whitespace check, no Escape dismiss, top computed from width, remove not persisted, v3 upgrade skipped, no reason text, selection kept, any-page hit test, no error message, pageIndex from the last rect. Gaps: no touch test (B1 got through), and SelectionActions.test.tsx asserts the very preventDefault that causes B1. No test presses a button twice (B2). |
| Product depth | 4 | 3 | Real highlights: a text layer, PDF-point anchors with quotes, cross-page, persistence, removal, keyboard. |
| Design | 3 | 3 | The floating button and note match the app's buttons, and highlights use multiply blending, so text stays crisp. At 320 px the unsaved note reaches the right edge (N3). |

**Verdict: FAIL.** Contract fidelity (2 < 5), Functionality (3 < 4) and Robustness (3 < 4) are below
their thresholds, mainly because of B1. Items 13 (CI) and 14 (user check) are also open.

## Bugs and findings

**B1 (high). On touch devices in WebKit (iPhone, iPad), tapping "Highlight" or "Remove highlight"
does nothing.** src/ui/SelectionActions.tsx:31 (`onPointerDown={keepSelection}`, which calls
`preventDefault`). For a touch pointer, WebKit treats a cancelled pointerdown like a cancelled
touchstart and fires no click. I recorded the events: `pointerdown | touchstart | pointerup | touchend`,
then no mousedown, mouseup or click. When I stopped that pointerdown from reaching React's handler
(a capture listener in the page), the same tap fired `click` and saved the highlight.
Reproduce: a Playwright WebKit context with `devices['iPhone 13']` (or `iPad (gen 7)`), production
build, import text-4-pages.pdf, select "Bravo two" (as a range), `tap()` the Highlight button → 0
records. Then add a highlight with a mouse click, tap the highlight → "Remove highlight" appears, tap it
→ the record stays. Chromium with `Pixel 7` works. Caveat: this is Playwright's WebKit touch
emulation, not a physical device, so it needs confirming on a real iPhone or iPad (item 14). But it is
WebKit's own pointer-event code path. Expected: tap works. For example, only prevent the default for
`pointerType === 'mouse'`, or rely on `onMouseDown` plus the `offeredRange` copy that already handles
Safari clearing the selection. Add an e2e project or test with `hasTouch` in WebKit. Note that
SelectionActions.test.tsx currently requires the pointerdown preventDefault.

**B2 (medium). A double click (or fast double tap) on Highlight stores the highlight twice.**
src/ui/useHighlights.ts:143-170: nothing guards against a second press while `store.put` is
pending. The selection is cleared only after the await, so the second click finds it again.
Reproduce (Chromium, consistent; WebKit, when the selection was made by double-clicking a word):
select "Alpha" → `dblclick()` on Highlight → 2 records in `highlights`. Then click the highlight →
Remove → 1 record and 1 box are left, so to the reader the remove seems to have failed. Expected: one
highlight. Ignore presses while saving (as the bookmark toggle does), or skip a highlight identical to
one just saved.

**B3 (low-medium). The Highlight button stays up after its selection is gone, and pressing it does
nothing.** src/ui/useHighlights.ts:111-136, src/viewer/viewer.ts `#releaseText`. A resize (or iPad
rotation, or opening a side panel at a width that relayouts) removes and rebuilds the text layer. The
selection collapses without a `selectionchange` event (0 events seen), so `follow()` never runs. I
also saw this after scrolling the page out of the render range (the button was then off screen).
Reproduce (both browsers): select "Bravo two" → button shown → resize the window 1280 → 800 → the
selection is collapsed and the button is still at y≈458. Press it → it disappears, nothing is stored,
and no message shows. Expected: the button hides when its selection is gone. For example, re-check
after the viewer rebuilds text (a callback from `#releaseText`/`#relayout`), or hide on resize.

**N1 (low). Pressing Highlight before the list has loaded is a silent no-op.**
src/ui/useHighlights.ts:145 `if (bookId === null || !items || !range) return;`. While `store.list` is
pending, `unavailableReason` is null, so the button is enabled. The window is short, so I found this by
reading the code and did not reproduce it.

**N2 (low). Thin perf headroom on WebKit.** p95 frame time is 36–39 ms against 40, up from 32 ms in
phase 05. And because text layers are built only after a 200 ms pause, the benchmark doesn't exercise
them. A future change could easily tip this over.

**N3 (cosmetic).** At 320 px the "Highlights need this book saved on this device." note reaches the
right edge. `BUTTON_WIDTH = 170` (useHighlights.ts:13) is used for clamping, but the note is up to
240 px wide (app.css `.selection-note`).

**N4 (nit).** useHighlights.ts imports from '../core/highlights' twice (lines 2 and 3).

**Process note.** harness/features.json marks F-007 `passing`. Its e2e evidence is real, but B1 means
the feature doesn't work on the touch devices the project targets. Items 13 and 14 are also open.

## Correction verification (Codex, 2026-10-19)

Written by the author of the corrections; this does not replace the independent review above or
issue a new evaluator verdict. The user authorized addressing B1–B3. The contract is unchanged.

| Finding | Correction and observed result |
|---|---|
| B1 | Removed pointerdown cancellation, retained mousedown selection protection and the saved range. All four iPhone/iPad WebKit touch checks failed before the fix. Eight checks now pass across Chromium + WebKit: tap Highlight, tap Remove, and persistence after reopening. Physical-device confirmation still pending. |
| B2 | Added a synchronous pending-save guard, released in finally. Two immediate activations stored two records before the fix in both browsers. They now store one; one removal leaves nothing after reopening. A simulated quota failure can be retried successfully. |
| B3 | While offering Highlight, observe text removal and capture original range endpoint nodes. Clear the action/range on disconnection or collapse; return action-button focus to the reader. All eight regressions failed before the fix and now pass: resize, focused resize, panel relayout, page eviction, both browsers, with selectionchange suppressed. A fresh highlight works afterward in the same reader. |

Final `scripts/verify.sh`: PASS (122 unit, 130 browser, 8 perf). WebKit p95 31 ms (budget 40),
first page 216 ms, jump 50 ms; Chromium p95 16.8 ms, first page 174 ms, jump 24 ms. Canvas 67.1 MB.
The observer exists only while a create offer is visible; idle scrolling adds no observer/layout work.
An existing viewer test's fixed 5 ms wait failed during verification; it now waits for its actual result.
N4's duplicate import is consolidated. N1–N3 remain open. F-007 is passing again on local evidence.
Contract item 13 still needs CI after an authorized push; item 14 needs the real-book/device user check.
