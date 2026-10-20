# Phase 13 review: Search inside a book

- Reviewer: Claude Code (Opus 5.5, evaluator subagent, fresh context), 2026-10-20
- Branch: phase-13-search-in-book at d26f02d, worktree /home/user/book-reader-p13
- Stacked on phase-12-export-annotations at e061768, reviewed in
  /home/user/book-reader-p12/harness/code_review/phase-12-review.md
- Inputs: harness/contracts/phase-13-contract.md, harness/build/phase-13-search-in-book.md,
  harness/EVALUATOR.md, diff origin/phase-12-export-annotations...HEAD

## Verdict: FAIL

The only blocker in phase 13's own work is contract item 7: the full CI run on the branch is red.
The failing test is phase 12's WebKit download name test, which this branch inherits, so CI perf
never ran either. Search itself worked in every probe: matches across text items and line breaks,
accents and case, marks that line up exactly at every zoom from 90% to 175%,
Next/Previous/Enter, Cmd/Ctrl+F, cancelling, the 1000-result cap, a book with no text, and
scrolling while a search runs. The branch also carries phase 12's blocker B1 (the escape bug in
export.ts) until it is fixed there and merged in.

## Environment (cloud container)

- Node 24 via `source /opt/nvm/nvm.sh && nvm use 24`. The worktree has its own node_modules.
- Playwright: `PLAYWRIGHT_BROWSERS_PATH=$HOME/pw-browsers`, Chromium projects only. WebKit is
  covered only by full CI.
- `scripts/verify.sh` runs WebKit, so I ran its steps one by one with Chromium only: lint,
  format, typecheck, unit, e2e `--project=chromium`, sync `--project=sync-chromium`.
- "Chromium reports the app as installable" fails for environment reasons.
- Perf is noisy and slower than the Mac budgets. I compared before and after only, alternating
  phase 12 and phase 13 three times on an idle machine (load average under 2). No budgets were
  changed.
- Probes ran from a scratch directory outside the repo against `vite preview` on port 4173. They
  used a generated 8-page PDF (pdf-lib, Helvetica) built for this review, and the repo's
  heavy-600-v1, text-4-pages and no-text-1-page fixtures. The generated PDF has:
  - a word drawn as two text items ("Hel" + "lo")
  - accents (Café crème déjà vu, NAÏVE façade, Straße)
  - a phrase split across a line break ("quick" / "brown")
  - a hyphenated word ("exam-" / "ple")
  - "target" three times on one line, and again on page 8
  - five pages with 1000 copies of "the"
  - an empty page

## Contract items

