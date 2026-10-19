# Phase 04 review: Table of contents (re-review after fixes)

- Reviewer: Claude Code (Opus 5.5), evaluator subagent, fresh context
- Date: 2026-10-19
- Commit reviewed: 0d6d5bb (branch phase-04-table-of-contents, not pushed)
- Previous review: FAIL at 468595a. The full text is in git at b6adb81
  (`git show b6adb81:harness/code_review/phase-04-review.md`). Its findings were: B1, Contents
  stuck on "Loading contents…" after opening another book; B2, Escape ignored when no entry has
  focus; B3, focus left on the entry after a wide-layout jump; T1/T2, missing tests for lazy loading
  and for B1 and B2.
- Inputs: AGENTS.md, harness/EVALUATOR.md, the phase file and the contract. I read the diff, the
  build log and the handoff only after I had planned my own checks.

## How I tested

- `scripts/verify.sh` → lint, format, typecheck, unit (7 files, 62 passed), browser (56 passed,
  chromium and webkit), perf (8 passed: chromium first page 171 ms, jump 28 ms, p95 16.8 ms; webkit
  first page 140 ms, jump 47 ms, p95 30 ms; canvas 67.1 MB) → `--- PASS`.
- I served the production build with `vite preview --port 4199` and drove it with Playwright scripts
  kept outside the repo (session scratchpad), in Chromium and WebKit. I used the repo fixtures plus
  probe PDFs that I generated with pdf-lib:
  - mixed-200: 4 levels of nesting, a GoTo-action entry, a numeric-page destination, a URI entry, a
    130-character title, a named destination to the last page, an explicit last-page entry, an
    out-of-range numeric destination, and an untitled entry
  - all-broken: a URI entry, a missing named destination and an out-of-range page
  - many-600: 300 entries
  - garbage-outline: `/Outlines 42`, which is not a dictionary
  - cycle-outline: entries whose `/Next` links form a loop
- I ran mutation checks on a `git archive HEAD` copy in the scratchpad, never in the repo. Each one
  ran Chromium e2e for contents.spec.ts plus all unit tests. See Test quality.

## Contract items

| # | Result | What I ran and saw |
|---|---|---|
| 1 | PASS | verify e2e in both browsers. Probe: I read the outline-12 tree back as Part One > [Chapter 1, Chapter 2], Part Two > [Chapter 3, Missing section (disabled)], Appendix. mixed-200 kept its 4 levels and its order. many-600 listed all 300 entries, and the panel scrolls (`overflow: auto`). |
| 2 | PASS | verify e2e. Probe, both browsers: I jumped to every enabled outline-12 entry (pages 0, 1, 4, 7, 8, 11). Each time the target slot was 0–1 px from the reader top, `rendered`, and the only slot at the top. I re-jumped after scrolling back to the top, and jumped to the same entry twice: still 0–1 px. mixed-200: GoTo → page 50, numeric → 59, Sub A1.1.1 → 12, untitled → 3, last page → 199, all at the top and drawn. many-600: Chapter 300 → page 599, drawn, 2 canvases. |
| 3 | PASS | verify e2e. Probe: Chapter 3 (named "chapter-3") → page 8. mixed-200 "Named to last page" (Names tree) → page 199. Both browsers. |
| 4 | PASS | verify e2e. Probe: "Missing section", "Web link", "Out of range numeric" and all three all-broken entries are disabled. No alert, no dialog, no console errors or warnings. |
| 5 | PASS | verify e2e. Probe: basic-3-pages and garbage-outline both show "This book has no table of contents." with no buttons and no error. cycle-outline lists A and B once each, with no hang. |
| 6 | PASS | verify e2e in both browsers, including the new test "Escape closes Contents even when no entry has focus". Probe, both browsers: all-broken, focus Contents → Enter → focus stays on Contents → Escape → panel closed, `aria-expanded="false"`, focus on Contents (this was B2 before). After a jump in the wide layout, focus is on the pages, and Escape closes the panel and focuses Contents. many-600: End → Chapter 300 → Enter → page 599. One gap remains, outside the keyboard-only flow this item describes: see N1. |
| 7 | PASS | verify e2e. Probe at 600 px: the panel is 320 px wide at x=0 over a 600 px reader, the reader width is unchanged, and after a choice the panel is closed with focus on the pages. At 320 px the panel is 272 px wide. |
| 8 | PASS | `npx vitest run`: outline.test.ts (10 tests) covers explicit ref, numeric page, named, missing name, unresolvable ref, out of range, web link, nesting, blank title and null outline. |
| 9 | PASS | perf inside verify: 8 passed, first page 171/140 ms. Laziness is now guarded by src/ui/ReaderView.test.tsx: an eager `doc.outline()` at mount fails it (M4 below). |
| 10 | **NOT MET** | Local `scripts/verify.sh` → PASS. CI has not run: `git branch -r` has no phase-04 branch. Pushing needs the user's OK. |
| 11 | **NOT MET** (pending user) | The build log has no user report on a real book yet. |

