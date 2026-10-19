# Phase 04 review: Table of contents

- Reviewer: Claude Code (Opus 5.5), evaluator subagent, fresh context
- Date: 2026-10-19
- Commit reviewed: 468595a (branch phase-04-table-of-contents, not pushed)
- Inputs: AGENTS.md, harness/EVALUATOR.md, harness/build/phase-04-table-of-contents.md,
  harness/contracts/phase-04-contract.md. I read the diff, build log and context file only after
  planning my own checks.

## How I tested

- `scripts/verify.sh` → lint, format, typecheck, unit (61 passed), browser (50 passed, chromium and
  webkit), perf (8 passed; chromium first page 174 ms, webkit 155 ms, webkit p95 32 ms) → `--- PASS`.
- Production build served with `vite preview --port 4199`. I drove it with Playwright scripts kept
  outside the repo, in Chromium and WebKit, using the repo fixtures plus probe PDFs I generated with
  pdf-lib:
  - mixed-200: 4 levels of nesting, a GoTo-action entry, a numeric-page destination, a URI entry,
    a 130-character title, and an entry for the last page
  - all-broken: every entry is a URI or out-of-range
  - many-600: 300 entries
- Mutation checks ran on a scratch copy of HEAD (not the repo), Chromium e2e for contents.spec.ts
  plus the unit tests. See Test quality.

## Contract items

| # | Result | What I ran and saw |
|---|---|---|
| 1 | PASS | verify e2e passes in both browsers. Probe: the outline-12 tree read back as Part One > [Chapter 1, Chapter 2], Part Two > [Chapter 3, Missing section (disabled)], Appendix. mixed-200 kept 4 levels of nesting in order. |
| 2 | PASS | verify e2e. Probe, both browsers: I jumped to every enabled outline-12 entry, including the last page (Appendix) and the same entry again after scrolling away. Each time the target slot was at 0–1 px from the reader top, `rendered`, and the only page visible. mixed-200: GoTo action → 50, numeric dest → 60, last page → 199, all at the top and drawn. many-600: Chapter 300 → page 598, drawn, 3 canvases. |
| 3 | PASS | verify e2e. Probe: Chapter 3 (named "chapter-3") → page index 8 at the top, drawn, in both browsers. |
| 4 | PASS | verify e2e. Probe: "Missing section", "Website link" (URI) and the all-broken PDF's entries are all disabled. No alert, no console errors or warnings. |
| 5 | PASS | verify e2e. Probe: basic-3-pages shows "This book has no table of contents." and no buttons, in both browsers. |
| 6 | **FAIL** | The e2e path works: Enter opens, arrows/Home/End/Enter work, Escape closes and focus returns. But when the panel has no enabled entry, Escape does nothing. Keyboard repro on basic-3-pages, both browsers: focus Contents → Enter → panel opens and focus stays on Contents → Escape → panel still open, `aria-expanded="true"`. The same happens on the all-broken PDF, while the panel says "Loading contents…", and whenever focus is in the pages. See B2. |
| 7 | PASS | verify e2e. Probe at 600 px: the panel is 320 px wide over a 600 px reader, the reader width is unchanged, and the panel closes after a choice with focus on the reader. PageDown then scrolls the book. At 320 px the panel is 272 px wide. |
| 8 | PASS | `npx vitest run` → outline.test.ts covers explicit ref, numeric page, named destination, missing name, unresolvable ref, out of range, web link, nesting, blank title and null outline. |
| 9 | PASS | `npm run test:perf` (inside verify) → 8 passed, first page 174/155 ms. Laziness itself is not tested: see T1. |
| 10 | **NOT MET** | Local `scripts/verify.sh` → PASS. CI has not run: the branch is not pushed (`git branch -r` has no phase-04 branch). |
| 11 | **NOT MET** (pending user) | No user report in the build log yet. This is expected at this stage, but the item is open. |

## Rubric

