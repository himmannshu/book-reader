# Contract: Phase 13 Search inside a book

Agreed definition of done, written before any code. The author drafts it. The user or the
reviewing agent approves it. After approval, only append clearly marked amendments.

- Approved by: agent under the user's standing instruction of 2026-10-20 (Claude Code, cloud
  session). Judgment calls: harness/context/phase-13-search-in-book-context.md.

## Checkable items

| # | Behavior | How to verify | Result (filled in at review) |
|---|---|---|---|
| 1 | Searching a known word lists every match and every page it appears on, ignoring case and accents | e2e `search` (text fixture: "page" → 8 matches on 4 pages) + unit | |
| 2 | Choosing a result jumps to it, with the match marked on the page over the matched words (within 2 px) and the chosen match marked as current | e2e | |
| 3 | Next and Previous (and Enter in the box) step through the matches, wrapping around | e2e | |
| 4 | Cmd/Ctrl+F opens the search with the cursor in the box; "No matches." when nothing matches; clearing the box removes the marks | e2e | |
| 5 | Page text comes from the engine (PDF.js extracts it in its worker); results appear while the search runs and a new query cancels the old one | code + unit | |
| 6 | Searching the whole 600-page benchmark book is measured in the phase 02 benchmarks (`searchMs`, report-only until the user agrees a budget); the existing budgets pass unchanged | `npm run test:perf` | |
| 7 | `scripts/verify.sh` (cloud stand-in) passes; full CI on the branch is green | local run; GitHub run URL | |
| 8 | User-checked: search a real book on Mac and iPhone; agree a budget for `searchMs` | User report | |

## Out of scope for this contract

- Searching the whole library, scanned (image-only) pages, regular expressions.

## Amendments

(none)
