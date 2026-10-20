# Phase 12 review: Export highlights and notes

- Reviewer: Claude Code (Opus 5.5, evaluator subagent, fresh context), 2026-10-20
- Branch: phase-12-export-annotations, worktree /home/user/book-reader-p12. Reviewed at e061768.
  f09e4e5 landed during the review. It is test-only (export.spec.ts accepts underscores in the
  download name), it is local and not pushed, and I re-ran the spec on it.
- Base: phase-11-library-view at 26b6a2c (worktree /home/user/book-reader-p11)
- Inputs: harness/contracts/phase-12-contract.md, harness/build/phase-12-export-annotations.md,
  harness/EVALUATOR.md, diff origin/phase-11-library-view...HEAD

## Verdict: FAIL

There are two blockers.

1. **Contract item 3.** A highlight quote (or a title) that starts with a number and a full stop,
   such as "1. Introduction", is exported as `\1. Introduction`. The backslash shows up literally
   when the Markdown is rendered.
2. **Contract item 6.** The full CI run on the branch is red: the WebKit download name test fails.

Everything else works when exercised: book order, chapter grouping, multi-line notes, the
download and its file name, and the disabled states.

## Environment (cloud container)

- Node 24 via `source /opt/nvm/nvm.sh && nvm use 24`. The worktree has its own node_modules.
- Playwright cannot download browsers here. I used `PLAYWRIGHT_BROWSERS_PATH=$HOME/pw-browsers`
  with Chromium projects only. WebKit is covered only by full CI.
- `scripts/verify.sh` runs WebKit projects, so I ran its steps one by one with Chromium only:
  lint, format:check, typecheck, test:unit, `playwright test --project=chromium`, and
  `-c playwright.sync.config.ts --project=sync-chromium`. Perf was run separately.
- "Chromium reports the app as installable" fails for environment reasons, as it does on the baseline.
- Perf on this machine is noisy and slower than the Mac budgets. I compared before and after only,
  alternating sequential runs against phase 11. No budgets were changed. My first two pairs ran
  while another agent was running Playwright in the phase 16 worktree (load average about 7), so I
  threw them away and repeated on an idle machine.
- Probes ran from a scratch directory outside the repo: a Playwright spec against `vite preview`
  on port 4173, and an esbuild bundle of src/core/export.ts rendered with `commonmark` 0.31.2
  (installed in the scratch directory only).

## Contract items