## Rubric

| Criterion | Score | Threshold | Notes |
|---|---|---|---|
| Contract fidelity | 4 | 5 | Items 1–9 pass when exercised in both browsers. Items 10 (CI) and 11 (user check on a real book) have no evidence. Neither can be closed without the user. |
| Functionality | 4 | 4 | Every jump I tried landed exactly, including GoTo actions, numeric and named destinations, the last page of 200- and 600-page books, and repeated jumps. B1 is fixed: switching books in any order with the panel open (outline → outline, outline → none, none → outline) closes the panel, and reopening shows the new book. Opening from the Library and then Contents also works. The remaining gap (N1) has a one-click workaround. |
| Robustness | 4 | 4 | Garbage and cyclic outlines degrade to the empty state or a correct list, with no errors. Broken entries are disabled, not errors. A rejected `outline()` shows a readable message and logs to the console. No console errors or warnings in any probe. |
| Code quality | 4 | 3 | The fix is the right one: a per-book `key` instead of hand-written resets. The Escape handling moved to a single place. `resolveOutline` is pure and tested. Small nits: the comment at ReaderView.tsx:59 ("wherever focus is: in the panel, on the button, or in the pages") is accurate but leaves out the body-focus case (N1). `loaded.doc === doc` is now redundant with the key, though harmless. |
| Test quality | 4 | 3 | Mutations: no key per book → 1 e2e fail; Escape only in the panel → 2 fail; no focus on the pages after a choice → 1 fail; eager outline at mount → 1 unit fail; reloading the outline on every open → 1 unit fail; no focus return on Escape → 1 fail; off-by-one page in scrollToPage → 5 e2e + 2 unit fail; narrow panel not closing → 1 fail. Survived: the "failed" message replaced with the empty-state text (0 fails). The failed state is untested (T1). |
| Product depth | 3 | 3 | A real outline: nesting, named and GoTo destinations, numeric pages, lazy loading, arrow/Home/End navigation for Safari, and a narrow overlay. |
| Design | 3 | 3 | Screenshots at 1280 and 600 px: the panel matches the app palette, indentation shows nesting clearly, disabled entries are muted and italic, long titles wrap, and the narrow overlay has a shadow. The separate Contents bar costs about 44 px of height. |

**Verdict: FAIL**, only because contract fidelity is 4/5: items 10 (CI) and 11 (the user's real-book
check) are open. I found no code defect that blocks the phase. Every other criterion meets its
threshold. Once the branch is pushed with the user's OK, CI is green and the user reports item 11,
the phase meets the contract without code changes. Fixing N1 is recommended but not required.

## Bugs and findings

**N1 (medium, not a contract failure). Escape does nothing when focus is on `<body>`.**
src/ui/ReaderView.tsx:59-66 and 68. The handler is on the `.reader` div, so it only fires when focus
is inside the reader. Focus lands on `<body>` after common mouse actions:
- WebKit (Safari does not focus buttons on click): open basic-3-pages.pdf, click Contents with the
  mouse, press Escape. The panel stays open (`activeElement` is BODY). The same happens with an
  all-disabled outline, or while the panel shows "Loading contents…".
- Both browsers: with the panel open, click the "CONTENTS" heading, the note text, or a disabled
  entry, then press Escape. The panel stays open.
- Both browsers: focus the Library button in the header, then press Escape. The panel stays open.

Expected: Escape closes an open panel no matter where focus is. A
`keydown` listener on `document` while the panel is open would cover these cases. The keyboard-only
flow in item 6 works, so I count this as a functionality gap, not a contract failure.

**T1 (test gap, low).** Nothing tests the "This book's table of contents couldn't be read." state.
Replacing that text with the empty-state text passes every test. A ReaderView unit test with a fake
doc whose `outline()` rejects would cover it.

**O1 (pre-existing, not phase 04).** At a 320 px viewport the page scrolls sideways by 5 px. The
cause is `p.notice` ("Saved on this device.", right edge at 325 px), with or without the panel. It
comes from the header, not from this phase's code.

**H1 (process).** harness/features.json has F-005 `failing`, with evidence from the old review. That
is correct until the author re-runs the checks and records the fixes. The author should update the
evidence to cite this review, and only mark it passing per AGENTS.md.

## What is solid

- The fixes address the root causes, not the symptoms. Keying ReaderView by a per-open id
  (App.tsx:113, 211) gives each book a fresh Viewer, panel state and outline cache. Focusing the
  pages after a choice fixes Space and PageDown (Space moved 3447 → 4115 px in both browsers).
- In the wide layout, opening the panel re-fits the pages and keeps the reading position (page 300
  stays mid-screen in many-600).
- Jump accuracy was 0–1 px in every case, in both browsers.
- No console errors, warnings, alerts or dialogs in any probe run.