| Criterion | Score | Threshold | Notes |
|---|---|---|---|
| Contract fidelity | 3 | 5 | Item 6 fails for panels without an enabled entry (B2). Items 10 (CI) and 11 (user) have no evidence yet. |
| Functionality | 3 | 4 | Jumping is accurate in every case I tried, in both browsers. But a core flow breaks: if you open another book while Contents is open, the panel says "Loading contents…" forever (B1). You can reach this from the always-visible Open PDF button. |
| Robustness | 3 | 4 | Outline mapping never throws, and broken entries degrade well. B1 is a silent failure: there is no error, nothing logged, and a spinner text that never resolves. |
| Code quality | 3 | 3 | Clean engine/UI split, a pure and tested `resolveOutline`, and comments that explain why. Hidden coupling: ReaderView keeps per-book outline state keyed by hand (`loaded.doc === doc`), but `contentsOpen` is not reset per book, and loading only starts from a click handler. That gap is the root cause of B1. Escape is bound to the `nav` only (B2). |
| Test quality | 3 | 3 | Mutations caught: children dropped (6 e2e + 1 unit), named dest ignored (4 e2e + 1 unit), off-by-one page (4 e2e), no focus return (1), narrow panel not closing (1), `scrollToPage` without `#update` (unit). Not caught: eager outline load at mount (0 failures, T1). Untested: switching books with the panel open, and Escape on an empty or loading panel. |
| Product depth | 3 | 3 | A real outline (nesting, named and GoTo destinations, numeric pages), lazy loading, keyboard navigation for Safari, and a narrow overlay. |
| Design | 3 | 3 | The panel matches the app palette. Disabled entries are muted and italic. Long titles wrap cleanly. The narrow overlay has a shadow. The Contents button sits in its own bar, which costs some vertical space, but it works. |

**Verdict: FAIL** (contract fidelity, functionality and robustness are below threshold).

## Bugs and findings

**B1 (high). Opening another book while Contents is open leaves the panel on "Loading contents…" forever.**
src/ui/ReaderView.tsx:15-18 and 33-45. ReaderView is not keyed by `doc` (src/ui/App.tsx:207), so
`contentsOpen` stays `true` when the doc changes. `outline` falls back to `{status:'loading'}`
because `loaded.doc !== doc`, but the outline is only requested inside `openContents()` (a click
handler), so it is never requested for the new book.
Repro (Chromium and WebKit, production build): open outline-12-pages.pdf → Contents (entries
appear) → Open PDF → choose any other PDF (with or without an outline) → wait 8 s. The panel reads
"CONTENTS / Loading contents…", with no console output. Closing and reopening Contents fixes it.
Expected: the panel shows the new book's outline (or its empty state), or it closes when the book
changes. A click on Contents while a new book is still opening also ends up in this state.

**B2 (medium). Escape does not close the panel when no entry has focus.**
src/ui/ContentsPanel.tsx:54-59 and 83-88. The Escape handler is on the `nav`, so it only fires if
focus is inside the panel. Focus only moves into the panel when there is an enabled entry
(ContentsPanel.tsx:47-50).
Repro (both browsers): open basic-3-pages.pdf, focus Contents, press Enter. "This book has no
table of contents." appears and focus stays on Contents. Press Escape: the panel stays open with
`aria-expanded="true"`. The same thing happens with an outline where every entry is disabled,
while the panel is loading, and with focus in the pages after a click (wide layout).
Expected (contract item 6): Escape closes the panel and returns focus to Contents.

**B3 (low). In the wide layout, focus stays on the chosen entry after a jump.** Space or Enter
re-triggers the same jump instead of scrolling the book. PageDown does nothing until the user clicks
the pages. This is not in the contract. It is noted for the keyboard flow.

**T1 (test gap). Nothing checks that the outline loads lazily.** Item 9's rationale is that the
outline loads only when Contents opens. Adding `void doc.outline()` to ReaderView's mount effect
passes every e2e, unit and (by construction) perf test, because the perf fixture has no outline. A
unit test with a spy `outline()` on a fake doc, asserting no call before Contents is clicked, would
cover it.

**T2 (test gap).** There are no tests for B1 (switching books with the panel open) or B2 (Escape on
an empty or loading panel).

**H1 (process).** harness/features.json marks F-005 `passing`, but the phase still has items 10
and 11 open. The F-005 description itself is met by the e2e evidence, so this is only a note.

## What is solid

- Destination resolution handles PDF.js shapes correctly: ref, number, named, and GoTo actions
  (PDF.js converts these to `dest`). Out-of-range and URL entries become disabled, not errors.
- `Viewer.scrollToPage` reuses the anchor math. Jump accuracy was 0–1 px in every case, including
  the last page of a 200-page book.
- In the wide layout the reader re-fits when the panel opens and keeps the current page in view
  (page 298 before and after, width 1280 → 980).
- No console errors or warnings in any probe run, in either browser.