| # | Result | Evidence |
|---|---|---|
| 1 | PASS | Unit 323/323. e2e export.spec 2/2 (Chromium, also re-run at f09e4e5). Probe in a real browser: highlighted "Delta four" then "Bravo two" on page 1, added a 2-line note with `*one*`, exported. The file has the title, the summary "2 highlights, 1 note", `### Page 1`, both quotes, and `**Note:** Line *one*␠␠\nLine two`. |
| 2 | PASS | Probe: the lower passage was highlighted first, but the export lists "Bravo two" before "Delta four" (top to bottom). Outline fixture probe: page notes on pages 5, 8, 9 and 12 came out under `## Chapter 2`, `## Part Two`, `## Chapter 3` and `## Appendix`, in that order. Pages before any chapter get no chapter heading. Outline entries with a null page are skipped, and their children with a page still count (core probe). A book without an outline has pages only (unit test). |
| 3 | **FAIL** | Core probe, rendered with commonmark: the quote `1. Introduction to things` becomes `> \1. Introduction to things`, which renders as the literal text "\1. Introduction to things". A backslash before a digit is not an escape in CommonMark, so the escape must go after the digits: `1\.`. The same happens to a title such as "1. Foo" (`# \1. Foo`). `*`, `_`, `#`, `[`, `<`, `` ` `` and `\` are escaped correctly. Notes are kept as typed (`*emph*` stays emphasis). |
| 4 | PASS | e2e: the download event has the file name `text-4-pages - highlights and notes.md` and the contents are checked. My probe exported twice in a row and got identical files, and an empty book gives "No highlights or notes yet.". WebKit: the CI run shows `text-4-pages_-_highlights_and_notes.md` (see item 6). |
| 5 | PASS (test gap) | Unsaved book: the e2e test passes and the button is disabled with "Export works once the book is saved on this device.". Loading: probe that delays the `highlights` getAll by 3 s. The button is disabled with "Loading highlights and notes…" and becomes enabled once loading finishes. No automated test covers the loading case, although the contract says "e2e + unit". |
| 6 | **FAIL** | Local perf (perf-chromium, idle machine, alternating). firstPageMs: p11 410/423 vs p12 401/384. jumpMs: 41/42 vs 33/43. p95FrameMs: 33.3/33.3 vs 16.8/33.3. maxCanvasMB 67.1 for both, blank 0 for both. No regression. Chromium stand-in verify is green apart from the environment failure: e2e 110 passed + 1 env failure, sync 15/15. **Full CI on the branch, run 39387029990 (https://github.com/himmannshu/book-reader/actions/runs/39387029990) at e061768: failure.** The failing test is `[webkit] export.spec.ts:40`: expected `text-4-pages - highlights and notes.md`, got `text-4-pages_-_highlights_and_notes.md`. Because verify stops at the first failure, CI perf never ran ("No files were found … perf-results/"). The fix f09e4e5 is local only and has no CI run. |
| 7 | PENDING (user) | Device check on Mac and iPhone. Not something the reviewer can check. |

## Rubric

| Criterion | Score | Threshold | Notes |
|---|---|---|---|
| Contract fidelity | 3 | 5 | Item 3 fails on a common input. Item 6 has a red CI run. |
| Functionality | 4 | 4 | The real flow works end to end. Book order and chapter grouping are correct. |
| Robustness | 4 | 4 | Passes, but see findings N1 and N2. |
| Code quality | 4 | 3 | Small, pure core function. `chapterAt` is shared cleanly with bookmark labels. |
| Test quality | 3 | 3 | The exact-output unit test is good. Gaps: the loading state is untested, the escape tests miss list markers, and the WebKit fix weakens the name check (N4). |
| Product depth | 4 | 3 | Grouped by chapter, notes whose highlight is gone are kept, and the file name is made safe. |
| Design | 4 | 3 | The button sits at the end of the Notes panel and its reason text is shown below it. |

## Blockers

B1. Ordered-list escape writes a literal backslash: src/core/export.ts:18.
`.replace(/^([-+]|\d+\.)(\s)/, '\\$1$2')` turns `1. Introduction` into `\1. Introduction`.
To reproduce, call `exportMarkdown` with a highlight quote `1. Introduction` and render the result
with any CommonMark renderer. Expected: "1. Introduction". Got: "\1. Introduction". Escape the
full stop instead (`1\. `), and add the case to export.test.ts. Related, lower severity: `2) x`
still becomes an ordered list, `---` becomes a rule, and `&amp;` / `&copy;` are decoded as
entities. A highlight is unlikely to be exactly `---`, but `2)` and `&` are plausible in a book.

B2. Full CI is red on the branch (run 39387029990, WebKit download name). The test fix f09e4e5
is not pushed and has not been run. Contract item 6 needs a green full run.

## Non-blocking findings

N1. When the notes fail to load, the export reason is wrong and never changes:
src/ui/ReaderView.tsx:393-398. The probe injected a notes getAll failure (the same pattern as
notes.spec.ts:409). The panel shows "This book's notes couldn't be read." and Retry, but the
export button stays disabled with "Loading highlights and notes…", which is untrue. A failed load
should get its own reason, for example "Highlights and notes couldn't be read." I only tested
notes; highlights probably behave the same way.

N2. `exportAnnotations` (src/ui/ReaderView.tsx:400, called as `void exportAnnotations()` at :585)
has no try/catch. If `exportMarkdown`, the Blob or `createObjectURL` throws, the error becomes an
unhandled rejection with no message to the user. AGENTS.md says never to swallow errors silently.
This is unlikely, but it costs very little to report it through the existing alert.

N3. A table-of-contents entry with an empty title gives an empty `## ` heading (core probe).
It is rare but easy to skip.

N4. f09e4e5 compares `suggestedFilename().replace(/_/g, ' ')`. The test now passes even if the
app itself produced underscores. The claim "Safari keeps them" is unverified, and it should be
part of the item 7 device check. A tighter test would assert the exact name per browser
(spaces in Chromium, underscores in Playwright's WebKit).

N5. Export is enabled for a book with nothing in it and downloads a file that says
"No highlights or notes yet.". That is acceptable, but a disabled button with that reason may be
nicer.

## Observed but fine

- Multi-line notes become hard line breaks. A blank line inside a note starts a new paragraph, and
  a `- item` line becomes a list. Both count as "kept as typed".
- A note whose highlight is gone is exported as `**Note:**` on its page. In the app, deleting a
  highlight also deletes its notes, so this case only comes from sync.
- Quotes are whitespace-normalized at capture (`normalizeQuote`), so a multi-line quote cannot
  break out of the blockquote.
- `exportFileName` strips `\/:*?"<>|` and control characters, caps the length, and falls back to
  "Book".

## Appendix (author, 2026-10-20 08:50 UTC): blockers addressed

- B1 escaping: list numbers are escaped after their digits ("1\." and "2\)"), a leading -, + or = gets a
  backslash (so --- is no rule), and & is escaped (entities stay literal). Unit tests red first, then green.
  Empty chapter titles no longer make an empty heading (unit test).
- B2 CI: the download-name test now expects exactly the name with spaces, and underscores only in WebKit
  (Playwright's WebKit build), so an app bug that produced underscores would still fail in Chromium.
- Non-blocking: export no longer waits forever when highlights or notes failed to load (a reason says so),
  and a failed export shows a message. Full CI rerun on this branch (see build log).
