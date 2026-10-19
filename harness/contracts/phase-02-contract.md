# Contract: Phase 02 Performance baseline

Agreed definition of done, written before any code. The author drafts it. The user or the
reviewing agent approves it. After approval, only append clearly marked amendments.

- Approved by: Himanshu (user), 2026-10-19

User decisions: CI enforces time budgets ×4 and always uploads results; B2 is fixed in this
phase by replacing the 8-page cap with a canvas memory budget.

## Checkable items

| # | Behavior | How to verify | Result (filled in at review) |
|---|---|---|---|
| 1 | Heavy book is generated deterministically: ≥600 pages with text, vector and image pages; gitignored; generated automatically before perf runs | Generate twice and compare hashes; delete it, run perf, it is regenerated | |
| 2 | `npm run test:perf` measures first page, jump, scroll p95 frame, blank-frame %, and max canvas MB in Chromium and WebKit at DPR 2, and writes a results JSON and a table | Run it; inspect output and JSON | |
| 3 | Budgets live in `e2e/perf/budgets.json` with the machine and date, and the user approved them after seeing the baseline | File contents; approval recorded in build log | |
| 4 | Time to first page on the heavy book is within budget (both browsers) | `npm run test:perf` | |
| 5 | Jumping to a far page draws it within budget | `npm run test:perf` | |
| 6 | Scroll smoothness is within budget (p95 frame interval and blank-frame %) | `npm run test:perf` | |
| 7 | Canvas memory never exceeds its cap while scrolling the whole heavy book at DPR 2 | `npm run test:perf` (deterministic) | |
| 8 | B2: when more than 8 pages fit on screen, every visible page is drawn and the memory cap holds | New e2e test plus unit tests for the memory planner | |
| 9 | A deliberately slowed renderer (+300 ms per page) makes `scripts/verify.sh` FAIL at the perf step | Negative check, then revert | |
| 10 | `scripts/verify.sh` runs perf and PASSes locally; CI applies ×4 time budgets, uploads the results, and is green | Local run; GitHub run URL | |
| 11 | User-checked: `PERF_BOOK=<own book> npm run test:perf` prints numbers for one real book | User runs it and reports the numbers | |

## Out of scope for this contract

- Swapping engines or moving page drawing off the main thread (a human decision if budgets can't be met)
- Review findings B3 and B4
- Profiling on a real iPad or iPhone
- Profiling dashboards

## Amendments

(none)
