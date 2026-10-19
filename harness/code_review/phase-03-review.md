# Phase 03 review: Local book persistence

- Reviewer: Claude Code (Opus 5.5), evaluator subagent, fresh context
- Date: 2026-10-19
- Commit reviewed: 7837cee (tip of branch phase-03-local-book-persistence, already merged into main).
  I checked that findings F1 to F4 below still exist on the current HEAD (66c8daa,
  phase-04-table-of-contents).
- Inputs: AGENTS.md, harness/EVALUATOR.md, harness/build/phase-03-local-book-persistence.md and
  harness/contracts/phase-03-contract.md. I read the build log, the context file and the decision record
  only after I had run my own checks.

## How I tested

- I extracted 7837cee with `git archive` into my scratchpad and ran `npm ci` and
  `npx playwright install chromium webkit` there. The main checkout was not touched. Before the perf run I
  checked that nothing was listening on 4173 or 4174 and that no other perf run was active.
- `scripts/verify.sh`: lint, format and typecheck passed; unit 46 passed; browser 36 passed (chromium and
  webkit); perf 8 passed. Result `--- PASS`, exit 0. Perf results: chromium first page 173 ms, jump 22,
  p95 16.8, blank 0%, canvas 67.1 MB; webkit 135, 91, 31, 1%, 67.1 MB. All are within budget.