| # | Result | Evidence |
|---|---|---|
| 1 | PASS | e2e search.spec 4/4. Unit 331/331. Probe (each query gives 1 match unless noted): `hello`, `HELLO WORLD` (across two text items), `cafe creme`, `déjà`, `naive`, `FACADE`, `quick brown` (across a line break) and `zebra stripe` (wide gap). `target` gives 4 matches on 2 pages. `strasse` and `example` (hyphenated) give no match; see N3. |
| 2 | PASS | Probe: after choosing "target" #3, the current mark's left and top equal the text-layer range for "target three" (640,302), and its width is that of one "target". I checked at fit-width, 125, 150, 175, 150, 125, 110, 100 and 90%; the mark matched the words at every step (0 px off). The split-item "Hello" mark equals the words' rect (446,232,47×23). The current mark for "quick brown" has 2 boxes, one on each line. Choosing the page-8 result after zooming scrolls it into view. |
| 3 | PASS | e2e, plus a probe with 1002 results: Previous with nothing chosen goes to "1000 of 1000", and Next wraps to "1 of 1000". Enter after the results arrive goes to the next match. |
| 4 | PASS | e2e. Probe: Ctrl+F while the panel is open and focus is on the pages puts focus back in the box. Ctrl+F while a note draft is unsaved shows "Discard changes?", and discarding opens Search with focus in the box. Clearing the box removes all marks. One letter shows "Type at least 2 letters." and no marks. no-text-1-page shows "No matches.". |
| 5 | PASS (test gap) | `PdfDoc.pageText` calls `getTextContent` in the PDF.js worker (src/engine/pdfjs-engine.ts:125). Results stream in: the heavy book showed "Searching… 0 of 600 pages" while it ran. Cancelling: I started "page" on the heavy book and immediately entered a new query. The final state was the new query's result, and 3 s later no stale results had appeared. The same query run again uses the page-text cache: 1000+ results in 260 ms. There is no unit test for useSearch (cancelling, the cap, the failed state), although the contract says "code + unit". |
| 6 | PASS (local) | searchMs is report-only, as designed: 2122, 2587 and 2125 ms (samples 2.08 to 2.68 s). Existing metrics, p12 vs p13 alternating. firstPageMs: 397/395/431 vs 383/412/441. jumpMs: 29/39/47 vs 41/47/43. p95FrameMs: 33.3/33.3/16.8 vs 33.3/16.8/33.3. maxCanvasMB 67.1 for both. blankFramePct 0 for both. That is within noise. Scrolling during a search (heavy book, 2000 px/s, search panel open both times): p95 16.8 vs 16.7 ms, max 16.8 ms, 181 frames, so no degradation. Main-thread JS heap went from 7 to 13 MB after a full cold search (the worker heap was not measured). The budgets themselves cannot pass on this machine; the baseline fails them too. CI perf did not run (item 7). |
| 7 | **FAIL** | Chromium stand-in verify is green apart from the environment failure: e2e 114 passed + 1 env failure, sync 15/15. **Full CI, run 39387033790 (https://github.com/himmannshu/book-reader/actions/runs/39387033790) at d26f02d: failure.** The failing test is `[webkit] e2e/export.spec.ts:40`, the download name with underscores, inherited from phase 12. 228 tests passed. Perf was never reached. |
| 8 | PENDING (user) | A real book on Mac and iPhone, and a searchMs budget. |

## Rubric

| Criterion | Score | Threshold | Notes |
|---|---|---|---|
| Contract fidelity | 4 | 5 | Every behavior item passes. Item 7 (CI) is red. |
| Functionality | 4 | 4 | Accurate marks, live results, cancelling, and the narrow-screen panel closes after a choice. |
| Robustness | 4 | 4 | Has a failed state with a readable message, and checks for a destroyed document. See N2 and N3. |
| Code quality | 4 | 3 | Clear split between core folding, the engine, the viewer marks and the hook. One shared `findMatches` keeps list and marks in step. |
| Test quality | 3 | 3 | The e2e tests check the 2 px alignment and the wrap. useSearch has no unit test, and the benchmark does not check its own query (N1). |
| Product depth | 4 | 3 | Snippets, progress, a page-text cache, Cmd/Ctrl+F. |
| Design | 4 | 3 | The panel matches the others. The current result and the current mark are clearly distinct (screenshots at desktop and 390 px). |

## Blockers

B1. Full CI is red on the branch (run 39387033790). It fails on phase 12's WebKit download name
test. Merge phase 12's fix (f09e4e5, local only) and get a green full run. Only that run
exercises perf-chromium in CI with the new benchmark.

(Inherited from phase 12, to be fixed there: the ordered-list escape bug in src/core/export.ts:18.)

## Non-blocking findings

N1. The search benchmark does not check its own query: e2e/perf/reader.perf.ts:57 and :68. The
comment says `page ${count}` "matches once, on the last page", but page 600 of heavy-600-v1 is an
image-only page (`IMAGE_EVERY = 20`, scripts/generate-heavy-fixture.mjs:14). The probe shows
`page 600` and `600` both give "No matches.". The test waits for `/match/`, which "No matches."
also satisfies. The timing is still a full scan, but a search broken so that it instantly says
"No matches." would record a tiny searchMs. Use a query that really matches on a late page (for
example `page 599`), and assert "1 match on 1 page".

N2. When the cap is hit, the page count is wrong: src/ui/SearchPanel.tsx:19-20. The heavy book
shows "1000+ matches on 57 pages" for a word that appears on about 570 pages, because the count
only covers the first 1000 results and the search stops there. Say that the search stopped (for
example "first 1000 matches, pages 1–57"), or count the pages as "57+".

N3. Matching gaps that a reader will hit in real books:
- A word hyphenated across a line ("exam-\nple") is not found as "example".
- "ß" does not match "ss".

Ligatures depend on PDF.js normalization; they could not be tested with the standard fonts.
Accept these for now or note them for later.

N4. The Ctrl+F shortcut is taken on every platform (ReaderView, the `metaKey || ctrlKey`
handler). On a Mac, Ctrl+F in a text field normally moves the caret forward. Pressed in the note
editor, it now raises "Discard changes?". Consider Meta only on Apple platforms.

N5. No unit tests for useSearch: cancelling, the cap and truncation, a page that fails, and a
destroyed document. These were verified only by hand in this review.

## Observed but fine

- Marks stay on the pages after the panel is closed. They are redrawn after the layout change
  (2 hits on page 1 before and after closing).
- On a narrow screen (390 px), choosing a result closes the panel and the current mark shows.
- Reopening the panel keeps the query and its results.

## Appendix (author, 2026-10-20 09:00 UTC): findings addressed

- B1 (CI red, inherited from phase 12): fixed on phase 12 (36073e0) and merged here. To save Actions minutes, the
  full CI evidence for this branch is the run on phase 17, which contains it (see build log).
- The search benchmark now searches "page 599" (page 600 of the benchmark book is an image page) and checks it
  finds exactly "1 match on 1 page" before recording the time: 2672 ms here.
- With the 1,000-result cap, the page count is a lower bound too ("57+ pages").
- Cmd+F on Apple devices, Ctrl+F elsewhere (Ctrl+F keeps its Mac meaning in text fields).
- Not changed: hyphenated words across lines and ß/ss are not matched; no unit tests for useSearch yet (the e2e
  tests cover cancelling, the cap is checked by the evaluator's probe).