- I wrote my own Playwright probes, kept in the scratch copy only (probe/*.spec.ts, port 4175). They ran
  against the production build in Chromium and WebKit: 19 passed and 1 was skipped (the CDP quota probe
  runs only in Chromium).
- I ran the lint negative check and the mutation checks in the scratch copy only. Every change was
  restored from a backup and the restore was checked with `diff`.
- CI: `gh run list` shows run 39202341230 on 7837cee (branch) as success, and 39202966896 on main after
  the merge as success.

## Contract items

| # | Result | What I ran and saw |
|---|---|---|
| 1 | PASS | Probe A: imported basic-3-pages, waited for "Saved on this device.", closed the tab, then opened a new tab in the same context. "Your books" had 1 item. Probe D: imported 3 books, reloaded, and all 3 were listed. Both browsers. |
| 2 | PASS | Probe A: after the new tab, clicked the title. Page 1 was rendered, the band color matched `bandColor(0)`, and book-info read "basic-3-pages.pdf · 3 pages". A `filechooser` listener counted 0 events. Probe I: the 58 MB heavy book reopened after reload, with page 1 in 231 ms (chromium) and 260 ms (webkit). |
| 3 | PASS | Probe B: with 2 books, Remove → "Yes, remove" on one left only the other listed, with IndexedDB counts `{books:1, files:1}`, and it was still gone after reload. The e2e test covers Cancel, both stores at 0, and reload. Mutation: dropping `FILES.delete` in `remove` fails the unit test "removes a book and its file". |
| 4 | PASS | Probe C: imported basic-3-pages, then the same bytes under the name `renamed_copy.pdf`. After reload there was 1 entry, with `{books:1, files:1}`. Mutation: an id that includes the time fails 2 unit tests. |
| 5 | PASS | Probe D: imported A, B, C, then reloaded → [C, B, A]. Opened B from the list and reloaded → [B, C, A]. Re-imported A through the picker → [A, B, C]. Mutation: removing `store.markOpened` in `onOpenFromLibrary` fails the e2e test "the list shows the most recently opened book first" (chromium). |
| 6 | PASS | Probe E: with the 300-page book open, Library removed the reader region and book-info, and hid the Library button. Reopening from the list worked. The e2e test asserts 0 `[data-page-index]` nodes. |
| 7 | PASS | Unit: App tests with fake stores failing with quota or unavailable show the exact messages and keep book-info. Mutation: not calling `setError` on a save failure fails both tests. In a real browser (my probes, beyond the contract): Probe G (Chromium CDP `Storage.overrideQuotaForOrigin`, quota 2000 bytes) showed "There isn't enough storage space to keep this book on this device. You can still read it now.", the 300-page book stayed readable, and the stores stayed at 0/0 (the transaction aborted cleanly). Probe F (`indexedDB.open` throws SecurityError) showed the "This browser mode can't save books…" alert, and the book stayed readable. Both browsers. |
| 8 | PASS | `npm run test:unit`: adapter tests cover add, list order, getBytes, dedupe, markOpened, remove, not-found, persist-once, and schema v1 with stores `bookFiles` and `books`. The quota mapping mutation fails "maps a full disk to quota". |
| 9 | PASS | Probe files in src/ui, src/viewer and src/core used `indexedDB.open`, `window.indexedDB`, `globalThis.indexedDB`, `self.indexedDB`, `navigator.storage.estimate()`, `const { indexedDB } = window`, `navigator['storage']` and `const { storage } = navigator`. `npx eslint src` reported all 8 as errors. The same code in src/storage was allowed. After removing the files, lint was clean. |
| 10 | PASS | `npm run test:perf` within `scripts/verify.sh`: 8 passed within the existing budgets (numbers above). The benchmark opens through the file input, so the 58 MB background save is part of every measured run. |
| 11 | PASS | Local `scripts/verify.sh` → PASS (above). CI run 39202341230 on 7837cee → success. https://github.com/himmannshu/book-reader/actions/runs/39202341230 |
| 12 | PASS (user-reported, not re-verified) | The build log entry "Item 12 user-checked in real Safari" quotes the user: "I imported a real book in Safari, closed the tab, reopened it, and the book was listed and opened." I cannot drive real Safari. Playwright WebKit passed the same flow (Probe A). |

## Rubric

| Criterion | Score | Threshold | Notes |
|---|---|---|---|
| Contract fidelity | 5 | 5 | All 12 items pass when exercised. Item 12 relies on the user's report, which is the method the contract specifies. |
| Functionality | 4 | 4 | Import, reload, reopen, dedupe, recency, remove and Library all work end to end, including a 58 MB book and a rapid second import before the first save finished (Probe J: both saved, order correct). Problems: F1 (the title vanishes while confirming removal on an iPhone-width screen), F3 (stale alert in the library) and F4 (a record with no stored file stays listed). |
| Robustness | 4 | 4 | Quota and unavailable errors are mapped and shown in real browsers, failed transactions leave no partial data, and a non-PDF is never stored. Problems: F2 (the startup message is wrong when storage is unavailable), F5 (a list-refresh failure after a successful save says the book "couldn't be saved") and F6 (markOpened storage failures are swallowed without any trace for expected kinds). |
| Code quality | 3 | 3 | The adapter is small and clear, with schema versioning, `guard`/`toStorageError` and a clean interface boundary that lint enforces. Problem: F7, a user decision (D5a, Blobs) was reversed in code without the superseding entry that AGENTS.md requires, and the contract preamble still says Blobs. |
| Test quality | 4 | 3 | Every mutation I tried was caught: remove leaving the file, broken dedupe, wrong quota mapping, swallowed save error, missing markOpened. Gaps: item 7 is unit-only with fakes; there is no real-browser storage-failure test, though a CDP quota override makes one cheap in Chromium. The dedupe e2e test uses the same file name twice, never the same bytes under another name. |
| Product depth | 3 | 3 | A real library with recency, dedupe, confirmed removal and persistence requests. It is still deliberately minimal (no sizes or dates in the list), which is in scope for phase 11. |
| Design | 3 | 3 | The list is coherent with the app (warm surface, bordered list, inline confirmation, distinct danger button) and not a library default. F1 is a real layout defect on phone width. |

## Findings

All of these still exist on the current HEAD (66c8daa) unless noted.

- **F1 (medium, UI, iPhone).** While confirming removal on a narrow screen, the book's title collapses to
  zero width, so "Remove this book from this device?" shows with no book name. Cause: src/ui/app.css:188-198,
  where `.library-title` has `flex: 1` and `overflow: hidden`, so its minimum width is 0, and the
  `.library-confirm` span (src/ui/Library.tsx:34) takes all the room. Repro: viewport 390×800, import
  mixed-sizes, Library, then "Remove mixed-sizes". The title's `getBoundingClientRect().width` goes from
  243.8 to 0 in both Chromium and WebKit (screenshot taken at 375 px). Expected: the title stays visible
  (for example, wrap the confirmation onto its own line or give the title a minimum width).
- **F2 (low-medium, copy).** When storage is unavailable at startup, the alert reads "This browser mode
  can't save books, so this one won't be kept after you close it. You can still read it now." No book is
  open, so "this one" and "read it now" refer to nothing. Below it, "No books yet. Open a PDF to start."
  suggests the library is empty, not unreadable. Location: src/ui/App.tsx:38, used for list failures at
  src/ui/App.tsx:79 and :93. Repro: Probe F (init script makes `indexedDB.open` throw SecurityError),
  then load the page.
- **F3 (low).** A save-failure alert ("…You can still read it now.") stays visible after Library closes the
  book. `backToLibrary` (src/ui/App.tsx:165-169) clears `notice` but not `error`. Repro: Probe G or F,
  import a book, click Library. The library shows the stale "read it now" alert above the empty state.
- **F4 (low).** If a book's metadata exists but its bytes are missing, opening it shows "That book is no
  longer stored on this device." but the entry stays listed forever, and clicking it again just repeats
  the error. Repro: Probe H (clear the `bookFiles` store, reload, click the title). Expected: offer to
  remove it, or drop the dangling record. Unlikely with the single-transaction writes, but eviction or
  manual clearing can cause it.
- **F5 (low, code read).** In `onFileChosen` (src/ui/App.tsx:131-138), `refreshBooks()` runs inside the
  same try as `store.add`, but `refreshBooks` catches its own errors and sets
  `storageMessage(err)`. For an `unknown` list failure after a successful save, that shows "This book
  couldn't be saved on this device", which is false. Not reproduced.
- **F6 (low, code read).** `onOpenFromLibrary` (src/ui/App.tsx:144-149) catches markOpened and refresh
  failures and logs them only when `logUnexpected` treats them as unexpected. A quota, unavailable or
  not-found failure there leaves no message and no log, and the recency order silently doesn't update.
  AGENTS.md says "never swallow them silently". At minimum, log it.
- **F7 (medium, process).** D5a in harness/context/architecture-decisions.md is a user decision: "store
  PDFs as Blobs in IndexedDB". It still says that, and its "Revisit if" note relies on `Blob.slice` for
  range reads. The code stores ArrayBuffers and `getBytes` returns the whole file. The change is explained
  in the build log (05:45 entry) and in phase-03-local-book-persistence-context.md, but AGENTS.md
  requires "Append a superseding entry there", and the contract preamble (line 8) still says Blobs, with
  "Amendments: (none)". Still true on HEAD. Fix: append a D5b superseding entry and a marked amendment
  to the contract. Also tell the user explicitly, because it removes the range-read option D5a counted
  on.
- **F8 (note, not scored).** `Library.tsx:36-45`: "Yes, remove" and "Cancel" are not disabled while
  `busy`, unlike the other buttons. If the confirmation is already open, you can remove a book while it
  is being opened from the list. I did not reproduce a harmful outcome.

## Verdict

**PASS.** Every contract item passes when exercised, and every rubric criterion meets its threshold.
Code quality and design are exactly at threshold. F1 and F7 should be fixed before phase 08 (the
installable, iPhone-facing phase) and before anyone relies on the decision record; F2 and F3 are quick
copy and state fixes.
