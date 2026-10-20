# Build log

Source of truth for what actually happened and what was actually observed. Append only.
Never write a planned command as if it passed. Record skipped checks and why.
If an earlier entry is wrong, append a correction that names it.

## Phase summary

| Phase | Status | Branch | Evidence | Blockers |
|---|---|---|---|---|
| 08 | Complete* | phase-08-installable-and-hosted | items 1–11 observed; CI 39345677490 + 39347261723 green; *iPhone offline failed, deferred (Amendment 1) | offline on iPhone |
| 07 | Complete | phase-07-notes | verify PASS at 26875e4 (137/166/8); items 1–16 per Codex entries; CI 39331468496 green; 18 user-checked | none |
| 06 | Complete | phase-06-highlights | per Codex entries: all 14 items observed; CI 39320769897 green on 7ac8b1e; user check confirmed | none (row added later by Claude Code) |
| 05 | Complete | phase-05-bookmarks | verify PASS at aa73b5c; items 1–13 observed (B1 fixed after review FAIL); 14 user-checked; CI 39291151035 green | none |
| 04 | Complete | phase-04-table-of-contents | verify PASS at ca5c0dc; items 1–9 observed (evaluator re-review); 11 user-checked; CI 39279260419 green | none |
| 03 | Complete | phase-03-local-book-persistence | verify PASS; items 1–11 observed, 12 user-checked in Safari; CI 39200828535 green | none |
| 02 | Complete | phase-02-performance-baseline | verify PASS; items 1–11 observed (11 on a real book); CI on main 39198849866 green | none |
| 01 | Complete | phase-01-open-and-read-pdf | verify PASS; items 1–10 observed; item 11 user-checked; review PASS; CI 39194398452 green | none |
| 00 | Complete | phase-00-repository-foundation | verify PASS at 28a4c32; contract items 1–11 in log; CI run 39191648738 success | none |

## Entries

Template:

### <YYYY-MM-DD HH:MM TZ> | Phase NN | <agent> | <event>
- Changes: <files or behavior>
- Red: <check and the failure you saw, or n/a>
- Green: <check and result>
- Verification: <exact commands run and results>
- Limitations: <untested or skipped, with reason>
- Next: <next action, not authorized implicitly>

### 2026-10-18 22:30 EDT | Planning | Claude Code (Opus 5.5) | Architecture decisions and phase roadmap
- Changes: Created harness/context/architecture-decisions.md (D1–D6). Filled in the Project,
  Commands (planned names) and Conventions sections of AGENTS.md. Updated GOALS.md (scope,
  non-goals, resolved open questions) and PLANS.md (summary, phases 00–13). Created
  harness/build/phase-00…13-*.md. Added F-001…F-015 to harness/features.json, all failing.
- Decisions (with the user): installable web app (PWA); PDF.js behind an engine interface in a
  worker; TypeScript strict + React + Vite + Vitest + Playwright + ESLint/Prettier; local-first
  storage (OPFS + IndexedDB) with Cloudflare (R2, D1, Workers, Pages, Access) as the cloud;
  continuous scroll first; PDF only. Post-core order: comfort, library, export, search.
- Conflict recorded: GOALS.md already said "Platform: a web app" while the user's request
  said the platform was undecided. Treated as open, discussed, and the user chose web app.
  GOALS.md now matches.
- Red: n/a (no code)
- Green: n/a (no code)
- Verification: `scripts/verify.sh` → "verify.sh: no checks configured yet", result
  NOT CONFIGURED, exit 2. Expected before phase 00; not a pass.
  `python3 -m json.tool harness/features.json` parses; 16 rows, all failing; F-000 unchanged.
- Limitations: no application code written. Free-tier numbers come from third-party sources
  (cited in the decisions file); confirm them on official pricing pages before phase 08.
- Next: plan phase 00 (repository foundation) and wait for the user's approval.

### 2026-10-18 23:05 EDT | Phase 00 | Claude Code (Opus 5.5) | App shell with browser test
- Changes: package.json (exact pins; typescript 6.0.3, see context file), .nvmrc, .gitignore,
  playwright.config.ts (production build via `vite build` + `vite preview`, Chromium + WebKit),
  e2e/app-shell.spec.ts, index.html, vite.config.ts, tsconfig.json, src/main.tsx, src/ui/App.tsx.
  Branch phase-00-repository-foundation created from main (main fast-forwarded to planning, local only).
- Red: `npx playwright test` → webServer build failed "Cannot resolve entry module index.html" (no app yet).
- Green: `npx playwright test` → 2 passed (chromium, webkit).
- Verification: browsers installed with `npx playwright install chromium webkit`.
- Limitations: lint/format/unit/verify wiring not done yet.
- Next: unit test, lint, format, typecheck.

### 2026-10-18 22:38 EDT | Phase 00 | Claude Code (Opus 5.5) | Phase complete: verify loop, CI, contract evidence
- Changes: Vitest (jsdom) + src/ui/App.test.tsx; ESLint (typescript-eslint strict, react-hooks),
  Prettier; split tsconfig (app/node); scripts/verify.local.sh; .github/workflows/verify.yml;
  .claude/launch.json (dev server for the Claude browser pane); AGENTS.md Commands filled in and
  TS pin added to Conventions; harness/context/phase-00-repository-foundation-context.md.
- Red: `npx vitest run` before config → 2 files failed (no DOM env; picked up e2e spec).
- Green: `npx vitest run` → 1 passed after jsdom config.
- Verification against harness/contracts/phase-00-contract.md:
  1. Fresh `git worktree` at 69a9679+: `npm ci` → 0 vulnerabilities; `npx playwright install
     chromium webkit` → exit 0; then `scripts/verify.sh` → PASS.
  2. `scripts/verify.sh` (commit 28a4c32) → steps lint, format check, typecheck, unit tests,
     browser tests (chromium, webkit) all ran; "--- PASS"; harness/.last-verify result: PASS.
  3. `export const typeBreak: number = 'a'` in src/ui/break.ts → verify exit 1, failed at typecheck. Reverted.
  4. Unused `const unused = 1` → verify exit 1, failed at lint. Reverted.
  5. Unit assertion changed to 'Wrong Name' → verify exit 1, failed at unit tests. Reverted.
  6. e2e expected heading changed to 'Wrong Name' → verify exit 1, failed at browser tests. Reverted.
  7. `npm run test:e2e` → "[chromium] … ✓" and "[webkit] … ✓", 2 passed.
  8. `npm run dev` via Claude browser pane at http://localhost:5173 → accessibility tree shows
     main > heading "Book Reader"; no console errors.
  9. Fresh worktree before `npm ci`: verify printed "node_modules is missing. Run: npm ci && npx
     playwright install chromium webkit", "--- FAIL", exit 1. No stack trace.
  10. .github/workflows/verify.yml runs `npm ci`, `npx playwright install --with-deps chromium
      webkit`, `scripts/verify.sh`. GitHub run: NOT RUN (no remote; push not authorized).
  11. Each AGENTS.md command run once: lint, format:check, typecheck, test:unit, test:e2e,
      build → all exit 0.
- Limitations: CI never executed on GitHub (item 10, as the contract allows). Playwright
  browsers were downloaded from Playwright's CDN (chromium cached, webkit-2370 new).
- Next: user decides on creating the GitHub repo and pushing; then plan phase 01.

### 2026-10-18 23:20 EDT | Phase 00 | Claude Code (Opus 5.5) | First CI run on GitHub (contract item 10)
- Changes: merged phase-00-repository-foundation into main (fast-forward, 812f49d). Installed the
  GitHub CLI (`brew install gh`, 2.102.0); the user ran `gh auth login`. Created the private repo
  https://github.com/himmannshu/book-reader and pushed main (user-authorized).
- Verification: GitHub Actions run 39191648738 on 812f49d → conclusion success. Steps npm ci,
  `npx playwright install --with-deps chromium webkit`, and `scripts/verify.sh` all succeeded.
  https://github.com/himmannshu/book-reader/actions/runs/39191648738
- Correction to the earlier Phase 00 close entry: item 10's GitHub run is now observed (it was
  "NOT RUN" at the time).
- Next: plan phase 01 (open and read a PDF) and wait for approval.

### 2026-10-18 23:15 EDT | Phase 01 | Claude Code (Opus 5.5) | First page renders through the engine interface
- Changes: branch phase-01-open-and-read-pdf; contract approved; fixtures (scripts/generate-fixtures.mjs,
  deterministic: regenerated twice, identical hashes); src/viewer/layout.ts (+16 unit tests);
  src/engine/{types.ts,pdfjs-engine.ts} (pdfjs-dist 6.4.299; destroy is on loadingTask in v6);
  src/viewer/viewer.ts; src/ui/{App.tsx,ReaderView.tsx,app.css}; e2e/{helpers.ts,open-pdf.spec.ts};
  tsconfig.node.json gains DOM lib for Playwright callbacks.
- Red: layout tests failed (module missing); e2e "opening a PDF draws its first page" timed out
  in chromium and webkit (no Open PDF input).
- Green: `npx vitest run` → 20 passed; `npx playwright test` → 4 passed (item 1 in chromium + webkit,
  band color of page 1 read from canvas pixels).
- Limitations: contract items 2–11 not yet exercised.
- Next: e2e for items 2–7.

### 2026-10-18 23:30 EDT | Phase 01 | Claude Code (Opus 5.5) | E2E for contract items 2–7
- Changes: e2e/open-pdf.spec.ts gains tests for items 2 (last page short + long book), 3 (≤8
  canvases while stepping through 300 pages; page 1 released), 4 (mixed sizes), 5 (invalid file then
  valid), 6 (second book replaces first), 7 (resize re-fit + page kept in view).
- Red: NOT observed first. The viewer was written in the previous step, so these tests passed on
  their first run. To prove they bite, each was run against a deliberate break (chromium):
  no canvas release → item 3 failed; ignore real page sizes → item 4 failed; error not cleared →
  item 5 failed; no anchor restore on resize → item 7 failed; old content kept (append instead of
  replace) → item 6 failed (Expected 3, Received 303). A weaker break (skip content.remove())
  did not fail item 6 because the next viewer replaces the content anyway; not a behavior change.
  All breaks reverted with `git checkout`.
- Green: `npx playwright test e2e/open-pdf.spec.ts` → 14 passed (7 tests × chromium, webkit).
- Next: lint import boundary (item 8), then close-out checks.

### 2026-10-18 23:35 EDT | Phase 01 | Claude Code (Opus 5.5) | PDF.js import boundary (item 8)
- Changes: eslint.config.js `no-restricted-imports` for pdfjs-dist in src/** except src/engine/**.
- Red: probe file src/ui/boundary-probe.ts importing pdfjs-dist → `npm run lint` exit 0 (no rule yet).
- Green: with the rule, the probe → lint exit 1 ("'pdfjs-dist' import is restricted… Import PDF.js
  only inside src/engine"); probe deleted → lint exit 0.

### 2026-10-18 23:45 EDT | Phase 01 | Claude Code (Opus 5.5) | Close-out checks (items 1–10 observed; 11 pending user)
- Changes: harness/context/phase-01-open-and-read-pdf-context.md; AGENTS.md Commands gains `npm run fixtures`.
- Verification against harness/contracts/phase-01-contract.md:
  1–7. `scripts/verify.sh` at 5d07bf2 → browser tests 16 passed (app shell + 7 phase-01 tests, each
     in chromium and webkit). Tests 2–7 were checked against deliberate breaks (see 23:30 entry).
  8. Lint boundary probe → exit 1 with the rule, 0 without the probe (23:35 entry).
  9. `npm run test:unit` → 20 passed (16 layout tests covering top, middle, gap, bottom, overscan
     clamp, maxPages cap, single page, empty layout, anchor/scroll restore; 4 App tests).
  10. `scripts/verify.sh` → lint, format check, typecheck, unit, browser all ran; "--- PASS";
      harness/.last-verify result: PASS at 5d07bf2.
  Dev server (Claude browser pane, http://localhost:5173): opened long-300-pages.pdf through the
  file input, scrolled to 40% → toolbar "long-300-pages.pdf · 300 pages", 3 canvases in DOM,
  rendered pages 119–121, screenshot shows page 121, no console errors.
  11. NOT YET: needs the user to open one of their own books in `npm run dev`.
- Limitations: F-001/F-002 marked passing on items 1–3 evidence. Phase stays In progress until item 11.
- Next: user checks item 11; then review (`/evaluate 01` or Codex) and decide on push/merge.

### 2026-10-18 23:55 EDT | Phase 01 | Claude Code (Opus 5.5) | Item 11 user-checked; phase complete
- Verification: 11. User-observed (reported in chat by Himanshu): "I opened a real book in the dev
  server and it reads and scrolls fine." Not independently verified by the agent (the book is the
  user's own file and was not shared).
- All contract items 1–11 now have evidence. Phase 01 status → Complete.
- Limitations: no independent review yet (recommended: `/evaluate 01` or Codex). Branch not pushed.
- Next: review, then ask before pushing/merging; phase 02 (performance baseline) is not started.

### 2026-10-19 00:20 EDT | Phase 01 | Claude Code (Opus 5.5) | Fix review findings B1, B5, B6
- Source: harness/code_review/phase-01-review.md (evaluator verdict PASS; user asked to fix B1, B5, B6
  and defer B2–B4).
- Changes: viewer ResizeObserver redraws on height-only changes (B1); reader is a focusable
  region and gets focus when a book opens (B5); Anchor gains `pixelsAbove` so offsets in padding or
  gaps survive relayout unscaled, keeping the 24px gap above page 1 (B6); viewer sets
  `data-layout="estimated|measured"` on the scroller (used by tests).
- Red: 3 new unit tests failed (anchor round-trip/padding); 3 new e2e tests failed in chromium and
  webkit (taller window: page 3 never rendered; keyboard: reader not focused; gap: no measured layout).
  Mutation check: with only the `pixelsAbove` subtraction removed, the gap e2e fails
  "Expected: 0, Received: 24", which is the reported B6 behavior.
- Green: `scripts/verify.sh` → lint, format, typecheck, unit 22 passed, browser 22 passed
  (chromium + webkit); "--- PASS".
- Deferred by the user (not fixed): B2 (more than 8 visible pages leave extras blank), B3 (failed page
  draw shows only a white box), B4 (lint boundary misses dynamic import and .js files).

### 2026-10-19 00:40 EDT | Phase 01 | Claude Code (Opus 5.5) | CI failure on merge to main, fixed
- Observed: GitHub Actions run 39193955157 on fd874e8 (main) → failure. Only
  "[webkit] scrolling through a 300-page book…" failed: `locator.evaluate` hit the 30 s test timeout,
  also on retry. 21 other browser tests passed; lint/format/types/unit passed.
- Cause: the test stepped through ~160 scroll stops, each waiting for frames while PDF.js drew pages
  on the main thread. Locally it already took 14.5 s in WebKit; Linux CI WebKit is slower. Not a
  wrong result, a slow test. Noted as a speed signal for phase 02 (main-thread drawing in WebKit).
- Fix: step 5 viewports per stop (~60 stops) and `test.slow()`. Local WebKit time 14.5 s → 4.9 s.
  Mutation check still bites: with canvas release removed → "Expected: <= 8, Received: 300" in both browsers.
- Verification: `scripts/verify.sh` → PASS (unit 22, browser 22).

### 2026-10-19 00:50 EDT | Phase 01 | Claude Code (Opus 5.5) | Merged to main; CI green
- phase-01-open-and-read-pdf fast-forwarded into main (844e7a5) and pushed (user-authorized).
- GitHub Actions run 39194398452 on 844e7a5 → success.
  https://github.com/himmannshu/book-reader/actions/runs/39194398452
- Next: plan phase 02 (performance baseline).

### 2026-10-19 01:10 EDT | Phase 02 | Claude Code (Opus 5.5) | Heavy benchmark fixture
- Changes: branch phase-02-performance-baseline; contract approved (user decisions: CI ×4, include B2);
  scripts/generate-heavy-fixture.mjs → tests/fixtures/generated/heavy-600-v1.pdf (gitignored):
  600 pages, dense Times text, a 400-curve vector drawing every 5th page, a full-page 1000×1294
  RGB PNG every 20th page; seeded PRNG + fixed metadata.
- Observed: first attempt was 127.6 MB (grain too random to compress); reduced grain and image size
  → 57.8 MB, generated in 9.3 s. Two consecutive runs → identical SHA-1.
- Next: User Timing marks.

### 2026-10-19 01:20 EDT | Phase 02 | Claude Code (Opus 5.5) | User Timing marks
- Changes: src/core/perf-marks.ts (book:open-start, book:opened, page:rendered{pageIndex}; cleared
  on each new open); App marks open start/opened; viewer marks each finished page.
- Red: e2e "opening a book records timing marks…" → "missing book:open-start mark" (chromium, webkit).
- Green: same test passes in chromium and webkit; unit tests still pass.

### 2026-10-19 01:45 EDT | Phase 02 | Claude Code (Opus 5.5) | Benchmarks: red with impossible budgets, then local baseline
- Changes: playwright.perf.config.ts (perf-chromium, perf-webkit at DPR 2, 1 worker, global setup
  generates the heavy book when missing); e2e/perf/{perf-helpers.ts,reader.perf.ts,global-setup.ts,
  budgets.json (placeholder)}; scripts/perf-report.mjs; `npm run test:perf`; main e2e config ignores perf/.
- Red: with placeholder budgets (1 ms / 0% / 1 MB) and the heavy book deleted first:
  "Generating the heavy benchmark fixture…" → regenerated (57.8 MB, 9.2 s) (item 1); all 8 tests failed,
  e.g. "firstPageMs = 143 exceeds budget 1 (perf-chromium)", "maxCanvasMB = 67.1 exceeds budget 1 (perf-webkit)".
- Memory test took 2.1 min in WebKit (≈100 stops × up to 1.5 s settle); changed to 30 evenly spread stops,
  1 s settle cap → ~2–3 s.
- Baseline, 3 report-only runs (`PERF_REPORT_ONLY=1`), Apple M2 8 GB, values per run:
  firstPageMs chromium [144,144,143] webkit [146,144,126]; jumpMs chromium [34,32,35] webkit [65,84,83];
  p95FrameMs chromium [16.7,16.7,16.8] webkit [32,28,30]; blankFramePct chromium [0,0,0] webkit [1.1,1,1.1];
  maxCanvasMB 67.1 both (4 canvases × 1800×2328 px).
- All within the provisional product targets. WebKit p95 frame is closest (30 vs 34 ms).
- Order change (recorded): B2 memory planner is done before the budget checkpoint, because it changes the
  viewer that the budgets measure.

### 2026-10-19 02:30 EDT | Phase 02 | Claude Code (Opus 5.5) | B2: canvas memory budget replaces the 8-page cap
- Changes: layout.ts `planRender` (always all visible pages; overscan only within `maxCanvasBytes`;
  lower pixel ratio if visible pages alone exceed it; reports visible bounds) replaces `visibleRange`;
  viewer uses it with a 96 MB budget, releases before allocating, redraws a page whose pixel ratio
  changes, and draws visible pages before overscan. New fixture strips-40-pages.pdf (40 × 792×60 pt).
- Red: planner unit tests failed ("planRender is not a function"). B2 e2e at 1280×1200 against the
  committed viewer (layout.ts stashed): {"visible": true, "allDrawn": false} in chromium and webkit.
  (Two earlier attempts were not valid reds: the fixture edit had not applied, then the 720px window
  showed only ~8 strips. Both fixed before the valid red above.)
- Green: unit 25 passed; `npx playwright test` 26 passed (incl. B2 and phase 01's ≤8 canvases test).
- Benchmark finding: after the switch, WebKit jump rose to [117,137,129] ms (from [65,84,83]).
  Drawing visible pages before overscan brought it to [96,88,88]; chromium jump [30,26,21].
- Re-measured baseline, 3 report-only runs (M2): firstPageMs chromium [146,143,145] webkit [165,159,139];
  jumpMs chromium [30,26,21] webkit [96,88,88]; p95FrameMs chromium [16.7,16.7,16.8] webkit [33,29,28];
  blankFramePct chromium [0,0,0] webkit [1.1,1,1]; maxCanvasMB 67.1 both.
- Next: checkpoint, user agrees budgets.

### 2026-10-19 02:50 EDT | Phase 02 | Claude Code (Opus 5.5) | Budgets agreed and enforced; perf wired into verify and CI
- User agreed the proposed budgets in chat, "including WebKit p95 frame at 40 ms" (item 3).
  e2e/perf/budgets.json: chromium firstPage 250, jump 100, p95 frame 25, blank 5%, canvas 96 MB;
  webkit firstPage 300, jump 200, p95 frame 40, blank 5%, canvas 96 MB; ciTimeMultiplier 4.
- Changes: verify.local.sh runs `npm run test:perf` after e2e; CI uploads perf-results/ on every run;
  AGENTS.md commands and the speed convention (budgets change only with user agreement).
- Verification: `npm run test:perf` enforced → 8 passed (chromium first 142, jump 19, p95 16.8, blank 0,
  canvas 67.1; webkit 156, 101, 29, 1, 67.1). `scripts/verify.sh` → all six steps, "--- PASS".

### 2026-10-19 03:05 EDT | Phase 02 | Claude Code (Opus 5.5) | CI baseline: Linux WebKit far slower than budgets ×4
- Pushed branch phase-02-performance-baseline (user-authorized). GitHub Actions run 39196422528 → failure
  at the perf step only (lint/format/types/unit/26 e2e passed). Heavy fixture generated in CI (14.3 s).
  https://github.com/himmannshu/book-reader/actions/runs/39196422528
- CI numbers (ubuntu-latest), from the perf-results artifact:
  chromium firstPage 394 [408,386,394], jump 41 [35,53,41], p95 frame 50, blank 0, canvas 67.1 → all within ×4.
  webkit firstPage 1221 [1207,1229,1221] (> 1200), jump 766 [1012,759,766], p95 frame 411 (> 160),
  canvas 67.1; blank not recorded (the p95 assertion stopped the test).
- WebKit on Linux CI is ~8× slower on time and ~14× on frames than the M2, so ×4 does not fit it.
  Budgets left unchanged pending the user's decision (AGENTS.md: budgets change only with agreement).
- Fix: budget checks use `expect.soft`, so all metrics in a test are recorded even when one misses.
  Checked by forcing chromium p95 budget to 1 (temporary copy): test failed, and both p95FrameMs and
  blankFramePct files were written; budgets.json restored unchanged.

### 2026-10-19 03:20 EDT | Phase 02 | Claude Code (Opus 5.5) | CI policy: Chromium enforced, WebKit reported (contract amendment 1)
- User decision (chat): "in CI enforce only Chromium perf budgets (×4); report WebKit numbers without
  failing. Keep strict WebKit budgets locally." Recorded as Amendment 1 to phase-02-contract.md item 10.
- Changes: budgets.json `ciEnforcedProjects: ["perf-chromium"]`; perf-helpers skips enforcement in CI for
  other projects (still records and uploads the numbers). Budget values unchanged.
- Verification: simulated `CI=1` with both firstPage budgets temporarily 1 ms → chromium failed
  ("exceeds budget 4"), webkit passed (report-only); budgets.json restored. Local `scripts/verify.sh`
  (both browsers enforced) → PASS.

### 2026-10-19 03:40 EDT | Phase 02 | Claude Code (Opus 5.5) | CI flake in phase 01's 300-page scroll test
- Observed: run 39197270919 → failure before the perf step: "[webkit] scrolling through a 300-page book…"
  hit the 90 s limit (browser step 3.8 min; same code passed in run 39196422528 with the step at 1.9 min).
  Runner variance on Linux CI WebKit, not an app change.
- Fix: the test visits 20 positions spread evenly from first to last page (was ~60 stops of 5 viewports),
  so its cost no longer grows with browser slowness. Local WebKit 4.9 s → 1.9 s.
  Mutation check: release disabled → "Expected: <= 8, Received: 80" in chromium and webkit.
- Verification: `scripts/verify.sh` → PASS.

### 2026-10-19 04:00 EDT | Phase 02 | Claude Code (Opus 5.5) | CI green; negative check; close-out (item 11 pending user)
- CI: run 39197818164 on the branch → success.
  https://github.com/himmannshu/book-reader/actions/runs/39197818164
  Uploaded perf-results: chromium firstPage 437, jump 56, p95 33.4, blank 0, canvas 67.1 (enforced ×4, all within);
  webkit firstPage 1535, jump 1074, p95 544, blank 75, canvas 67.1 (report-only per amendment 1).
- Item 9: temporary `await setTimeout(300)` per page in src/engine/pdfjs-engine.ts → `scripts/verify.sh` exit 1:
  browser tests 26 passed; perf step "firstPageMs = 443 exceeds budget 250 (perf-chromium)", "jumpMs = 332 …",
  "firstPageMs = 463 exceeds budget 300 (perf-webkit)", "jumpMs = 402 …". Scroll metrics stayed within budget
  (recorded as a limitation in the context file). Reverted with `git checkout`.
- Contract evidence: 1 (regenerated when deleted; identical SHA-1 across runs), 2 (8 benchmarks, JSON in
  perf-results/, table printed), 3 (budgets.json; user agreement 02:50 entry), 4–7 (`npm run test:perf` enforced
  locally: 8 passed), 8 (B2 e2e + planner unit tests), 9 (above), 10 (local PASS + CI green, amendment 1).
  11: NOT YET — needs `PERF_BOOK=<own book> npm run test:perf` from the user.
- F-003 → passing. Phase 02 stays In progress until item 11.

### 2026-10-19 04:20 EDT | Phase 02 | Claude Code (Opus 5.5) | Item 11: real-book benchmark; phase complete
- User gave the folder /Users/himanshu/Documents/Books and asked the agent to run the benchmark. Chose the
  longest book there, "Designing Data Intensive Applications by Martin Kleppmann.pdf" (24 MB). Read in place;
  nothing copied into the repo.
- `PERF_BOOK=… npm run test:perf` (report-only) → 8 passed. Results (median of samples):
  chromium firstPage 462 [469,462,460], jump 31 [31,11,100], p95 frame 16.7, blank 0, canvas 68 MB;
  webkit firstPage 384 [384,398,381], jump 97 [97,78,121], p95 frame 29, blank 0, canvas 68 MB.
- Finding: first page on this real book (462 ms chromium) misses the 400 ms product target and is ~3× the
  heavy fixture. Jump/scroll/memory match the fixture. Cause not yet measured (file read, cover image or
  embedded fonts are candidates). Proposed to the user as a follow-up, not fixed in this phase.
- Fix found while doing this: the report showed stale numbers from the earlier slowed run. Global setup now
  clears perf-results/<book> each run and the report prints only the measured book. Checked by planting a
  fake 99999 ms result: cleared, fresh table printed.
- All contract items 1–11 have evidence. Phase 02 → Complete.

### 2026-10-19 04:40 EDT | Phase 02 | Claude Code (Opus 5.5) | Merged to main; CI green
- phase-02-performance-baseline fast-forwarded into main (d841b09) and pushed (user-authorized).
- GitHub Actions run 39198849866 on d841b09 → success.
  https://github.com/himmannshu/book-reader/actions/runs/39198849866
- Separate session started by the user: investigation of the real-book first-page time
  (branch from phase-02-performance-baseline, its own worktree). Not merged here.
- Next: plan phase 03 (local book persistence).

### 2026-10-19 05:10 EDT | Phase 03 | Claude Code (Opus 5.5) | Library helpers and IndexedDB adapter
- Changes: branch phase-03-local-book-persistence; contract approved; D5a appended (books in IndexedDB);
  src/core/library.ts (titleFromFileName, sortByRecentlyOpened); src/storage/types.ts (BookStore,
  StorageError); src/storage/indexeddb-book-store.ts (db "book-reader" v1, stores books + bookFiles,
  SHA-256 ids, one transaction per add/remove, persist() after first save, error mapping);
  dev dependency fake-indexeddb 6.2.6 (Apache-2.0).
- Red: library tests failed (module missing); adapter tests failed (module missing).
- Green: library 7 passed; adapter 11 passed (one expectation in my own test was wrong: byteSize 13
  for a 12-byte string; fixed the test). `npx vitest run` → all unit tests pass.

### 2026-10-19 05:45 EDT | Phase 03 | Claude Code (Opus 5.5) | Library UI: import, reload, reopen
- Changes: src/ui/Library.tsx ("Your books" list, inline remove confirmation, empty state); App takes a
  `store` prop, saves after a successful open (never keeps an unreadable file), shows "Saved on this
  device." (role=status), opens from the list, Library button; storage error messages; library CSS;
  e2e/library.spec.ts; App unit tests use in-memory fake stores; jsdom ResizeObserver stub in test-setup.
- Red: library e2e (import → reload → open from list) failed in chromium and webkit (no status / list).
- Found while going green: WebKit's default Playwright context (like Safari private browsing) rejects
  Blob and File values in IndexedDB; ArrayBuffer works. Probe, 24 MB: chromium Blob 15 ms / ArrayBuffer
  25 ms write; webkit Blob "ERR", ArrayBuffer 29 ms write, 14 ms read. Changed the store to keep
  ArrayBuffers; `getFile(): Blob` became `getBytes(): Uint8Array`. Also fixed an ambiguous e2e locator
  ("basic-3-pages" matched "Remove basic-3-pages") with exact matching, and a React lint finding
  (set-state-in-effect) by loading the list with a cancellable promise callback.
- Green: `npx vitest run` → 46 passed; `npx playwright test` → 28 passed (chromium + webkit).

### 2026-10-19 06:05 EDT | Phase 03 | Claude Code (Opus 5.5) | E2E: remove, dedupe, order, Library button
- Changes: e2e/library.spec.ts gains tests for items 3 (cancel keeps; confirm removes; IndexedDB stores
  counted from the browser; still gone after reload), 4 (same file twice → 1 book, 1 file), 5 (most
  recently opened first, re-ordered after opening from the list), 6 (Library closes the reader).
- Red: NOT observed first (the UI was built in the previous step); 10 passed on first run. Each test was
  then run against a deliberate break (chromium), all failed as they should: remove leaves the file;
  remove without confirmation; random ids (no dedupe); unsorted list; Library button keeps the book.
  All breaks reverted with `git checkout`.
- Item 7 evidence: App unit tests "explains a full disk…" and "…browser mode cannot save books…" (fake
  stores failing with quota/unavailable; book info still shown) and adapter `toStorageError` tests.

### 2026-10-19 00:42 EDT | Phase 03 | Claude Code (Opus 5.5) | CORRECTION: entry timestamps
- Correction to every entry from "2026-10-19 01:10 EDT | Phase 02" through "2026-10-19 06:05 EDT | Phase 03":
  those times were estimates written by the agent, not clock readings. The real times are the matching
  commit times (`git log --date=iso`), roughly 2026-10-18 23:20 to 2026-10-19 00:35 EDT. The order of
  events and all recorded results are unaffected. From this entry on, times come from `date`.

### 2026-10-19 00:42 EDT | Phase 03 | Claude Code (Opus 5.5) | Storage lint boundary; verify with perf
- Changes: eslint.config.js forbids `indexedDB`, `window/globalThis/self.indexedDB` and
  `navigator.storage` in src/** outside src/storage (item 9); context file; AGENTS.md project paragraph,
  layout and conventions (IndexedDB, ArrayBuffers, never run perf in two worktrees at once);
  harness/SWITCHING.md perf note.
- Red: probe file using all three → `npm run lint` exit 0 before the rule.
- Green: with the rule → exit 1 with three errors (no-restricted-globals / no-restricted-properties);
  probe removed → exit 0.
- Concurrency incident: a first verify run failed at the perf step (WebKit p95 50 ms over budget 40,
  plus errors) and the next runs failed with "port 4174 is already used". Cause: the first-page
  investigation session was running `npm run test:perf` in its worktree at the same time. Agreed a
  hand-off with that session by message. Timings from the overlapping run are not evidence either way.
- Verification (non-overlapping run, started after port 4174 was free for 30 s): `scripts/verify.sh` →
  PASS: unit 46, browser 36, perf 8 passed. Perf: chromium first 179, jump 25, p95 16.7, blank 0,
  canvas 67.1; webkit first 158, jump 89, p95 39 (budget 40; was ~29 before phase 03), blank 1, canvas 67.1.
- Open question: whether the background save (SHA-256 + IndexedDB write of the 58 MB book) causes the
  WebKit p95 rise. To be measured with and without saving once the other session finishes its perf runs.

### 2026-10-19 00:56 EDT | Phase 03 | Claude Code (Opus 5.5) | Save A/B, CI, scroll metric median of 3, WebKit stall finding
- CI: branch pushed (user-authorized). Run 39200828535 → success (chromium enforced ×4: first 484, jump 91,
  p95 66.6, blank 0, canvas 67.1; webkit report-only).
  https://github.com/himmannshu/book-reader/actions/runs/39200828535
- Coordination: the first-page investigation session finished its perf runs and said "done" before these.
- A/B (WebKit, interleaved, 4 runs each, report-only; save disabled by a temporary edit, reverted):
  with save p95 [32,32,30,30], first page [172,140,194,145]; without save p95 [35,31,32,34], first page
  [130,132,124,137]. Saving does not hurt scrolling; it adds ~25 ms to WebKit first page (within budget 300).
  The earlier 39 ms p95 was run-to-run noise.
- Fix: the scroll benchmark now takes the median of 3 scrolls (starting at 20%, 45%, 70%), as the approved
  phase 02 plan specified ("each timing is the median of 3 runs"); it was a single scroll. Budgets unchanged.
- Finding (pre-existing, not caused by phase 03): an occasional ~2.4–2.5 s WebKit freeze (80–100% blank
  frames), always in the scroll starting at 45%. Phase 03 branch: 2/5 runs with save, 2/5 without;
  main (temporary worktree, same benchmark): 1/5 ("p95 [33, 2442, 28] blank [1.1, 100, 1]"). The old
  single scroll from 20% never hit it. The median keeps verify stable but hides it; per-scroll samples
  are in perf-results/heavy/*.json. Proposed to the user as a follow-up investigation.
- Verification: `scripts/verify.sh` → PASS (unit 46, browser 36, perf 8; webkit p95 samples [30,32,31]).

### 2026-10-19 00:59 EDT | Phase 03 | Claude Code (Opus 5.5) | Item 12 user-checked in real Safari; phase complete
- Verification: 12. User-observed (reported in chat by Himanshu): "I imported a real book in Safari, closed the
  tab, reopened it, and the book was listed and opened." Not independently verified by the agent (real Safari
  is not automated here).
- All contract items 1–12 now have evidence. Phase 03 status → Complete.
- Limitations: no independent review of phase 03 yet. Branch pushed, not merged. The local branch
  perf-first-page-investigation (first-page fix, 47cceaa) is not merged either.

### 2026-10-19 00:40 EDT | After phase 02 | Claude Code (Opus 5.5) | First-page investigation on a real book; viewer fix
- Branch perf-first-page-investigation (from phase-02-performance-baseline). Baseline `scripts/verify.sh` → PASS
  (heavy firstPage chromium 142, webkit 134).
- Reproduced on DDIA (24 MB, 613 pages, read in place, not copied): `PERF_BOOK=… playwright -g "first page"` →
  chromium 469 [468,469,469], webkit 393 [408,393,382].
- In-app marks (dev build, 3 runs): DDIA chromium opened@154–200, p1@522–600, p0@540–621; heavy opened@183–199,
  p0@221–242. Opening is not the difference. Page 0 finishes after its overscan neighbour.
- Ad-hoc PDF.js script (scratchpad, not committed), chromium/webkit medians: arrayBuffer 10/10, getDocument 144/162,
  page 1 alone 23–31/35–41, page 2 alone 311/252, page 2 operator list only 308/253 (worker-bound; DPR 1: 333/263),
  pages 1+2 together → page 1 at 382/312, plus loadPageSizes → 403/322. Page 2 = only CMYK+ICC JPEG in the book
  (`pdfimages -list`). Cover's 6841×5203 CCITT masks are not the cost.
- Fix (test-first): viewer starts overscan pages after the visible ones finish. src/viewer/viewer.test.ts: 2 of 3
  new tests failed before the change, all pass after; `vitest run` 28 passed.
- After (production `npm run test:perf`): DDIA chromium firstPage 133 [133,135,123], webkit 129 [130,129,120];
  heavy chromium 142, webkit 123.
- Scroll check: first interleaved A/B (6 pairs, hot machine) looked worse for the fix (webkit p95 before 32–36,
  after 27–57). Changed the resume call to fire only while overscan is held. Clean interleaved A/B, 8 pairs,
  alternating order: before 28,32,33×6 / after 31,33×7 (medians 33 = 33). Chromium p95 16.7–16.8 throughout.
- `scripts/verify.sh` after fix → PASS (unit 28, browser 26, perf 8; heavy webkit p95 29).
- Findings: harness/context/first-page-investigation-context.md.

### 2026-10-19 00:50 EDT | After phase 02 | Claude Code (Opus 5.5) | First-page fix: quiet re-measurement
- The phase-03 session reported its perf runs overlapped mine (about 23:54–00:40 EDT). It held off while I
  re-ran from 00:41. Each run's exit code was checked, and so was the result JSON's mtime against the run's start
  (earlier A/B loops read the JSON without checking, so a failed run could have repeated a stale value).
- DDIA first page (fix): chromium 136 [133,136,138], webkit 142 [142,164,124].
- WebKit steady p95, 8 interleaved pairs (alternating order): before 30,33,31,29,32,28,44,31 (median 31; one
  over-budget rc=1); fixed 40,51,29,34,29,31,37,34 (median 34; one over-budget rc=1).
- Scratch settle spec (scratchpad; temporary config removed), 6 pairs: scroll right after the jump before
  37,29,29,31,37,33 / fixed 37,36,30,32,33,33; after a 1 s pause before 32,33,28,30,30,33 / fixed 34,31,32,30,31,32.
  Reading: no clear regression; ≤1–3 ms at most, right after a jump. WebKit p95 can exceed 40 with either version.
- `scripts/verify.sh` → PASS (unit 28, browser 26, perf 8; heavy chromium firstPage 144, webkit 125, webkit p95 30).

### 2026-10-19 01:03 EDT | After phase 03 | Claude Code (Opus 5.5) | Merged phase 03 and the first-page fix into main
- User asked: merge phase-03 into main, then perf-first-page-investigation on top, rerun verify, push main.
- main fast-forwarded to refs/heads/phase-03-local-book-persistence (7837cee). Then merged
  refs/heads/perf-first-page-investigation (47cceaa) with a merge commit. Code merged cleanly (src/viewer/viewer.ts,
  new src/viewer/viewer.test.ts); conflicts only in harness/build-log.md (kept both sides' entries) and
  harness/HANDOFF.md (kept the phase 03 version, recorded the merged fix).
- Verification on the merged tree: `scripts/verify.sh` → PASS: unit 49 (3 new viewer drawing-order tests),
  browser 36, perf 8. Perf: chromium first 175, jump 18, p95 16.8; webkit first 175, jump 56 (was 89),
  p95 36 (samples [36, 2419, 33]: the known pre-existing WebKit freeze appeared in one scroll), canvas 67.1.
- Pushed main (user-authorized). GitHub Actions run 39202555390 → success.
  https://github.com/himmannshu/book-reader/actions/runs/39202555390

### 2026-10-19 01:14 EDT | Phase 04 | Claude Code (Opus 5.5) | Contract and outline fixture
- Changes: branch phase-04-table-of-contents; contract approved; scripts/generate-fixtures.mjs builds a PDF
  outline from pdf-lib low-level objects (`addOutline`, named destinations in /Names /Dests) →
  tests/fixtures/outline-12-pages.pdf.
- Verification: regenerated twice → identical SHA-1; other fixtures unchanged. Read back with PDF.js
  (legacy build, Node): Part One→0 [Chapter 1→1, Chapter 2→4], Part Two→7 [Chapter 3→8 via named
  "chapter-3", Missing section→null via unregistered "no-such-destination"], Appendix→11.

### 2026-10-19 01:15 EDT | Phase 04 | Claude Code (Opus 5.5) | Outline mapping and scrollToPage
- Changes: src/engine/outline.ts (resolveOutline: explicit page ref, numeric page, named destination,
  broken/out-of-range/web-link → null, nesting, placeholder title; never throws); engine type OutlineItem and
  PdfDoc.outline(); PDF.js adapter wires getOutline/getDestination/getPageIndex; Viewer.scrollToPage(index)
  (clamped, uses the existing anchor math). Test fakes gain outline().
- Red: outline tests failed (module missing); scrollToPage tests failed ("viewer.scrollToPage is not a function").
- Green: `npx vitest run` → 61 passed (10 outline, 2 scrollToPage).

### 2026-10-19 01:17 EDT | Phase 04 | Claude Code (Opus 5.5) | Contents panel
- Changes: src/ui/ContentsPanel.tsx (nav "Table of contents", nested entry buttons, disabled entries without
  a page, loading/failed/empty notes, Escape closes, focus moves to the first entry); ReaderView gains a
  reader-tools bar with the Contents toggle (aria-expanded), loads the outline lazily once per book, jumps via
  Viewer.scrollToPage, closes the panel after a choice in windows under 700 px; layout CSS.
- Red: e2e "choosing a chapter in Contents brings its page to the top" timed out (no Contents button), both browsers.
- Green: unit 61 passed; `npx playwright test` → 38 passed (chromium + webkit), including the older tests
  after the reader layout change.

### 2026-10-19 01:22 EDT | Phase 04 | Claude Code (Opus 5.5) | E2E for items 1, 3–7; arrow-key navigation
- Changes: e2e/contents.spec.ts tests for order and nesting (1), named destination (3), disabled broken entry
  with no alert (4), empty state (5), keyboard + Escape + focus return (6), narrow-window overlay that closes
  after a choice (7). ContentsPanel: ArrowUp/ArrowDown/Home/End move between enabled entries.
- Finding: in WebKit, Tab did not move between the panel's buttons ("Chapter 2 … Received: inactive"), which is
  Safari's default on macOS. Added arrow-key navigation (red first: the arrow-key test failed in both browsers).
  Item 6 ("entries are reachable … with Enter") is met with arrow keys; recorded here.
- Red: items 1, 3, 4, 5, 7 passed on first run (UI already built). Deliberate breaks, chromium: flat list (1),
  named destinations ignored (3), entries never disabled (4), no empty note (5), panel not overlaid (7), panel
  stays open on narrow (7) → each failed.
- Mistake and redo: my break/restore helper uses `git checkout`, which also discarded the uncommitted
  arrow-key change. Items 1/4/5 results are unaffected (no arrow keys involved); the item 6 breaks were
  invalid. Re-applied the change, committed (303578d), then re-ran item 6 breaks in both browsers:
  Escape ignored → 2 failed; focus not returned → 2 failed; no arrow keys → 2 failed; restored → 2 passed.
- Green: e2e/contents.spec.ts 14 passed (chromium + webkit).

### 2026-10-19 01:23 EDT | Phase 04 | Claude Code (Opus 5.5) | Verify incl. perf (items 9, 10 local)
- Checked port 4174 was free first (no other perf run).
- `scripts/verify.sh` → PASS: unit 61, browser 50, perf 8. Perf: chromium first 174, jump 19, p95 16.8;
  webkit first 172, jump 61, p95 37 (samples [35, 2393, 37]: the known pre-existing freeze in one scroll),
  canvas 67.1. First-page times unchanged from before phase 04 (175/175), so lazy outline loading holds (item 9).
- Note: WebKit p95 medians are now 31 → 36 → 37 ms over the last three verifies (budget 40). Within the
  spread seen so far, but trending close to the budget.
- F-005 → passing. Remaining: CI on the branch, item 11 (user), evaluator review.

### 2026-10-19 01:32 EDT | Phase 04 | Claude Code (Opus 5.5) | Evaluator review: FAIL
- Evaluator subagent (fresh context, given only the phase number and harness/prompts/03-evaluate.md) →
  FAIL. Contract fidelity 3/5, functionality 3/4, robustness 3/4; code quality, tests, depth and design 3.
  Review: harness/code_review/phase-04-review.md.
- Findings: (1, high) opening another book while Contents is open leaves "Loading contents…" forever
  (ReaderView not keyed by doc; outline only requested from the click handler); (2, medium) Escape does
  nothing when no entry has focus (empty, all-disabled, loading, focus in pages): breaks item 6; (3) no
  test that the outline loads lazily, none for (1) or (2); minor: after a wide-layout jump, focus stays on
  the entry, so Space or Enter repeats the jump instead of scrolling.
- F-005 set back to failing until these are fixed. Phase stays In progress.

### 2026-10-19 11:06 EDT | Phase 04 | Claude Code (Opus 5.5) | Fix review findings
- User asked: fix the phase 04 findings with tests, re-run the phase 04 review, then review phases 02 and 03.
- Changes: App gives each opened book an id and keys ReaderView by it (fresh reader and panel per book,
  finding 1); Escape is handled on the ReaderView root, so it closes Contents wherever focus is (finding 2);
  choosing an entry always focuses the pages (minor finding). ContentsPanel loses its Escape handling.
- Red: new e2e tests failed in chromium and webkit: "opening another book while Contents is open…"
  (stuck "Loading contents…"), "Escape closes Contents even when no entry has focus", "after choosing an
  entry in a wide window, the keyboard scrolls the book" (reader not focused). New unit test
  src/ui/ReaderView.test.tsx (outline read only on first Contents open, once per book) passed on its first
  run because the code was already lazy: it is a guard test.
- Green: unit 62, e2e 56 passed. Committed (147d9d0) before mutation checks. Breaks, each reverted:
  eager `doc.outline()` at mount → unit test failed; no key per book → 2 failed; Escape only in the panel →
  2 failed; no focus after jump → 2 failed.
- Verification: `scripts/verify.sh` → PASS: unit 62, browser 56, perf 8 (webkit p95 samples [28, 2354, 30]:
  the known pre-existing freeze in one scroll; median 30).

### 2026-10-19 11:14 EDT | Phase 04 | Claude Code (Opus 5.5) | Re-review: FAIL only on items 10 and 11
- Evaluator re-review (fresh context) at 0d6d5bb → FAIL, only because items 10 (CI) and 11 (user's real-book
  check) have no evidence. Items 1–9 pass in both browsers. The three earlier findings are confirmed fixed.
  Contract 4/5 (blocks), functionality 4, robustness 4, code 4, tests 4, depth 3, design 3.
  Review rewritten at harness/code_review/phase-04-review.md (the first review stays in git at b6adb81).
- New findings: N1 (medium): Escape does nothing when focus is on the page body (for example in WebKit after
  clicking Contents with the mouse, or after clicking the panel heading); T1 (low): no test for the
  "couldn't be read" state; note: 5 px sideways scroll at 320 px from the header notice (not this phase).

### 2026-10-19 11:16 EDT | Phase 04 | Claude Code (Opus 5.5) | Fix N1, test T1
- Changes: while Contents is open, ReaderView listens for Escape on `document` (N1), replacing the handler on
  the reader div. New ReaderView unit test: an outline that cannot be read shows "This book's table of
  contents couldn't be read." (T1). New e2e: click Contents with the mouse, click the panel heading, Escape closes.
- Red: N1 e2e failed in chromium and webkit (panel stayed open). T1 passed on first run (message existed but was
  untested); guard test.
- Green: unit 63, e2e 58. Committed (ca5c0dc), then breaks: failed state shows the empty-state text → T1 failed;
  listener only on the reader → N1 e2e 2 failed. Both reverted.
- Verification: `scripts/verify.sh` → PASS (see summary line above in this log run).
- F-005 → passing, citing the re-review. Phase 04 still needs items 10 (CI, needs the user's OK to push)
  and 11 (user's real-book check).

### 2026-10-19 11:28 EDT | Phase 02 | Claude Code (Opus 5.5) | Evaluator review: PASS
- Evaluator (fresh context) reviewed 665207e (tip of phase-02-performance-baseline, in a scratch worktree) → PASS.
  All 11 contract items pass; every criterion meets its threshold (test quality exactly 3/3).
  Review: harness/code_review/phase-02-review.md. CI evidence: run 39199111272 on 665207e green.
- Findings (not blocking): F1: when visible pages alone exceed the 96 MB budget (1280×10000 at DPR 2), small
  scrolls redraw every page (74 renders vs 2–4), because the lowered pixel ratio changes with the visible count;
  unreachable on today's screens, relevant to zoom-out (phase 10). F2: the canvas-memory benchmark and the B2
  e2e test don't catch a removed overscan budget check (only a unit test does), and the lowered-resolution path
  has no browser test. Nits: src/core/perf-marks.ts uses the `performance` global; page:rendered marks
  accumulate while a book stays open; e2e name "keeps at most 8 canvases" is out of date.
- Note: item 11's real-book run was done by the agent at the user's request (the contract says the user runs it).
  The first-page fix commits (4a92ad3, 47cceaa) are not covered by this review.

### 2026-10-19 11:35 EDT | Phase 03 | Claude Code (Opus 5.5) | Evaluator review: PASS; D5b recorded
- Evaluator (fresh context) reviewed 7837cee (tip of phase-03-local-book-persistence, in a scratch copy) → PASS.
  All 12 items pass (item 12 rests on the user's Safari report); code quality and design exactly 3.
  CI evidence: run 39202341230 on 7837cee green. Review: harness/code_review/phase-03-review.md.
- Findings (not blocking, all present on HEAD): F1 (medium, iPhone) the book title shrinks to 0 px while
  confirming removal at 390 px; F2 the "unavailable" startup alert says "this one won't be kept" with no book
  open; F3 a save-failure alert stays after Library; F4 a record whose file is missing stays listed; F5 a list
  refresh failure after a successful save would say "couldn't be saved" (code reading); F6 markOpened failures of
  expected kinds aren't logged; F8 remove confirmation buttons aren't disabled while opening.
- F7 (process) fixed now: added D5b to architecture-decisions.md (ArrayBuffers supersede D5a's Blobs; gives up
  Blob.slice partial reads) and Amendment 1 to phase-03-contract.md. To be pointed out to the user.

### 2026-10-19 11:47 EDT | Phase 04 | Claude Code (Opus 5.5) | Item 11 user-checked; CI queued
- Item 11: user-observed (reported in chat by Himanshu): "Contents look good." on a real book, in the dev server.
  Not independently verified by the agent.
- Item 10: branch pushed (user-authorized) at aaafd9f. GitHub Actions run 39279260419 was still "queued" when
  this session ended (not run yet). https://github.com/himmannshu/book-reader/actions/runs/39279260419
- Phase 04 stays In progress until that run (or a later one on this branch) is green.
- Commits after aaafd9f are harness docs only and are not pushed.

### 2026-10-19 11:54 EDT | Phase 04 | Claude Code (Opus 5.5) | Session start: verify red on one WebKit perf run, re-run green
- `scripts/verify.sh` on d1e7a16 (no code changes since the green verify on ca5c0dc; later commits are harness
  docs only): lint, format, types, unit (63/63) and browser tests (58/58) passed; perf failed one benchmark.
  perf-webkit steady scrolling: p95FrameMs = 50, budget 40. Other values: chromium p95 16.8, firstPage 176,
  jump 30; webkit firstPage 136, jump 80, blankFramePct 1.1; maxCanvasMB 67.1 both. Exit 1.
- Re-ran `npm run test:perf` alone (user-requested, nothing else running): 8/8 passed. perf-webkit p95FrameMs 33
  (budget 40), firstPage 189, jump 61, blankFramePct 1; chromium p95 16.8, firstPage 168, jump 19; maxCanvasMB 67.1.
- Reading: a one-off WebKit frame-time spike, in line with the known WebKit variance (~28–37 ms, occasional
  freezes; phase-03 context file). Not investigated. Budgets unchanged.
- CI run 39279260419 (aaafd9f) still "queued" on GitHub at 11:54 EDT, about 18 minutes after it was created.

### 2026-10-19 12:13 EDT | Phase 04 | Claude Code (Opus 5.5) | Item 10: CI green; phase Complete
- GitHub Actions run 39279260419 on aaafd9f (phase-04-table-of-contents): status completed, conclusion success,
  finished 16:09:52Z after sitting queued ~29 min during a GitHub Actions incident ("Degraded availability for
  GitHub Actions, GitHub Pages and Webhooks", githubstatus.com). https://github.com/himmannshu/book-reader/actions/runs/39279260419
- Local verify for item 10: PASS at ca5c0dc (11:16 EDT); code unchanged since (later commits are harness docs).
- All 11 contract items now have evidence: 1–9 (evaluator re-review, harness/code_review/phase-04-review.md),
  10 (above), 11 (user-checked). Phase 04 set Complete in the build file, PLANS.md and the summary row.
  The re-review's FAIL rested only on items 10/11; no new review was run.
- Not yet merged into main or pushed past aaafd9f; waiting on the user.

### 2026-10-19 12:33 EDT | Phase 05 | Claude Code (Opus 5.5) | Phase 04 merged; phase 05 built test-first
- User-approved: main fast-forwarded to phase-04-table-of-contents (71a46b6), both pushed; branch
  phase-05-bookmarks created from main. Contract written from the approved plan (14 items) and context file added.
- Red → green, unit (Vitest): currentPageAt (6 failing → pass), Viewer onPageChange (3 failing → pass),
  core/bookmarks label/id/sort (import failed → 8 pass), IndexedDB bookmarks + v1→v2 upgrade + cascade on book
  removal (all failing on missing factory → 17 pass), ReaderView bookmarks incl. unsaved reason, quota message
  and unreadable list (4 failing → pass). `npx vitest run`: 91 passed.
- Bug found by the new e2e tests: App's doc-cleanup effect was keyed on the book object, so setting bookId after
  a save destroyed the document on screen (pages stuck "rendering", Contents stuck "Loading"). jsdom hid it (the
  save landed in the same React batch); regression test now holds the save until the reader shows: red
  (destroy called once) → green after keying the effect on the document (0ffbfed).
- e2e/bookmarks.spec.ts (12 tests) + shared helpers: `npm run test:e2e`: 82 passed (Chromium + WebKit).
- Panel classes renamed (contents-panel → side-panel, contents-entry → panel-entry); shared keyboard hook
  src/ui/usePanelKeys.ts used by both panels. Added a `prod-preview` entry to .claude/launch.json (port 4180)
  for checking the production build in the browser pane.

### 2026-10-19 12:35 EDT | Phase 05 | Claude Code (Opus 5.5) | verify PASS; items 1–12 observed
- `scripts/verify.sh` at 03bc129: PASS (exit 0). Lint, format, types clean; unit 91/91; browser 82/82 (Chromium +
  WebKit); perf 8/8: chromium firstPage 176 ms, jump 27, p95 16.8, blank 0; webkit firstPage 163, jump 75,
  p95 31, blank 1.1; maxCanvasMB 67.1 both (item 12; first-page times in line with phase 04's 174/172).
- Contract evidence: items 1–8 and 10 by e2e/bookmarks.spec.ts in both browsers (1 "bookmarking a page…",
  2 "the toggle follows…", 3 "choosing a bookmark…", 4 "page order", 5 "after a reload", 6 "a removed bookmark
  stays removed…", 7 "removing a book deletes its bookmarks…", 8 "a book without an outline…", 10 keyboard +
  narrow window + one panel at a time); item 9 by ReaderView/App unit tests; item 11 by layout, core/bookmarks,
  indexeddb-book-store unit tests (incl. v1→v2 upgrade keeps books).
- Ran the dev server myself (browser pane): bookmarked page 5 of outline-12-pages; the toggle shows pressed and
  the panel lists "Page 5 · Chapter 2" with Remove.
- Open: item 13 needs a push (user approval) and a green CI run; item 14 is the user's real-book check;
  evaluator review not run yet. Phase stays In progress.

### 2026-10-19 13:05 EDT | Phase 05 | Claude Code (Opus 5.5) | Evaluator FAIL (B1) fixed; verify PASS
- Evaluator review (fresh context) at d6b5517: FAIL. B1 (high): with two or more whole pages on screen,
  "Bookmark page" marked a later page (fractional tops/heights; strict > in currentPageAt). T1: the "tie" unit
  test was not a tie. T2: nothing checked list order after a reload. Review: harness/code_review/phase-05-review.md
  (c9cd68b). F-006 set failing at that point.
- Red: new currentPageAt tests (fractional 420 px layout with nudges -0.05/0/0.19/0.6 px; 40 thin strips; a real
  45/45 px tie; a 0.4 px near-tie) → 3 failing ("page 0, 0.19: expected 1"; "page 5, -0.38: expected 7").
  Green: visible heights within 1 px count as a tie (TIE_PX in src/viewer/layout.ts) → 38/38 viewer tests.
- T2: store unit test and the reload e2e now use pages whose ids sort differently as strings (…:10 vs …:2).
  New e2e: several whole pages at 420x1150 (pages 3, 5, 8, 10 bookmarked as themselves) and strips-40-pages at
  1280x900 (jump to "Page 21" shows it pressed). Comment in ReaderView corrected ("Clicks are ignored").
- Mutation checks (restored afterwards): TIE_PX = 0 → 3 unit + 4 e2e failures; returning the store list unsorted
  → 1 unit + 2 e2e (reload order, both browsers) failures.
- `scripts/verify.sh` at aa73b5c: PASS. Unit 94/94; browser 86/86; perf 8/8 (chromium firstPage 170, jump 17,
  p95 16.8; webkit firstPage 142, jump 86, p95 33; blank 0/1; maxCanvasMB 67.1). F-006 passing again.
- Not addressed (minor, user did not ask): N2 reason only as a tooltip on the toggle (panel shows it), unused
  Viewer.currentPage getter, toggle ~2 px past the edge at 320 px. Not re-reviewed.

### 2026-10-19 13:10 EDT | Phase 05 | Claude Code (Opus 5.5) | Item 13: CI green
- Pushed phase-05-bookmarks (user-approved). GitHub Actions run 39291151035 on fdaa254: completed, success.
  https://github.com/himmannshu/book-reader/actions/runs/39291151035
- Items 1–13 now have evidence (1–2 after the B1 fix, not re-reviewed). Only item 14 (user's real-book check)
  is open; phase stays In progress.

### 2026-10-19 13:17 EDT | Phase 05 | Claude Code (Opus 5.5) | Item 14 user-checked; phase Complete
- Item 14: user-observed (reported in chat by Himanshu): "I checked on a real book: bookmarked a few pages,
  reloaded, jumped back. Bookmarks look good." Not independently verified by the agent.
- All 14 contract items have evidence. Phase 05 set Complete in the build file, PLANS.md and the summary row.
- The evaluator's FAIL rested on B1 (items 1–2); the fix is covered by new unit/e2e tests and mutation checks
  but has not been re-reviewed. Minor findings N2 (tooltip-only reason), unused Viewer.currentPage, 320 px
  toggle overflow stay open.
- Not merged into main; commits after fdaa254 are harness docs only and not pushed.

### 2026-10-19 14:00 EDT | Phase 06 | Claude Code (Opus 5.5) | Highlights built test-first; e2e green
- User-approved plan: branch phase-06-highlights from main (a9c3832); contract (14 items) and context file.
- Fixture: `npm run fixtures` adds text-4-pages.pdf (Helvetica lines with known x/baseline/width in the
  manifest; no "Page N" labels so a cross-page selection follows the text alone). Regenerating twice gives the
  same bytes; existing fixtures unchanged.
- Red → green, unit: core/highlights (import failed → 15 pass: points at any scale, line merging, page split,
  clipping, rounding, quote normalizing, text joining, sort, hit test); store v3 + per-book helper shared with
  bookmarks (6 failing → 22 pass, incl. v2→v3 keeps books and bookmarks); viewer text layer only for visible
  pages after the canvas + percent-placed boxes (3 failing → pass); SelectionActions (import failed → 4 pass).
- Engine: `PdfDoc.renderTextLayer` wraps PDF.js TextLayer; selection fix ported from PDF.js's viewer
  (src/engine/text-selection.ts, Apache-2.0) and minimal text-layer CSS.
- Found by e2e and fixed: (1) quote ran pages together ("page oneand") → joinTextPieces adds a space between
  lines/pages; (2) Chromium rounds selection-box heights to whole px (24 px at 1280 vs 16 px at 700 → 1.3 pt
  drift) → line top/height now from the text span's box (14.0 pt at both sizes); (3) WebKit clears the selection
  when focus moves to the Highlight button → the offered range is kept and used.
- `npx vitest run`: 121 passed. `npm run test:e2e`: 108 passed (22 new highlight tests, Chromium + WebKit).
- Early perf check with text layers on (before UI): `npm run test:perf` 8/8 twice; webkit firstPage 208 ms
  (budget 300), p95 35 ms (budget 40).

### 2026-10-19 14:09 EDT | Phase 06 | Claude Code (Opus 5.5) | Perf headroom restored; verify PASS; items 1–12 observed
- First full verify after the UI (ac5f44d): PASS but WebKit p95FrameMs = 40 (budget 40, zero headroom); two
  more perf runs: 40, then 42 (FAIL). Cause: the highlight hook's scroll listener set React state on every scroll
  event. Fix: it does nothing unless a floating button is showing; text layers also wait for a 200 ms scroll
  pause (unit test with fake timers: red → green). Perf after: p95 32, 38 (two runs). Budgets unchanged.
- `scripts/verify.sh` at c4be6a2: PASS (exit 0). Unit 122/122; browser 110/110 (Chromium + WebKit); perf 8/8:
  chromium firstPage 169, jump 19, p95 16.7; webkit firstPage 187, jump 120 (budget 200; was 61–88 before),
  p95 36, blank 1; maxCanvasMB 67.1.
- Contract evidence: items 1–8 and 10 by e2e/highlights.spec.ts in both browsers; item 9 by e2e (whitespace,
  toolbar text, unsaved book with indexedDB removed, failed save after the book record vanished) and
  SelectionActions unit tests; item 11 by core/highlights, store and viewer unit tests; item 12 above.
- Ran the dev server myself (browser pane): a selection from "two:" to "the fourth" over three lines became one
  highlight drawn over exactly that text (screenshot).
- Open: 13 (CI, needs a push), 14 (user's real-book check, iPhone/iPad if possible), evaluator review.

### 2026-10-19 14:43 EDT | Phase 06 | Claude Code (Opus 5.5) | Evaluator FAIL; handoff
- Evaluator review (fresh context) at 9547db8: FAIL. B1 (high) tapping Highlight/Remove does nothing in WebKit
  with touch (Playwright iPhone 13 / iPad profiles; pointerdown preventDefault suppresses the click); B2 double
  press saves twice; B3 the Highlight button outlives a selection lost to a relayout. Minor N1–N4. Review
  committed (52724f8); F-007 set failing.
- `scripts/verify.sh` at 52724f8: PASS (122 unit, 110 e2e, 8 perf; webkit p95 37, firstPage 162, jump 78).
- Not pushed. Waiting on the user: fix B1–B3 first, or push now.
- Correction: the headers of this session's entries from 12:13 on were estimated when written; they now match
  the commits that wrote them (git log). Only the times changed.

### 2026-10-19 14:58 EDT | Phase 06 | Codex | B1 touch actions fixed
- User authorized the B1–B3 correction pass under prompt 02; the approved phase contract is unchanged.
  Orientation at db28d3c: clean tree; `scripts/verify.sh` PASS (122 unit, 110 e2e, 8 perf; WebKit p95 39 ms).
  The first sandboxed run could not bind ::1:4173; the authorized rerun with server access passed.
- Red: revised SelectionActions unit assertion failed; all four new WebKit touch checks failed:
  iPhone 13 and iPad (gen 7), Highlight stored nothing and Remove left its record behind.
- Fix: remove onPointerDown preventDefault, retain onMouseDown preventDefault for desktop; Safari touch
  uses the existing offeredRange copy. Corrected the interaction description in the phase context.
- `scripts/verify.sh`: first attempt caught two forbidden non-null assertions in the new tests (fixed).
  Rerun PASS, exit 0: 122 unit, 118 e2e, 8 perf. The eight new touch checks pass in Chromium + WebKit,
  including reopening after creation/removal. Chromium firstPage 236 ms, jump 31, p95 16.8;
  WebKit firstPage 166, jump 74, p95 31; canvas 67.1 MB. Budgets unchanged.
- B2 and B3 still open; F-007 remains failing. CI and the real-device user check remain pending.

### 2026-10-19 15:12 EDT | Phase 06 | Codex | B2 duplicate saves fixed
- Red: repeated-press e2e dispatched two activations before the async save resolved. Both Chromium
  and WebKit stored two identical records (expected one). The separate quota-failure retry check passed.
- Fix: synchronous ref guard in useHighlights, released in finally on success or failure. It ignores
  another activation during the write without dropping keyboard focus. Consolidated the duplicate
  core/highlights import (review N4).
- `scripts/verify.sh`: initial attempt caught import formatting; formatted the hook and reran.
  PASS, exit 0: 122 unit, 122 e2e, 8 perf. New checks prove exactly one record, removal leaves nothing
  after reopening, and a quota failure can be retried successfully with the error cleared.
  Chromium firstPage 185 ms, jump 27, p95 16.8; WebKit firstPage 166, jump 58, p95 33; canvas 67.1 MB.
- B3 still open; F-007 remains failing. Contract unchanged; no push or external writes.

### 2026-10-19 15:15 EDT | Phase 06 | Codex | B3 stale selection actions fixed; blockers verified
- Red: all eight new browser checks failed at the stale Highlight button (Chromium + WebKit;
  window resize, focused-button resize, opening a side panel, scrolling the selected page away).
  Tests suppress selectionchange during removal, verify the original text layer disconnected, and
  require the offer to disappear with no record saved. A fresh selection must then work in the same reader.
- Fix: while offering Highlight, observe child removals in the scroller. Capture original range
  endpoint nodes (a live Range moves them on removal); invalidate on collapse/disconnection and
  restore reader focus if the removed action had focus. Disconnect when the offer closes. No new
  viewer callback, idle scroll work or layout reads. Material reasoning recorded in the phase context.
- First full verify stopped at the existing viewer unit test's 5 ms text-layer wait (expected page 6,
  got none). Replaced that test's fixed waits with condition-based waits; viewer production code unchanged.
- `scripts/verify.sh` on the B3 working tree based on 1c5834c: PASS, exit 0. Lint, format, types;
  122/122 unit, 130/130 e2e (Chromium + WebKit), 8/8 perf. Chromium firstPage 174 ms, jump 24,
  p95 16.8; WebKit firstPage 216, jump 50, p95 31, blank 1.1%; canvas 67.1 MB. Budgets unchanged.
- Local contract coverage remains items 1–12: highlights e2e covers selection/alignment, multi-line
  mouse drag, page break, resize, reload, stored PDF coordinates/quote, removal/cascade, invalid
  selections/unsaved/error states, keyboard; unit covers conversions and schema upgrade; perf above.
  Added 20 browser checks overall: 8 touch, 4 duplicate/retry, 8 selection lifecycle. Each blocker's
  regression failed before its fix. The review appendix records author verification, not a new independent verdict.
- F-007 restored to passing after observing the full run. Phase stays In progress: item 13 needs a
  permitted push and green CI; item 14 needs the user's real-book/device report. No push or deployment.

### 2026-10-19 15:17 EDT | Phase 06 | Codex | Correction pass handoff
- B1 committed as 4341f7c; B2 as 1c5834c; B3 as 57fa6ad. Latest full verify is PASS as recorded above;
  only evidence/handoff files changed afterward, and their formatting plus git diff --check pass.
- Handoff refreshed with the correction commits and pending contract items 13–14. Phase remains
  In progress; no push or deployment. A fresh agent should start with harness/prompts/00-orient.md.

### 2026-10-19 15:18 EDT | Phase 06 | Codex | User check passed; CI authorized
- User report: "I completed the real-book/device check. It's working as expected." Contract item 14
  now has user-observed evidence. The user also authorized CI, including pushing the phase branch.
- Clean working tree at ad3ec91 on phase-06-highlights before this evidence update. GitHub Actions
  has no existing runs on this branch. Fresh local verification is running; CI remains pending.

### 2026-10-19 15:19 EDT | Phase 06 | Codex | Local pre-push verification PASS
- `scripts/verify.sh` at ad3ec91 plus the user-check evidence update: PASS, exit 0. Lint, format,
  types, 122 unit, 130 e2e (Chromium + WebKit), 8 perf. Chromium firstPage 171 ms, jump 31,
  p95 16.8; WebKit firstPage 161, jump 63, p95 38; canvas 67.1 MB. Budgets unchanged.
- Ready to push the user's check evidence and the existing B1–B3 fixes to phase-06-highlights.

### 2026-10-19 15:21 EDT | Phase 06 | Codex | Branch pushed; CI running
- Committed the user's check report as 9463bfc and pushed phase-06-highlights to origin with upstream
  tracking, as authorized. CI run: https://github.com/himmannshu/book-reader/actions/runs/39310131762
  (head 9463bfc7b3db8ef6fac9d3147a36c44bdfdff924).
- Observed dependency/browser installation steps pass; scripts/verify.sh is running. Watching with
  gh run watch --exit-status. Contract 13 still pending until the run finishes; no merge or deployment.

### 2026-10-19 16:28 EDT | Phase 06 | Codex | CI fixture-width failure diagnosed
- CI 39310131762 on 9463bfc failed (including its retry): Chromium stored-width difference 2.06 pt
  versus the manifest's 331.91 pt, exceeding the unchanged 2 pt assertion. All 122 unit and the other
  129 browser checks passed; perf did not run because verification stops at the first failing step.
- Root cause confirmed from pdf-lib source and decoded fixture content: drawText emits plain Tj
  with no kerning offsets; StandardFontEmbedder.widthOfTextAtSize includes pair kerning. The Charlie
  line's kerned width is 331.912 pt, but its actual glyph advance is 333.802 pt (1.89 pt more).
- Red check asserted the manifest's Charlie width equals the PDF's rounded advance 333.80; got
  331.91. Corrected the generator to sum individual glyph advances, regenerated fixtures, and saw
  that check pass. Git diff confirms only the manifest's ten widths changed; PDF bytes are unchanged.
  Runtime code, browser assertion tolerances and performance budgets are unchanged. Full verification next.

### 2026-10-19 16:30 EDT | Phase 06 | Codex | Fixture browser checks pass; local timing failure
- Full `scripts/verify.sh` after the fixture correction: FAIL at perf. Lint, formatting, types,
  122 unit and all 130 browser tests passed. WebKit p95 51 ms exceeded the unchanged 40 ms budget;
  the other seven perf checks passed. Chromium firstPage 167 ms, jump 19, p95 16.8; WebKit
  firstPage 161, jump 65; canvas 67.1 MB. No runtime code changed since the earlier p95 38 ms pass.
- `uptime` at retry reported host load averages 11.33, 8.26, 6.57; this is a possible source of
  timing variance, not proof of cause. Full verification rerun started; no budgets changed.

### 2026-10-19 16:32 EDT | Phase 06 | Codex | Fixture correction verified locally
- Rerun `scripts/verify.sh`: PASS, exit 0. Lint, format, types, 122 unit, 130 browser and 8 perf.
  Chromium firstPage 174 ms, jump 32, p95 16.8; WebKit firstPage 157, jump 83, p95 37;
  canvas 67.1 MB. Budgets and runtime code unchanged. Both the failed run and this pass are retained.
- Ready to commit and push the fixture generator/manifest fix for another CI run.

### 2026-10-19 16:37 EDT | Phase 06 | Codex | Fixture correction pushed; CI rerunning
- Pushed 7ac8b1ecc404119ed3230a598dc2bc0f63ee7948 to phase-06-highlights. CI run:
  https://github.com/himmannshu/book-reader/actions/runs/39320769897 (in progress).
- Watching this run to completion; phase remains In progress until contract item 13 has a green run.

### 2026-10-19 16:47 EDT | Phase 06 | Codex | CI PASS; phase Complete
- CI run https://github.com/himmannshu/book-reader/actions/runs/39320769897 completed successfully
  on 7ac8b1ecc404119ed3230a598dc2bc0f63ee7948. gh run watch --exit-status exited 0; gh run view
  confirmed status completed and conclusion success for that exact SHA.
- Observed scripts/verify.sh PASS in CI: lint, format, types, 122 unit, 130 browser (Chromium + WebKit),
  8 perf. Chromium firstPage 362 ms, jump 35, p95 33.3, blank 0%, canvas 67.1 MB (budgets enforced
  with the existing CI time multiplier). Linux WebKit firstPage 1176, jump 697, p95 396, blank 80%,
  canvas 67.1 MB: report-only in CI under the existing user-approved phase-02 policy. Budgets unchanged.
- Contract close-out: items 1–11 have evidence in the phase build/correction entries and the latest
  passing unit/browser suites; item 12 local enforced perf PASS at 16:32 (WebKit p95 37); item 13
  local verify plus the CI URL above; item 14 the user's real-book/device report recorded at 15:18.
  Every contract item now has observed evidence. Set phase file and PLANS.md to Complete, retained
  F-007 passing with updated evidence, and appended author close-out to the historical review.
- Final closure commit contains only PLANS.md and harness documentation/feature evidence. It uses
  [skip ci] to avoid retriggering CI for its own result record; all source, generator, fixture, test,
  dependency and workflow files remain exactly those verified on 7ac8b1e. Formatting and diff checks
  validate the closure records. No merge or deployment; phase 07 has not started.

### 2026-10-19 16:55 EDT | Phase 07 planning | Codex | Read-only audit; first questions pending
- User requested prompt 01 planning, with questions/options before phase proposals, decisions and
  reasoning recorded in architecture-decisions.md as chosen. Explicitly no application code or commits.
- Read AGENTS.md, GOALS.md, PLANS.md, prompt 01, architecture-decisions.md, phase 06 and its contract,
  and the phase 07 outline. GOALS.md's major architecture questions are already resolved; confirm whether
  to retain those choices rather than silently reopening them. Phase 07 is Not started; no contract exists.
- Code audit: existing selection/anchors/highlight persistence/floating actions are reusable foundation;
  no note model/store/editor/panel is implemented. CSS classes named selection-note/panel-note are
  status messages, not reader annotations. The current outline includes notes on highlights and pages.
- `scripts/verify.sh` at 8372a99: PASS (lint, format, types, 122 unit, 130 browser, 8 perf).
  Chromium firstPage 166 ms, jump 19, p95 16.8; WebKit firstPage 166, jump 34, p95 30; canvas 67.1 MB.
- Asked two initial questions with options/tradeoffs: retain or revisit architecture; highlight/page/both
  note targets. Waiting for choices. No new decisions recorded, phase proposals made, or application
  files changed. Handoff/log updated without committing, per the user's instruction.

### 2026-10-19 17:03 EDT | Phase 07 | Codex | Direction confirmed; plan and contract drafted
- User chose to retain the architecture and support notes on highlights and pages, emphasizing
  progress along the original direction unless a change offers a substantial improvement. Recorded
  the choices, considered alternatives and reasoning as D7/D8 in architecture-decisions.md.
- User invoked prompt 02 for phase 07. Read the phase outline, contract template and run prompt.
  Preflight `scripts/verify.sh` at 8372a99: PASS (lint, format, types, 122 unit, 130 browser, 8 perf).
  Chromium firstPage 170 ms, jump 19, p95 16.7; WebKit firstPage 174, jump 83, p95 30; canvas 67.1 MB.
  The two pre-existing planning edits (handoff/log, from the preceding turn) were preserved.
- Branch-base conflict: prompt 02 says create a phase branch from main, but main does not contain
  completed phase 06, and phase 07 explicitly depends on 06. Created phase-07-notes at completed
  phase-06-highlights (8372a99, a descendant of main) so the required highlights code is present.
  No main merge, history rewrite, commit or push performed.
- Posted the plan (scope, files, first failing checks, risks), expanded the existing phase-07 plan,
  and drafted phase-07-contract.md from the template. Proposed interaction defaults are explicitly
  awaiting approval: one note per anchor, explicit Save/Cancel, draft-discard guards, and confirmed
  deletion of a highlight with its note. These are not recorded as accepted architecture decisions.
- Stopping at prompt 02 step 6 for plan/contract approval. No application code or tests changed;
  no feature marked passing, no Phase 07 context file created, and no commits made.

### 2026-10-19 17:07 EDT | Phase 07 | Codex | Contract approved; build started
- User: "Approved!" in response to the concrete plan, interaction defaults and contract. Approval
  recorded by append-only Amendment 01; phase/roadmap In progress. D9 records the accepted defaults.
- Baseline `scripts/verify.sh` at 8372a99 PASS: 122 unit, 130 browser, 8 perf; Chromium firstPage
  172 ms, jump 17, p95 16.8; WebKit firstPage 156, jump 57, p95 31; canvas 67.1 MB.
- Preserved the uncommitted planning records. Recorded material storage/association, draft-guard
  and navigation decisions in phase-07-notes-context.md. Starting core/storage/browser checks red first.
- No push, deployment or main merge authorized. Contract items 17 (CI) and 18 (user check) will
  remain open until separately observed; do not mark the phase Complete based on local tests alone.

### 2026-10-19 17:10 EDT | Phase 07 | Codex | Core/storage checkpoint; UI checks red
- Red first: core/storage note suites failed on missing core/notes; initial Chromium page-note and
  passage-note browser checks failed at missing Notes/Add note buttons (2 failed, expected).
- Implemented deterministic per-target identity, plain-text validation/order and schema v4 notes.
  Parent book/highlight validation is transactional; removing books/highlights cascades notes atomically.
  Injecting a notes-delete failure keeps both the highlight and note; v3 upgrade keeps all old data.
- Focused note unit tests 8/8; all unit tests 130/130; typecheck PASS (development checks, not full
  phase verification). Updated the schema inventory test for v4. Full verify not yet run on this step;
  browser notes checks remain red until UI integration. F-008 remains failing.

### 2026-10-19 | Phase 07 | Codex | Initial notes UI green
- Added draft controller, Notes editor/list, guarded panel/Library/file navigation, confirmation
  dialog, highlight Add/Edit note actions and PDF-coordinate passage jumps. Pending-write, failed-save,
  blank-text and dirty-navigation hook checks and the passage jump unit went red before implementation.
- All 135 units and typecheck pass. Initial notes browser flows PASS (4/4, Chromium + WebKit).
  One Chromium persistence check initially reloaded before its async save completed; waiting for the
  saved row/editor dismissal resolves that test race. No product persistence change needed.
- These are development checks, not canonical phase evidence. Full verify and broader contract
  cases remain pending; no feature marked passing. No push/deploy/main merge.

### 2026-10-19 | Phase 07 | Codex | Contract edge coverage green
- Expanded focused browser suite to 34 passing cases across Chromium/WebKit: independent targets,
  multiline/Unicode/blank edits, cancellation, edits/reopening, book isolation/removal, atomic
  highlight+note failure/cancel/retry, note-only deletion, unsaved/read/save failures and Retry,
  dirty guards on every navigation path, PDF association/reading order, non-first-page/current-page
  selection, multiline/cross-page and foot-of-page jumps, keyboard and iPhone/iPad tap workflows.
- Red keyboard checks exposed Safari skipping editor Save and dialog buttons in native Tab order,
  and focus dropping to body after confirmed row deletion. Explicit internal Tab navigation and
  focus restoration fix these; keyboard case now passes both engines.
- Test synchronization fixes: wait for editor dismissal before reloading after save; wait for
  viewer relayout/text rebuild after closing a wide panel; wait for new highlight boxes rather than
  an older existing box. Page jump assertion uses the existing page-top check (layout has 24px padding),
  not an incorrect scrollTop=0 assumption. No delays, relaxed budgets or product changes for those.
- Added deterministic vector-only fixture for no-text page notes. Lint passed; all 137 units pass.
  A newly added loading-state test had a type-only unsupported Testing Library `exact` option;
  removed it. Full canonical verify and screenshot inspection next. F-008 not yet changed.

### 2026-10-19 | Phase 07 | Codex | First full local verification
- `scripts/verify.sh` PASS at e4a8e58: lint, format, types, 137 unit tests, 164 browser tests,
  8 performance checks. Chromium firstPage 168 ms, jump 19, p95 16.8, blank frames 0%; WebKit
  firstPage 175 ms, jump 71, p95 31, blank frames 1%; both maxCanvas 67.1 MB. Budgets unchanged.
- Inspected captured iPhone/iPad notes-editor screenshots: quote/editor/buttons/list fit the panel;
  narrow overlay and wide split layouts are usable. Emulation does not reproduce the physical
  iOS keyboard, so this does not replace contract item 18.
- One final menu-boundary check is being added: the new Add note action makes the floating menu
  taller, so both actions must stay reachable when a chosen highlight is at the reader's lower edge.
  Phase remains In progress; CI and the Phase 07 user check have not been run/reported.

### 2026-10-19 | Phase 07 | Codex | Floating-menu edge correction
- New lower-edge check failed in both engines: the expanded Add note/Remove menu ended at 407px
  in a 360px viewport. Clamp the measured menu inside its positioned reader body, accounting for
  error text and width; no measurement/listener on idle scrolling. The same focused checks now
  pass (2/2); save through the repositioned Add note also succeeds.
- Full verification will be rerun on the correction. Previous full result is retained above, not
  treated as evidence for code that changed afterward. No budgets changed.

### 2026-10-19 | Phase 07 | Codex | Local implementation ready; external gates pending
- Final `scripts/verify.sh` PASS at 117ed45: lint, format, typecheck, 137 unit, 166 browser and
  8 performance checks. Chromium firstPage 201 ms, jump 28, p95 16.8, blank frames 0%; WebKit
  firstPage 162 ms, jump 54, p95 35, blank frames 1%; both maxCanvas 67.1 MB. Budgets unchanged.
- The production app was exercised through the picker, reader, panels and Library in both engines;
  36 Notes browser cases include iPhone/iPad contexts using actual tap events. Touch editor
  screenshots inspected earlier; no claim of a physical-device check. No independent review yet.
- F-008 marked locally passing for its observed feature behavior. Phase 07/PLANS stay In progress:
  no Phase 07 CI run, push, deployment or main merge; the user's Phase 06 report is not reused for
  Phase 07. No next phase started. App code is committed; handoff records the remaining gates.

Contract evidence from this final canonical run (contract unchanged after approval):

| Item | Observed evidence |
|---|---|
| 1 | Notes e2e existing-highlight and multiline/cross-page cases save attached text, page and quote; touch cases tap Add note |
| 2 | Vector-only fixture accepts a note with zero selectable spans; non-first-page case compares page-note target with Bookmark current-page index 2 |
| 3 | Same-target Add reopens the editor; independent highlights keep separate notes; hook pending-write test observes one put for duplicate Save |
| 4 | Browser multiline/Unicode and blank-edit cases; core/store validation rejects whitespace without changing saved content |
| 5 | New-draft Cancel leaves no note; changed existing note Cancel preserves storage; Save updates row/text |
| 6 | Page/passage saves and edits survive reload/reopening (including touch workflows); two-book isolation case keeps the books separate |
| 7 | Browser empty/failure/retry states and page/passage ordering; ReaderView loading-reason unit; core sorting across pages and PDF positions |
| 8 | Non-first-page jump plus first-box jump near page foot across a page break; wide reader focus and narrow touch panel closure |
| 9 | Cancel/confirm note-only deletion, persisted absence after reopening, highlight still present; touch deletes both note types |
| 10 | Explicit Remove both/Cancel; injected notes-delete failure keeps both records, retry removes both while page note stays; storage atomic rollback unit |
| 11 | Two-target book removal deletes notes/highlights, preserves other book, and reimport starts empty; storage cascade unit |
| 12 | Dirty draft retained on cancelling close/switch/Escape/other-note edit or jump/Library/file open; confirmed discard opens the chosen file; hook confirms guarded continuation |
| 13 | Unsaved/failed-read browser cases plus pending-read UI/hook units disable changes visibly; save/delete failures preserve text/records and permit retry |
| 14 | Populated real-v3 upgrade unit preserves metadata, PDF bytes, bookmarks and highlights; stored target-key assertions contain only page/highlight associations; core/storage validation/order/cascade units |
| 15 | Keyboard Enter inserts newline, Tab reaches Save, dialog cancel/confirm and deletion restore usable focus; iPhone/iPad tap add/edit/reopen/jump/delete both targets in both engines |
| 16 | All existing reading/bookmark/highlight browser regressions pass; 8 perf checks pass unchanged |
| 17 | Local PASS above; CI NOT RUN — requires separately authorized push |
| 18 | NOT OBSERVED — ask user to create/edit/reopen/jump/delete both note types in a real book, on iPhone/iPad if possible |

### 2026-10-19 17:44 EDT | Phase 07 | Codex | User-reported jump failures; bookmark issue filed
- User reports choosing Notes and Bookmarks does not land on the right page, and requests a
  GitHub issue for Bookmarks. This supersedes the earlier locally-ready interpretation: contract
  8/18 is unresolved. Asked asynchronously for device/browser, page versus highlight note and
  expected-versus-actual page. No answer received yet; no cause claimed and no app code changed.
- Startup: handoff/log/status/history read; clean tree on phase-07-notes at 798c536. Read AGENTS,
  phase/contract and navigation/layout code. `scripts/verify.sh` PASS: 137 unit, 166 browser, 8 perf;
  Chromium firstPage 168 ms, jump 29, p95 16.7; WebKit firstPage 170, jump 75, p95 32; canvas 67.1 MB.
- Additional isolated Playwright diagnostic against the production preview: import generated
  long-300-pages.pdf, mark physical page 201, add its page note, scroll away, choose each entry,
  compare page top immediately and after 600ms settling. Both Chromium/WebKit at widths 1280,
  810 and 390 landed within 1px of the intended page top (12 jumps). These checks did not reproduce
  the report; no private book read/copied. Hypotheses such as page labels or layout remain unconfirmed.
- GitHub reads initially failed inside the network sandbox; escalated retry succeeded. Checked
  repository and open issues (none), then created and verified OPEN issue #1 under the user's request:
  https://github.com/himmannshu/book-reader/issues/1 . Issue clearly separates user report from
  generated-fixture observations. No push, deployment, main merge or credential-file access.
- Used writing-style skill for the issue; retrieval tools were unavailable, so followed the user's
  supplied direct wording without claiming a retrieved style match.
- F-006/F-008 marked failing with explicit user-report evidence (not fabricated red tests).
  Historical test results retained. Phase 07 stays In progress; no fix attempted without a repro.

### 2026-10-19 17:52 EDT | Phase 07 | Codex | Page-number clarification; navigation report withdrawn
- User: "actually never mind ... page numbers ... printed on the book page vs actual pdf page
  number." This resolves the reported wrong-page behavior without an application fix. The UX
  concern is clearer physical-PDF versus printed-book numbering, not broken stored associations.
- Closed GitHub issue #1 with the clarification (reason NOT_PLANNED); read back state CLOSED.
  Retained numbering clarity as a local UX follow-up; no new external issue, UI feature, metadata
  support, fixed offset or OCR work inferred/implemented. No push/deploy/main merge.
- Startup clean at 04da1da. `scripts/verify.sh` PASS: lint, format, types, 137 unit, 166 browser,
  8 perf. Chromium firstPage 169 ms, jump 32, p95 16.8; WebKit firstPage 146, jump 77, p95 34;
  blank frames 0%/1%, canvas 67.1 MB. Budgets unchanged.
- Restored F-006/F-008 passing using the observed checks plus withdrawn failure report. Prior
  entries remain historical evidence. Phase 07 stays In progress for authorized CI and confirmation
  of the full real-book/device checklist; this clarification does not confirm every contract-18 action.

### 2026-10-19 | Phase 07 | Codex | Authorized push/CI preflight
- User: "Ok,next is CI and then push the code." Authorized pushing phase-07-notes and observing CI;
  explained GitHub CI requires the commit to be pushed first. No merge/deployment authorized.
- Clean preflight at 43c3efa. `scripts/verify.sh` PASS: lint, format, types, 137 unit, 166 browser,
  8 perf. Chromium firstPage 166 ms, jump 18, p95 16.8; WebKit firstPage 155, jump 91, p95 29;
  blank frames 0%/1%, maxCanvas 67.1 MB. Budgets unchanged; no application code changed.
- Inspected verify.yml: push-triggered verification, no deployment. Remote branch absent (read-only
  git ls-remote; initial sandbox DNS failure resolved by escalated retry). First push/CI next.
- First push succeeded: origin/phase-07-notes now tracks local branch at 26875e4. Exact SHA matched
  queued verify run 39331468496: https://github.com/himmannshu/book-reader/actions/runs/39331468496 .
  Monitoring with gh run watch --exit-status; no result claimed yet. No PR, merge or deployment.
- While CI runs, user confirms trying jumps, deletion and reopening for both highlight/page notes.
  Clarified my phrase "cover creating" meant checking note creation, not making book covers. Do not
  infer that editing was checked from this report. Full acceptance record remains partial.
- User separately requests an issue for incomplete Contents: local The Hundred Page ML Book lists
  only Preface. Read engine mapping and Phase 04 contract: current behavior reads embedded outline;
  generation from page content is explicitly out of scope. Cause unconfirmed without the PDF;
  no private book accessed/copied/uploaded, no TOC implementation work added to Phase 07.
- Writing-style skill used for the requested issue; retrieval tools unavailable, so the supplied
  user wording is the style basis without a claim of retrieved examples.
- Created requested Contents issue #2, https://github.com/himmannshu/book-reader/issues/2 , with
  the Preface-only example and explicit embedded-outline versus TOC-generation distinction.

### 2026-10-19 18:16 EDT | Phase 07 | Claude Code (Opus 5.5) | Takeover after Codex hit its limit; phase complete
- Took over from Codex (usage limit). Its uncommitted HANDOFF.md/build-log.md edits were harness notes only,
  consistent with git and CI; kept and committed here.
- Item 17: GitHub Actions run 39331468496 on 26875e4 → completed, success (all steps, including scripts/verify.sh).
  https://github.com/himmannshu/book-reader/actions/runs/39331468496
  Local: `scripts/verify.sh` at 26875e4 → PASS: 137 unit, 166 browser, 8 perf. Chromium first 181, jump 27,
  p95 16.8; WebKit first 183, jump 83, p95 33; blank 0%/1%; canvas 67.1 MB. Budgets unchanged.
- Item 18: user-observed. Earlier: creating, jumping, deleting and reopening both highlight and page notes.
  Now (chat, answer to "did you also try editing a note"): "Yes, editing works". iPhone/iPad not reported
  (the contract says "if possible").
- All contract items 1–18 have evidence. Phase 07 → Complete. No independent review of phase 07 yet.
- Issue #2 (Contents shows only Preface for The Hundred-Page Machine Learning Book): with the user's permission,
  read the local PDF's outline with PDF.js in Node (read-only; nothing copied or uploaded). 152 pages; the
  embedded outline has 5 entries in total: "Preface.pdf" (no destination) > "Preface" (page index 2) > 3 Preface
  sections; no page labels. So the app shows the embedded outline faithfully. The source outline is incomplete
  (likely merged per-chapter PDFs). Not a parser or mapping bug. Chapters would need contents generation,
  which phase 04 left out of scope.

### 2026-10-19 18:29 EDT | After phase 07 | Claude Code (Opus 5.5) | Merged phases 06 and 07 into main; CI green
- User asked: merge phase-07-notes (includes phase 06) into main, rerun verify, push main, watch CI.
- main was an ancestor of refs/heads/phase-07-notes; merged with a merge commit (5ba0694), no conflicts.
- Verification on merged main: `scripts/verify.sh` → PASS: 137 unit, 166 browser, 8 perf. Chromium first 171,
  jump 19, p95 16.7; WebKit first 198, jump 48, p95 32; blank 0%/1%; canvas 67.1 MB. Budgets unchanged.
- Pushed main (user-authorized). GitHub Actions run 39334209183 on 5ba0694 → completed, success.
  https://github.com/himmannshu/book-reader/actions/runs/39334209183

### 2026-10-19 18:58 EDT | Phase 08 | Claude Code (Opus 5.5) | Contract and icons
- Planning: probe (scratchpad, read-only for the repo) showed both Playwright browsers register a service worker,
  take control, and reload a cached page offline. User decisions: Cloudflare Pages Git integration, Access with
  email one-time code, update prompt before reload. Contract approved.
- Changes: branch phase-08-installable-and-hosted; contract; scripts/png.mjs (shared PNG encoder);
  scripts/generate-heavy-fixture.mjs uses it (output byte-identical: SHA-1 10240f7… before and after);
  scripts/generate-icons.mjs + `npm run icons` → public/icons/ (192, 512, maskable 512, apple-touch 180, favicon 32).
- Verification: icons generated twice → identical hashes; inspected 512, maskable 512 and 192 visually (fixed a
  thin line sliver at the top of each page).

### 2026-10-19 19:07 EDT | Phase 08 | Claude Code (Opus 5.5) | PWA: manifest, service worker, offline, update notice, headers
- Changes: vite-plugin-pwa 2.0.0 + workbox-window 7.4.1 (MIT, exact pins) in prompt mode, SW off in dev; manifest
  (name, short name, start URL/scope /, standalone, theme/background colours, 192/512/maskable icons); index.html
  icon and iOS meta tags; src/ui/UpdateNotice.tsx ("A new version is ready." Reload/Later, injectable hook);
  public/_headers (no-cache for sw.js, registerSW.js, index.html, /, manifest; /assets/* immutable for a year);
  tests/config/headers.test.ts (Node-side unit test; tests/ added to the Vitest include and tsconfig.node).
- Red: e2e/pwa.spec.ts failed in both browsers (no manifest, no service worker); UpdateNotice and headers unit
  tests failed (missing component/file).
- Green: unit 142; e2e/pwa.spec.ts 9 passed + 1 skipped (installability is Chromium-only); full browser suite
  175 passed, 1 skipped.
- Mutation checks (each reverted): worker .mjs not precached → offline-book test failed (item 5); no maskable icon,
  no apple-touch-icon, display "browser" → manifest test failed (item 1); auto reload → UpdateNotice tests failed
  (item 6); sw.js cached an hour → headers test failed (item 8).
- Found and fixed: my first installability test (item 2) was vacuous. Headless Chromium (the default headless
  shell) returned no installability errors even for a page without a manifest; normal test contexts are incognito
  ("in-incognito"). The test now launches full Chromium (channel "chromium") with a persistent profile, first
  checks that a manifest-less page reports "no-manifest", then requires no errors for the app. Breaks: icons
  removed → failed; manifest removed → failed. (1f9d405)

### 2026-10-19 19:10 EDT | Phase 08 | Claude Code (Opus 5.5) | Verify incl. perf; dev server has no service worker
- Item 9/10 (local): port 4174 free first. `scripts/verify.sh` → PASS: unit 142, browser 175 passed + 1 skipped, perf 8.
  Chromium first 171, jump 17, p95 16.7; WebKit first 152, jump 49, p95 33 (samples [33, 2455, 29]: the known
  pre-existing freeze in one scroll); blank 0%/1%; canvas 67.1 MB. Budgets unchanged; first page unaffected by the
  service worker's first-visit install.
- Item 7: `npm run dev` in the Claude browser pane (port 5174; 5173 was held by an existing dev server from this
  repo, left running): navigator.serviceWorker.getRegistrations() → 0, controller false, no manifest link.

### 2026-10-19 19:11 EDT | Phase 08 | Claude Code (Opus 5.5) | Deploy guide, AGENTS notes, context
- New folder docs/ (user-facing guides; explained here as AGENTS.md requires): docs/deploy.md with the Cloudflare
  Pages project settings, Access (Zero Trust Free, one-time PIN, production + preview domains, email policy),
  install steps (iPhone/iPad, Mac), the offline check, and how updates appear.
- AGENTS.md: every push is also a deploy (main → production, branches → previews); `npm run icons`; no deploy
  command; folder layout gains tests/config/, public/ and docs/.
- harness/context/phase-08-installable-and-hosted-context.md written.
- Remaining: user's Cloudflare setup (docs/deploy.md 1–2), then with the user's OK: push branch (CI + preview),
  check logged-out requests reach Access (item 11), merge/push main (production), user install + offline check (12).

### 2026-10-19 20:06 EDT | Phase 08 | Claude Code (Opus 5.5) | Hosted URL check; login method; branch pushed
- User set up Cloudflare Pages: production URL https://book-reader-cpi.pages.dev/ (project book-reader-cpi).
- Logged-out checks (curl, no credentials, read-only): `/` and `/sw.js` → HTTP 302 to
  gentle-pond-af51.cloudflareaccess.com/cdn-cgi/access/login/book-reader-cpi.pages.dev (www-authenticate:
  Cloudflare-Access). https://main.book-reader-cpi.pages.dev/ → 404 (no alias for the production branch).
- The Access login page shows "Log in to *" and only "Sign in with: Cloudflare" (Cloudflare-account login, likely
  the Pages built-in access policy), not the agreed email one-time PIN. Private, but not the planned method.
- User decision: switch to the email one-time code (user changing Zero Trust settings: add One-time PIN, enable it on
  the application, policy Emails = the user's address, add *.book-reader-cpi.pages.dev for previews).
- User authorized pushing the branch: pushed phase-08-installable-and-hosted at bc2b12f (CI + preview deploy).
  Watching CI and probing the preview alias logged-out.

### 2026-10-19 20:07 EDT | Phase 08 | Claude Code (Opus 5.5) | Preview deploy is public; headers work when hosted
- Preview https://phase-08-installable-and-hos.book-reader-cpi.pages.dev/ (branch alias truncated to 28 chars)
  answered a logged-out GET with HTTP 200 and no redirect: previews are NOT behind Access yet. It serves the phase 08
  build (title "Book Reader", manifest link /manifest.webmanifest, apple-touch-icon). Exposure: the app code only;
  books and annotations live in each browser's IndexedDB, never on the server. User told to add
  *.book-reader-cpi.pages.dev to the Access application (item 11 not yet met for previews).
- Item 8 (hosted): GET /sw.js on the preview → 200 with "cache-control: no-cache" (from public/_headers).
- CI run 39345677490 on bc2b12f in progress (the first watch attempt failed only because it looked up the run id
  before GitHub registered it).

### 2026-10-19 20:10 EDT | Phase 08 | Claude Code (Opus 5.5) | Deploy guide corrected (One-time PIN location)
- User could not find One-time PIN. Web search of current Cloudflare docs: the provider is under Zero Trust →
  Integrations → Identity providers (my guide said Settings → Authentication). Previews are protected through the
  Pages project's Settings → Access policy. docs/deploy.md section 2 rewritten accordingly. No Cloudflare settings
  changed by the agent.

### 2026-10-19 20:19 EDT | Phase 08 | Claude Code (Opus 5.5) | Item 11: production and previews behind the email-code login
- User reports: added One-time PIN, enabled the preview access policy, set the email policy.
- Logged-out checks (curl, no credentials): https://book-reader-cpi.pages.dev/ and /sw.js, and
  https://phase-08-installable-and-hos.book-reader-cpi.pages.dev/ and /sw.js → all HTTP 302 to
  gentle-pond-af51.cloudflareaccess.com/cdn-cgi/access/login/<host>. Both login pages now read "Log in to
  book-reader - Cloudflare Pages | Email | Send login code" (One-time PIN), no longer "Sign in with: Cloudflare".
- Item 11 observed for production and previews (the user's own email-code login is theirs to confirm in item 12).
- CI run 39345677490 on bc2b12f still in progress at the verify step.

### 2026-10-19 20:23 EDT | Phase 08 | Claude Code (Opus 5.5) | Merged into main; production deployed
- User asked: once CI is green, merge into main, rerun verify, push main (production deploy).
- Item 10 (branch): GitHub Actions run 39345677490 on bc2b12f → completed, success.
  https://github.com/himmannshu/book-reader/actions/runs/39345677490
  (Commits after bc2b12f on the branch changed only docs/deploy.md and harness/build-log.md.)
- Merged refs/heads/phase-08-installable-and-hosted into main with a merge commit (e9a9c00); main was an ancestor.
- `scripts/verify.sh` on merged main → PASS: unit 142, browser 175 + 1 skipped, perf 8 (Chromium first 172, jump 18,
  p95 16.7; WebKit first 189, jump 81, p95 32; canvas 67.1). Budgets unchanged.
- Pushed main (user-authorized; production deploy). Cloudflare's GitHub check on e9a9c00: "Cloudflare Pages: completed
  success". Production still behind Access after the deploy: / and /manifest.webmanifest → 302 to the Access login.
- CI on main for e9a9c00 being watched. Remaining: item 12 (user install + offline), item 6's real-world part (a second
  deploy shows the update notice), item 13 (guide usable; the user completed setup with one correction).

### 2026-10-19 20:32 EDT | Phase 09 planning | Claude Code (Opus 5.5) | Phase 09 split into 09a/09b; 09a planned and approved
- User asked to plan phase 09 now, with phase 08 staying In progress until their install/offline check, and not to
  build phase 09 until then. Planning documents only; no code, no code branch, nothing pushed.
- User decisions: split into 09a (sync library list and annotations, D1) and 09b (book files, R2, chunked uploads);
  API as Cloudflare Pages Functions behind the existing Access login; removing a book offers "Remove from this
  device" and "Delete everywhere".
- Written: PLANS.md rows 09a/09b replace 09; harness/build/phase-09a-sync-library-and-annotations.md;
  harness/build/phase-09b-sync-book-files.md (outline); note at the top of phase-09-cloud-library.md;
  harness/contracts/phase-09a-contract.md (approved at planning); features.json F-016 (09a, failing).
  F-010's text and fields are unchanged (AGENTS.md); it now belongs to phase 09b.
- Phase 08: CI run 39347261723 on main (e9a9c00) still in progress at this entry.

### 2026-10-19 20:33 EDT | Phase 08 | Claude Code (Opus 5.5) | CI green on main
- GitHub Actions run 39347261723 on e9a9c00 (main, the production deploy commit) → completed, success.
  https://github.com/himmannshu/book-reader/actions/runs/39347261723
- Phase 08 still In progress: item 12 (user install + offline) and item 6's real-world part (update notice after a
  second deploy) remain.

### 2026-10-19 20:51 EDT | Phase 08 | Claude Code (Opus 5.5) | Item 12: iPhone offline fails; user deprioritizes offline; phase closed with recorded exceptions
- User first said "checked the offline version, working", then (asked which devices): "I tested it again to make sure
  on the iphone offline, it didn't work". User decision: deprioritize offline reading ("I would most likely have
  internet") and move to phase 09.
- Recorded as Amendment 1 to phase-08-contract.md: the offline part of item 12 is a deferred known issue (iPhone),
  not a pass; item 6's real-world notice check is left to the user after the second deploy.
- Unverified hypotheses for the iPhone failure: the installed app has its own storage, so its service worker must
  install inside the app while online; the precache may not have finished before going offline; the Access login
  redirect inside the installed app may interrupt the first load. Not investigated (deprioritized).
- Phase 08 → Complete with the exceptions above (user direction). F-009 kept failing: automated tests pass, but
  the real iPhone fails offline (evidence in features.json).

### 2026-10-19 20:56 EDT | Phase 09a | Claude Code (Opus 5.5) | Started (phase 08 closed); server side done
- User: phase 08 offline check failed on iPhone; offline deprioritized; "move to phase 9 now (a and b)". Started 09a
  on branch phase-09a-sync-library-and-annotations (from main bbdd999). Contract approved at planning.
- Tooling (exact pins, free): wrangler 4.151.2, @cloudflare/workers-types 5.20261019.1 (dev), jose 6.2.12.
- Probe: `wrangler pages dev dist --d1 DB=… --binding AUTH_MODE=dev` runs a TypeScript Pages Function with local D1
  and persisted state, no account. Bindings are passed as flags; no wrangler.toml (a wrangler.toml would make
  Pages take its configuration from the file instead of the dashboard).
- src/core/sync.ts (shared rules: shouldApply last-write-wins with device tie-break, nextStamp): red (module
  missing) → 10 tests green.
- functions/: _lib/store.ts (schema v1, idempotent migrate, per-user atomic seq via INSERT … RETURNING,
  applyChanges with book-deletion cascade, changesSince with paging and no echo), _lib/auth.ts (jose verify:
  issuer https://<team>, audience ACCESS_AUD, email claim; dev mode only on localhost), _lib/handler.ts
  (validation: kinds, ids, stamps, device match, ≤500 changes, ≤64 KB per item → 400), _lib/d1.ts, api/sync.ts.
  Unit tests run on node:sqlite (functions/_lib/sqlite-test-db.ts). Red (modules missing) → 16 green.
  tsconfig.functions.json (workers types + node) added to typecheck; Vitest includes functions/**.
- Smoke in wrangler with local D1: push from A → {"items":[],"cursor":1}; pull from B → A's bookmark; "nope" → 400.

### 2026-10-19 21:03 EDT | Phase 09a | Claude Code (Opus 5.5) | Local schema v5, sync engine, HTTP client, fetch boundary
- Local store (src/storage/indexeddb-book-store.ts), schema v5: syncMeta (per item: stamp, deleted, device, pending)
  written in the same transaction as every local write; syncState (deviceId, cursor); v4→v5 seeds syncMeta from
  existing rows (stamps from lastOpenedAt/createdAt/updatedAt, all pending); books list with computed hasFile;
  removeFromDevice (file only); add restores a missing file; applyRemote (last write wins, book deletion cascades,
  never marks pending); markSynced (only unchanged items). Red: 14 tests failed (incl. updated schema test) → green;
  three older upgrade tests now expect the computed hasFile: true (interface change).
- src/sync/engine.ts: single-flight sync (push batch, apply remote, mark synced, advance cursor; up to 50 rounds),
  statuses (syncing, synced, offline, signed-out, unavailable, failed), onRemoteChanges(bookIds). Tests use two real
  local stores and an in-memory server with the same rules. Red (module missing) → 8 green.
- Mistake: commit 5e85771 went in with one failing test because my command piped vitest into grep (grep's exit
  code gated the commit). The test ("keeps the later of two edits") tied on equal clocks and was decided by random
  device ids; fixed by giving device B a later clock (5892b62), 5/5 runs green. Commits are now gated on vitest's
  own exit code.
- src/sync/http-client.ts (fetch with redirect:'manual': network error → offline; Access redirect/401/403 →
  signed-out; 404/405 → unavailable; other errors or malformed replies → failed). Red → 6 green.
- Lint boundary (item 10): probe calling fetch/window.fetch in src/ui → exit 0 before, exit 1 after (2 errors);
  clean → 0; indexedDB still banned in src/ui (1); fetch banned in src/storage (1). Rule restructured because ESLint
  replaces rule options per file instead of merging them.
- Unit total: 195 passed.

### 2026-10-19 21:35 EDT | Phase 09a | Claude Code (Opus 5.5) | UI wiring, two-device e2e, verify; docs
- UI: trigger wrapper (src/sync/triggering.ts; red → 3 green); SyncStatusLine (red → green); Library with cloud-only
  rows and "Remove from this device" / "Delete everywhere" (red → green, 4 tests); useSync; App and ReaderView wiring
  (syncVersion reloads annotations). Existing e2e updated where the confirm button changed ("Yes, remove" →
  "Delete everywhere": 8 failures in 4 tests, then green). Lint caught indexedDB use in App (moved the check into
  src/storage) and a ref read during render (useSync now takes a stable callback).
- E2E (e2e/sync/sync.spec.ts, playwright.sync.config.ts; wrangler pages dev, local D1, per-test x-dev-user):
  7 tests × chromium/webkit. Investigation of a WebKit failure: network logging showed device B DID receive the
  bookmark; a database dump showed it stored; a timing probe showed UI lag of 49–72 ms normally but 8.3 s
  sometimes; serial runs still took 33–53 s per test. Cause: my tests never closed their browser contexts, so
  earlier tests' pages kept running in the same WebKit process. Fixed with a device fixture that closes them:
  14/14 passed twice (~15 s total).
- Mutation checks (chromium, each reverted): no UI refresh on remote changes → failed; ignore remote deletions →
  failed; remove-from-device deleting everywhere → failed; wrong offline text → failed. Two survived at first
  (shouldApply always true; no 'online' listener) because the tests didn't exercise them; reordered the conflict
  test and let the 2 s scheduled sync fire while offline; both breaks then failed.
- Lint boundary for fetch (item 10): see the earlier entry. ESLint now ignores .wrangler/ (wrangler's generated
  bundles).
- Verification: scripts/verify.local.sh gains the sync step. `scripts/verify.sh` → PASS: unit 212, browser 175 + 1
  skipped, sync 14, perf 8 (chromium first 199, jump 19, p95 16.8; webkit first 156, jump 59, p95 39 with samples
  [39, 2444, 29], canvas 67.1). Budgets unchanged.
- Docs: docs/deploy.md section 2b (two D1 databases, DB binding, ACCESS_TEAM_DOMAIN / ACCESS_AUD per environment);
  AGENTS.md (test:sync, functions/, src/sync/, fetch rule, no wrangler.toml); phase 09a context file.
- Remaining: CI on the branch (needs the user's OK to push; a push also deploys a preview), the user's D1 setup,
  then deploy and item 13 (real devices).

### 2026-10-19 21:36 EDT | Phase 09a | Claude Code (Opus 5.5) | Highlights in the two-device test; F-016
- Gap found by me against contract item 1 (it names highlights; the e2e covered bookmarks and notes): the first sync
  test now also highlights text on device A (text-4-pages.pdf) and expects a highlight box on B. Passed in chromium
  and webkit; break "highlights not applied remotely" → failed; reverted. Full sync suite 14/14.
- F-016 → passing (local evidence; real devices pending, item 13).

### 2026-10-19 22:15 EDT | Planning | Claude Code (Opus 5.5) | Three features added for later
- At the user's request, added three later features to the roadmap (planning only, no code): PLANS.md rows 14 Voice
  notes, 15 Listen to a book, 16 Share excerpts (lowest priority), and a matching line in GOALS.md Scope.
  Details (recording format, text-to-speech voice, where audio syncs, share targets) are decided when each phase
  starts. Note: voice notes are audio files, so their cloud copy likely depends on 09b's file sync.

### 2026-10-19 22:36 EDT | Phase 09a | Claude Code (Opus 5.5) | Pushed; CI green; preview behind Access
- The user reported the Cloudflare setup complete (two D1 databases, DB binding per environment,
  ACCESS_TEAM_DOMAIN / ACCESS_AUD per environment). Pushed branch phase-09a-sync-library-and-annotations at 27f0197
  with the user's earlier agreement ("tell me when it's done and I'll push").
- CI (item 12): https://github.com/himmannshu/book-reader/actions/runs/39358742684 → success
  (02:24:35Z–02:34:50Z UTC).
- Cloudflare Pages check on 27f0197: success (preview alias phase-09a-sync-library-and-a.book-reader-cpi.pages.dev).
- Logged-out curl against the preview: GET /, GET /api/sync and POST /api/sync each → 302 to
  gentle-pond-af51.cloudflareaccess.com/cdn-cgi/access/login/... so the API is behind Access (item 8, deployed
  side). The login redirect names the preview application's audience tag beginning 498b4e00; the preview's
  ACCESS_AUD must equal it (not checked from here: agents don't read dashboard settings).
- Not yet observed: a signed-in sync against the real D1 (needs the user's browser) and item 13 (two real devices).

### 2026-10-19 23:03 EDT | Phase 09a | Claude Code (Opus 5.5) | Merged into main; production deployed
- User report (item 13, partial): on the preview, a book added on the Mac appeared on the iPhone as "On your other
  devices" (its PDF did not open there: expected, the file arrives in 09b), and deletions reached the other device.
  Not yet reported: annotations appearing on the second device after importing the same PDF there.
- The user asked to continue with the merge. Merged phase-09a-sync-library-and-annotations into main (a5100f5,
  --no-ff). `scripts/verify.sh` on merged main → PASS: unit 212, browser 175 + 1 skipped, sync 14, perf 8
  (chromium first 174, jump 16, p95 16.8; webkit first 151, jump 44, p95 32; canvas 67.1). Budgets unchanged.
- Pushed main. CI https://github.com/himmannshu/book-reader/actions/runs/39360795702 → success; Cloudflare Pages
  check on a5100f5 → success. Logged-out curl to production / and /api/sync → 302 to the Access login.
- Finding: production's login redirect names the same Access audience (starts 498b4e00) as the preview, so one
  Access application covers both; ACCESS_AUD must be that tag in BOTH environments.
- Phase 09a stays In progress until the user reports the annotation part of item 13 (can be checked on
  production now).

### 2026-10-19 23:16 EDT | Phase 09b | Claude Code (Opus 5.5) | Planned and approved
- User decisions: download on open; cap cloud storage at 9 GB. Plan approved by the user (plan mode).
- Wrote harness/build/phase-09b-sync-book-files.md (detail) and harness/contracts/phase-09b-contract.md
  (13 items, approved). PLANS.md: 09a and 09b In progress (09a's row was stale at "Not started").
- F-010 ("A book and its annotations added on one device appear on another device") is this phase's feature;
  its `phase` field still says "09" (left as is: only status and evidence change in features.json).
- Facts used (Cloudflare docs): R2 multipart parts ≥ 5 MiB, equal size except the last, ≤ 10,000 parts;
  request bodies ≤ 100 MB → fixed 8 MiB parts. Free Workers CPU is tight → no hashing on the server.

### 2026-10-19 23:21 EDT | Phase 09b | Claude Code (Opus 5.5) | Probe; server file API green
- Probe (scratch project, `wrangler pages dev --r2`): multipart with an 8 MiB streamed part (Content-Length set) +
  a 3 MB last part → complete size 11388608; ranged GET 206 and full GET byte-identical (cmp). A 4 MB non-last
  part → complete fails "smaller than the minimum allowed object size (10011)"; a single small part (4 B, 4 MB)
  completes. A chunked body (no length) → "Provided readable stream must have a known length". So: fixed 8 MiB
  parts, and the server answers 411 without Content-Length.
- Server: functions/_lib/files.ts (create / part / complete / ranged GET; cap; 409 not-synced, 410 deleted; R2 key
  per sha256(user)), r2.ts adapter, memory-bucket.ts (test only), route functions/api/files/[[path]].ts; D1 schema
  v2 (`files` table); applyChanges returns deleted books and the sync handler deletes their files.
- Tests first: files.test.ts (12) failed (no module), then pass; store.test.ts adds the v1 → v2 upgrade. Vitest
  deep equality on 16 MB arrays ran Node out of memory; tests compare bytes with Buffer.compare instead.
  `npx vitest run functions` → 31 passed; typecheck and eslint clean.

### 2026-10-19 23:24 EDT | Phase 09b | Claude Code (Opus 5.5) | Local storage v6 and the HTTP file client
- Tests first: src/storage/file-transfer-store.test.ts (8) failed (`s.files` undefined), then pass. IndexedDB v6
  adds `uploads` (keyPath bookId); `files.pendingUploads()` / `saveUpload()`; `books.putFile()` saves a downloaded
  file for a known book and marks it done; delete everywhere (local or remote) clears the upload row. v5 → v6
  upgrade keeps books, bookmarks, deviceId, cursor and pending changes, and queues local files for upload.
- src/sync/file-client.ts (FileClient, FileError kinds) and `httpFileClient` in http-client.ts (still the only
  fetch). http-file-client.test.ts (7) failed (not a function), then pass: error mapping (404 not-uploaded /
  no-such-upload / missing API, 409, 410, 503, 507, 401, redirect, 500, bad JSON), ranges checked against
  Content-Range, AbortError passes through.
- Full unit run green; lint and typecheck clean.

### 2026-10-19 23:38 EDT | Phase 09b | Claude Code (Opus 5.5) | Uploader, downloader, UI, e2e; verify PASS
- Uploader (src/sync/uploader.ts) and downloader (src/sync/downloader.ts), with unit tests (8 + 5; the test files
  were written before the code, though I ran them only after both existed). Unit mutation checks, each reverted:
  uploader ignoring saved parts → resume test failed; no SHA-256 check → damaged test failed; storage-full not
  recorded → full test failed.
- UI: useSync runs the uploader after each successful sync; Library rows for books on other devices open with
  "Downloading… N%" and Cancel; readable messages (offline, still uploading, damaged, signed out, deleted, not set
  up); a failed save after download still opens the book with the storage message; the status line shows
  "Uploading N book(s) (P%)" and "Cloud storage is full (9 GB)…". Library and status-line unit tests (6) failed
  first, then pass.
- Server: dev-mode-only `x-dev-files-cap` header (localhost only, like x-dev-user) so one e2e user can have a tiny
  cap; unit test shows production mode ignores it.
- E2E e2e/sync/files.spec.ts (8 tests) over `wrangler pages dev --r2 FILES=…`; the device fixture and helpers moved
  from sync.spec.ts to e2e/sync/devices.ts. The 09a test "a book added on one device is listed on the other" no
  longer expects the cloud-only row to be unopenable (09b makes it openable); it still checks the listing and that
  importing brings annotations. Big PDFs (20 MB) are written by hand at test time into the OS temp dir
  (Playwright's loader can't import pdf-lib: "Unexpected module status 3"). `npx tsx` was used once to check the
  generator; it downloaded tsx into npm's cache only (no project change).
- A first full sync run failed one test in chromium (resume): the sync scheduled 2 s after import resumed and
  finished the upload before the test waited for the "complete" request. The helper now polls HEAD /api/files/<id>
  for 200. Then `--repeat-each=3 files.spec.ts` → 48 passed.
- E2E mutation checks (chromium, each reverted): no hash check → damaged test failed; download not kept → reload
  test failed; uploader ignoring saved parts → resume test failed; server keeping deleted books' files → first
  survived (GET already answered 404 for a deleted book), so the test now re-imports the book with uploads held
  back and checks HEAD is 404; then the mutation failed it.
- Docs: docs/deploy.md section 2c (R2 buckets `book-reader-files` / `-preview`, binding `FILES`; dashboard path
  Storage & databases → R2 → Overview → Create bucket, per Cloudflare docs); section 2b now says one Access
  application can cover both environments. AGENTS.md notes R2 and the files API.
- `scripts/verify.sh` → PASS: unit 260, browser 175 + 1 skipped, sync 30, perf 8 (chromium first 176, jump 24,
  p95 16.7; webkit first 150, jump 55, p95 31; canvas 67.1). Budgets unchanged.
- Contract 09b evidence (local): 1 files.spec "opens on another without importing" (+ progress shown in the 20 MB
  test); 2 "bigger than one part" (parts 1,2,3; stored SHA-256 = id) + files.test.ts; 3 "resumes from the next part"
  (PUTs 1,2,2,3) + uploader.test.ts (resume after reload, expired upload); 4 "damaged download" + downloader.test.ts;
  5 "offline, or before the upload has finished"; 6 "Delete everywhere removes the file" + files.test.ts (410 on
  complete after delete); 7 "Remove from this device … downloads again"; 8 "cloud is full" + files/uploader unit;
  9 files.test.ts (401 without token, per-user keys) — deployed curl pending; 10 file-transfer-store.test.ts (v5 →
  v6); 11 perf above (the perf suite doesn't run uploads; uploads start only after a sync and never block opening);
  12 local PASS — CI pending (needs a push); 13 pending (user, after R2 setup and deploy).
- F-010 → passing (local evidence; real devices pending).

### 2026-10-20 00:20 EDT | Phase 09b | Claude Code (Opus 5.5) | Pushed; CI green; preview file API behind Access
- The user reported R2 set up (buckets book-reader-files / book-reader-files-preview, FILES binding for Production
  and Preview) and asked to push. Pushed phase-09b-sync-book-files at 98f0915.
- CI (item 12): https://github.com/himmannshu/book-reader/actions/runs/39367480019 → success
  (04:02:52Z–04:19:32Z UTC). Cloudflare Pages check on 98f0915 → success.
- Item 9, deployed side: logged-out curl to https://phase-09b-sync-book-files.book-reader-cpi.pages.dev —
  GET and HEAD /api/files/<id> and POST /api/files/<id>/uploads → 302 to the Access login.
- Not yet observed: a signed-in upload/download against real R2 (item 13, the user's two-device check).

### 2026-10-20 00:25 EDT | Phases 09a, 09b | Claude Code (Opus 5.5) | Complete (user-checked on real devices)
- User report (09b item 13): on the 09b preview, a book imported on the Mac (page left open while it uploaded)
  opened on the iPhone without importing; it downloaded and showed the Mac's highlights and notes.
- That also observes 09a item 13's remaining part: annotations made on the Mac appeared on the iPhone. (Item 13
  says "same book imported on both"; here the iPhone got the same book by download, which is the 09b path. The
  annotation sync is the same mechanism.) Deletions across devices were reported on 2026-10-19.
- Every 09a and 09b contract item now has observed evidence → both phases Complete (PLANS.md, phase files).
  F-010 and F-016 evidence updated with the real-device checks.
- 09b is not merged into main yet (a push to main deploys production; waiting for the user's OK).

### 2026-10-20 00:27 EDT | Infrastructure | Claude Code (Opus 5.5) | CI trimmed (user decision)
- Measured (run 39367480019): setup ~1.3 min (browser install 63 s), verify.sh 913 s: lint+format+types 17 s,
  unit 24 s, browser e2e 9.8 min (1 worker on the 2-core private-repo runner), sync 3.0 min, perf 1.7 min. Total
  16.7 min against a 20-minute timeout; durations grew 8.7 → 16.7 min across phases. 33 runs in 2 days ≈ 276 wall
  minutes (≈310 billed), against 2000 a month on GitHub Free for a private repo.
- User decision: quick checks on branch pushes; full suite on main, pull requests and on demand before merging a
  phase; timeout 30 min; cache Playwright browsers. Also added: cancel a branch's older run when a newer push
  arrives (main always finishes). Parallel jobs not used (more billed minutes).
- .github/workflows/verify.yml rewritten (jobs `quick` and `verify`); AGENTS.md documents
  `gh workflow run verify.yml --ref <branch>` as the pre-merge CI check. YAML parsed and Prettier-clean locally;
  actionlint is not installed, so the first GitHub run is the real check. The quick job is unobserved until the
  next branch push.

### 2026-10-20 00:30 EDT | Phase 09b | Claude Code (Opus 5.5) | Merged into main (with the CI change); log times corrected
- Merged phase-09b-sync-book-files into main (--no-ff), then ci-trim (--no-ff; build-log conflict, both entries
  kept).
- Correction: eight entry headings from 2026-10-19 23:05 to 2026-10-20 01:00 had estimated times, some up to 80
  minutes off and out of order. Each now carries the time of the commit it belongs to (git log).

### 2026-10-20 00:50 EDT | Phase 09b | Claude Code (Opus 5.5) | Merged main verified, pushed, deployed
- `scripts/verify.sh` on merged main (cb6ec8a) → PASS: unit 260, browser 175 + 1 skipped, sync 30, perf 8 (chromium
  first 177, jump 20, p95 16.8; webkit first 186, jump 51, p95 29; canvas 67.1). Budgets unchanged.
- Pushed main (a5100f5..cb6ec8a). CI https://github.com/himmannshu/book-reader/actions/runs/39369974201 → success
  (04:30:53Z–04:47:45Z): job `quick` skipped, job `verify` ran the full suite (verify.sh 939 s; browser cache miss
  on this first run, browsers installed in 42 s and the cache saved). Cloudflare Pages check on cb6ec8a → success.
- Production: logged-out GET /api/files/<id> → 302 to the Access login.
- Not yet observed: the `quick` job (next branch push) and a browser-cache hit (next full run).

### 2026-10-20 01:05 EDT | Planning | Claude Code (Opus 5.5) | UI/UX phase added; standing instructions; moving to the cloud
- User request: add "improving the UI/UX design" to the goals and plan. Added as phase 14 "UI and UX design pass"
  (after 13 Search, before the later features); Voice notes, Listen and Share move to 15, 16, 17. GOALS.md Scope's
  "Later" line updated. features.json gains F-017 to F-020 (failing) for phases 14 to 17.
- User decision: keep building the roadmap (10 → 17) while away, using the original direction and the agent's
  best judgment, in a cloud session. Standing instructions recorded in harness/HANDOFF.md (stacked phase
  branches; no pushes to main; self-approved plans recorded as such; user-only checks left pending).

### 2026-10-20 05:45 UTC | Phase 10 | Claude Code (Opus 5.5, cloud session) | Cloud baseline on 8c2c526 (= local main 1b47217 + branch note)
- Environment: Node 24.22 installed with nvm (the image has 22). `npm ci` OK. Network policy blocks
  cdn.playwright.dev and playwright.download.prss.microsoft.com (403), so Playwright's pinned Chromium 1248 and
  WebKit 2370 cannot be installed. The preinstalled Chromium 141 is too old for pdfjs-dist 6.4 (pages fail with
  `getOrInsertComputed is not a function`). Workaround outside the repo: Chromium 153 from the npm package
  @sparticuz/chromium (scratchpad), linked into a private PLAYWRIGHT_BROWSERS_PATH under the pinned revision
  names. No repo file changed for this. The stand-in for verify runs the same steps with Chromium projects only.
- Baseline results (no app changes): lint, format, typecheck PASS; unit 260 passed; browser (chromium) 87 passed,
  1 failed: "Chromium reports the app as installable" (needs full Chromium with a profile; the npm build is a
  headless shell that reports no installability errors). Sync (sync-chromium, wrangler local D1/R2) 15 passed.
  Perf (perf-chromium) 3 passed, 1 failed: firstPage 351, 350, 368 ms in three runs (budget 350; the Mac measured
  177 on the same code), jump 34/42/29, p95 16.8, canvas 67.1 MB. The 4-core cloud machine is slower; budgets are
  not changed. Here perf is only compared before/after on this machine; the budget evidence is the full CI run.
- Not available here: WebKit (all suites), the installability check, Mac-comparable timings.
- Phase 10 contract and context written, approved by the agent under the user's standing instruction.

### 2026-10-20 06:05 UTC | Phase 10 | Claude Code (Opus 5.5, cloud session) | Built; stand-in verify (Chromium) and perf before/after
- Correction to the 05:45 entry: the local Chromium first-page budget is 250 ms (e2e/perf/budgets.json), not 350.
  The baseline here (350, 351, 368 ms) already fails it by about 100 ms on unchanged code; budgets unchanged.
- Red first: layout tests (7 failing, including the phase 02 F1 redraw check), core zoom tests, viewer position
  and zoom tests, storage tests (reading state, v6 → v7 upgrade, preferences), e2e/comfort.spec.ts (12 failing in
  Chromium) and the highlight alignment-at-zoom test. Mutation: dropping the "already moved" guard in ReaderView
  turns "stays put when the reader already scrolled" red.
- Found while building: saving on unmount from a passive effect cleanup stored scrollTop 0 (React detaches the DOM
  first). Fixed with a layout-effect cleanup; leaving and hiding always save.
- Existing tests that assumed a reopened book starts at page 1 (now it resumes): sync files.spec "Remove from this
  device…" now expects page 3 at the top (stronger); bookmarks and notes reopen helpers wait for whichever page
  is drawn. The bookmarks one failed once (reload racing the save), then passed 3×3 repeats with the fix.
- Phone width (390 px): the new Theme control pushed the toolbar past the edge; the toolbar now wraps (new test).
- Stand-in verify on 39980d4 + test fixes: lint, format, typecheck PASS; unit 297 passed; browser (chromium) 100
  passed + new tests, 1 failed = the installability check (environment, same as baseline); bookmarks/notes/
  highlights 165/165 over 3 repeats; sync (chromium) 15 passed.
- Perf (chromium) after, six runs: firstPage 340, 343, 355, 364, 353, 340 (baseline 350, 351, 368); jump 29–46
  (baseline 29–42); p95 16.8 in 5 of 6 runs and 33.3 once (baseline 16.8 ×3); canvas 67.1 MB (unchanged); blank
  0%. No regression seen on this machine; the budget evidence is the full CI run.
- Full CI run started: https://github.com/himmannshu/book-reader/actions/runs/39376651997 (on 39980d4).

### 2026-10-20 06:00 UTC | Phase 10 | Claude Code (Opus 5.5, cloud session) | User instruction: run all phases; user checklist
- User (going to sleep): continue phase after phase to 17 without waiting; keep a strict list of what the user
  must check; stay inside free tiers (Cloudflare, GitHub Actions). New file harness/USER-CHECKLIST.md holds that
  list (a new file outside the table in AGENTS.md, added because the user asked for it). HANDOFF standing
  instructions updated.

### 2026-10-20 06:35 UTC | Phase 10 | Claude Code (Opus 5.5, cloud session) | Evaluator FAIL; CI red; fixes
- Full CI run https://github.com/himmannshu/book-reader/actions/runs/39376651997 on 39980d4 → failure: 200 passed,
  1 skipped, 3 failed, all WebKit: bookmarks "still listed … after a reload" and "a removed bookmark stays removed
  after a reload" (the reopen helper expected page 1; fixed in 1152b2d), and comfort "at 400% …" (test timeout
  30 s while waiting for animation frames, on the first try and the retry).
- Evaluator (fresh context): harness/code_review/phase-10-review.md, verdict FAIL. Blockers: CI red / never run on
  HEAD; the WebKit 400% stall needs a reproduction, not a longer timeout; device check pending (user).
  Non-blocking: silent failed read of the saved place; horizontal position not saved; zoom menu wrong for a saved
  zoom outside the levels; plus smaller notes (phone toolbar height, dark photos inverted, fit page redraws when
  iOS bars move).
- Fixes: the 400% test now scrolls inside the page and records every frame gap (annotation + console), asserts no
  gap reaches 5 s (a freeze), and is marked slow (90 s) for software-painted WebKit; Chromium here: median 17 ms,
  max 33 ms. A failed read of the saved place is always logged. The zoom menu lists a saved custom zoom (unit test).
  Deferred to phase 14 (recorded in the context file): saving the horizontal position, phone toolbar height, photo
  inversion in Dark, fit-page redraws on iOS bar changes.

### 2026-10-20 06:50 UTC | Phase 10 | Claude Code (Opus 5.5, cloud session) | Full CI green; phase 10 done except the device check
- Full CI https://github.com/himmannshu/book-reader/actions/runs/39380276967 on 9b5e7ba → success (06:25–06:44Z):
  unit 298; browser 203 passed, 1 skipped (chromium + webkit); sync 30; perf 8 passed, --- PASS. Perf table:
  chromium firstPage 444, jump 35, p95 50.1, blank 0, canvas 67.1 (CI budgets ×4: enforced, pass); webkit 1591,
  983, 541, 85.7%, 67.1 (report-only on Linux CI, as before). 400% frame gaps: chromium median 17 / max 33 ms;
  webkit median 633 / max 675 ms (steady; no freeze).
- Contract items 1–12 have evidence (cloud Chromium runs above plus this CI run); item 13 (devices) waits on the
  user. features.json F-011, F-012 → passing. Review appendix added to harness/code_review/phase-10-review.md.

### 2026-10-20 06:55 UTC | Phase 11 | Claude Code (Opus 5.5, cloud session) | Built in a worktree on branch phase-11-library-view
- Plan, contract and context written, approved by the agent under the user's standing instruction.
- Unit tests first for storage (covers v8, reading-state list, v7 → v8 upgrade; 4 red until the store existed, then
  a realm-safe ArrayBuffer check) and the cover queue. Core shelf tests were written together with the module (not
  run red first). e2e/library-view.spec.ts was written before the shelf UI but not run red first.
- Found while building: the shelf reloaded in the Library button's handler, before the reader unmounted and saved
  its place; it now reloads in an effect once the Library shows. A book still on page 1 reads "Not started".
- Merged phase-10-reading-comfort-k8v7pk (9b5e7ba) into this branch: clean.
- Stand-in checks on the merge: lint, format, typecheck PASS; unit 315 passed; browser (chromium, alternate port
  4183 via an uncommitted scratch config so the evaluator's runs on 4173 were not disturbed) 107 passed, 1 failed =
  the installability check (environment); library-view 6/6 including 100 books (shown < 1 s, filter < 100 ms).
- Perf (chromium), alternating phase 10 and phase 11 runs under the same load: firstPage p10 388/372/389,
  p11 371/399/405; scroll p95 33 ms in 4 of 7 p11 runs and 3 of 7 p10 runs, otherwise 16.8; canvas 67.1 MB both.
  Same distribution: no regression seen.

### 2026-10-20 07:05 UTC | Phases 12–13 | Claude Code (Opus 5.5, cloud session) | Built in worktrees, stacked on phase 11
- Phase 12 (branch phase-12-export-annotations): src/core/export.ts unit tests written first and red (module
  missing), then green (one test bug: '### Page' contains '## '). e2e/export.spec.ts (download event, file name,
  contents in book order; disabled reason while unsaved) 2/2. The first full run showed notes.spec "keyboard
  newline…" failing: the export button sat between "Add note" and the notes in the arrow-key order; moved to
  the end of the panel; notes + export 20/20. Full chromium (alternate port) 108 passed + 1 environment failure.
- Phase 13 (branch phase-13-search-in-book): core search unit tests with the module (8); engine pageText; viewer
  marks matches in text layers; search panel with Cmd/Ctrl+F. e2e/search.spec.ts 4/4 (not run red first; on
  phase 12 they cannot pass: no Search button). New report-only benchmark searchMs (no budget until the user
  agrees one; budgets.json untouched): 3657 ms, then 2661 ms after asking 4 pages ahead. Unit 329 passed;
  chromium e2e 113 passed + 1 environment failure (installability).

### 2026-10-20 07:40 UTC | Phase 11 | Claude Code (Opus 5.5, cloud session) | Evaluator FAIL → fixes
- Evaluator: harness/code_review/phase-11-review.md, FAIL. Blockers: cover work during reading (opening a second
  book drew the first's cover; a background cover was not cancelled, first page 224 → 388 ms) and two cover jobs at
  once (queue restarted on shelf changes). Full CI not yet run.
- Fixes (see the review appendix): CoverWorker; unit tests red then green (5); new e2e red under a mutation that
  removes the pauses (2 covers while reading), green with the fix. Unit 317 passed; chromium e2e 108 passed + 1
  environment failure. Merged phase 10's close-out (0343e3d) into this branch.

### 2026-10-20 08:10 UTC | Phase 14 | Claude Code (Opus 5.5, cloud session) | Built on branch phase-14-ui-ux-design
- Plan and contract written (phase file created from the template), approved by the agent under the standing
  instruction. e2e/design.spec.ts written first: 12 red on the old UI (bar heights, touch targets at iPhone 13 and
  iPad gen 7 emulation, 320/390 px overflow, contrast of control borders in all three themes, pinch, horizontal
  place, phone search bar).
- Built: one reader bar (tools portalled into the app header), icon set, Display menu on phones, 44 px touch
  targets, darker control borders, notice as a toast, phone search bar, saved horizontal place (centreX), page
  draw failure message (unit test red first), aria-disabled bookmark button with a visible reason.
- Tests changed by design: comfort.spec "on a phone" opens Display first; ReaderView.test bookmark toggle uses
  aria-disabled and a tap. Contract amendment 01: ctrl+wheel pinch dropped (non-passive wheel listener would make
  Chrome scrolling wait for the main thread); Safari gesture pinch kept.
- Checks (chromium, cloud): unit 334 passed; design 12/12; full e2e 126 passed + 1 environment failure.
- Perf, alternating phase 13 and phase 14 runs with nothing else running: firstPage p13 384/383/389, p14
  353/395/391; scroll p95 33.3 in 5 of 6 runs for both on this machine at that time (16.8 in the other). An earlier
  loaded run (phase 15 tests running alongside) showed 392–506 ms and is not counted.

### 2026-10-20 08:15 UTC | Phase 11 | Claude Code (Opus 5.5, cloud session) | Full CI green after review fixes
- Full CI https://github.com/himmannshu/book-reader/actions/runs/39384034130 on ea94d2f → success (07:03–07:16Z).
  The later commits on this branch (c552093, bf4b7d0) only repair Markdown merge conflicts (Markdown is outside the
  format check), so the code is the one CI ran.
- Contract items 1–11 have evidence; item 12 (devices) waits on the user. features.json F-013 → passing.

### 2026-10-20 08:50 UTC | Phase 12 | Claude Code (Opus 5.5, cloud session) | Evaluator FAIL → fixes
- Full CI https://github.com/himmannshu/book-reader/actions/runs/39387029990 → failure: 220 passed, 1 skipped,
  1 failed (WebKit export: Playwright's WebKit names the download with underscores).
- Evaluator: harness/code_review/phase-12-review.md, FAIL (escaping "1." showed a backslash; CI red).
- Fixes: escaping (unit tests red then green), empty chapter headings, export reasons when loading failed, error
  message on a failed export, browser-specific download-name assertion. Unit 325; chromium export + notes 20/20.

### 2026-10-20 09:00 UTC | Phase 13 | Claude Code (Opus 5.5, cloud session) | Evaluator FAIL → fixes
- Full CI https://github.com/himmannshu/book-reader/actions/runs/39387033790 → failure, only the WebKit export
  download-name test inherited from phase 12 (fixed there).
- Evaluator: harness/code_review/phase-13-review.md, FAIL on CI only; search behaviour all checked and passing.
- Fixes: benchmark query and result check (searchMs 2672 ms, "1 match on 1 page"), capped page count, Cmd/Ctrl+F
  per platform. Unit 333; chromium search + export 6/6.

### 2026-10-20 09:40 UTC | Phase 14 | Claude Code (Opus 5.5, cloud session) | Evaluator FAIL → fixes
- Evaluator: harness/code_review/phase-14-review.md, FAIL (search-result mark 2.91:1 in Dark; no tooltips below
  1400 px; no green full CI). Fixes: `--mark-bg` tokens + contrast test pair, tooltips on all toolbar controls
  (test), Display menu closes on an outside tap (test). Unit 336; chromium e2e 126 passed + 1 environment failure.

### 2026-10-20 12:55 UTC | Phase 15 | Claude Code (Opus 5.5, cloud session) | Built; evaluator FAIL → fixes
- Built (earlier today, in worktree /home/user/book-reader-p15): core model and storage v9 with unit tests
  first; recorder, hook, Notes panel section, highlight action; e2e/voice-notes.spec.ts with a synthetic
  microphone (4/4, then 5/5 with the recording bar).
- Evaluator: harness/code_review/phase-15-review.md, FAIL (audio URL leak on close; microphone left on when the
  reader closed during the permission prompt; missing unit tests for the time limit and the upgrade; CI).
- Fixes: see the review appendix. New unit tests: recorder (3), useVoiceNotes lifecycle (3, red on the old hook),
  v8 → v9 upgrade. Unit 352 passed; chromium voice-notes 5/5.

### 2026-10-20 13:10 UTC | Phase 16 | Claude Code (Opus 5.5, cloud session) | Built; evaluator FAIL → fixes
- Built (earlier today, worktree /home/user/book-reader-p16): sentence splitting with unit tests (6); viewer
  marks shared with search; speech wrapper and hook; Listen button and player bar; e2e/listen.spec.ts with a
  stand-in speechSynthesis (5/5). Toolbar padding trimmed under 360 px so seven 44 px buttons fit (design 12/12).
- Full CI on phase 17 (run 39392502232, contains this branch) → failure: WebKit listen.spec pause/resume (race
  with the end of the book), 274 passed, 3 skipped.
- Evaluator: harness/code_review/phase-16-review.md, FAIL (that test; unstable player buttons; toast over the
  player). Fixes: see the review appendix. Unit 358; chromium e2e 137 passed + 1 environment failure.

### 2026-10-20 13:20 UTC | Phase 17 | Claude Code (Opus 5.5, cloud session) | Built; evaluator FAIL (CI) → fixes
- Built (earlier today, worktree /home/user/book-reader-p17): share text in src/core (unit tests), share helper
  with clipboard fallback, Share on a highlight; e2e/share.spec.ts (stand-in share sheet and clipboard) 3/3;
  chromium e2e 138 passed + 1 environment failure.
- Perf, alternating phase 14 and phase 17 runs: firstPage p14 492/402/390, p17 372/396/406; jump 48/40/51 vs
  56/37/36; scroll p95 33.3 in all six (this machine at that time). No regression.
- Evaluator: harness/code_review/phase-17-review.md, FAIL on CI only (the phase 16 test); one small bug (emoji cut
  in half in a long passage without spaces), fixed with a unit test red first.

### 2026-10-20 13:25 UTC | Phase 12 | Claude Code (Opus 5.5, cloud session) | Full CI green after review fixes
- Full CI https://github.com/himmannshu/book-reader/actions/runs/39391982795 on 36073e0 → success (08:14–08:34Z).
- Contract items 1–6 have evidence; item 7 (devices, layout confirmation) waits on the user. F-014 → passing.

### 2026-10-20 13:40 UTC | Phases 13–17 | Claude Code (Opus 5.5, cloud session) | Full CI green
- Full CI https://github.com/himmannshu/book-reader/actions/runs/39425682679 on 9475607 (phase 17 head; contains phases 13–16 and every review fix) → success (12:52–13:16Z),
  chromium + webkit, sync and perf included. One run for the stack to save Actions minutes (phases 13–16 are
  ancestors of this commit with no changes of their own since).
- F-015, F-017, F-018, F-019, F-020 → passing (automated evidence); each contract's device item waits on the user
  (harness/USER-CHECKLIST.md). PLANS rows 13–17 updated. Records kept on this top branch; the lower branches
  receive them when merged in order.

### 2026-10-20 16:40 UTC | Phases 10–17 | Claude Code (Opus 5.5, cloud session) | Merged into main
- The user checked the phase 17 preview ("looked good") and asked for the merge. Before it: main unchanged since
  cb6ec8a and an ancestor of phase 17 (fast-forward); every phase branch 10–16 contained in phase 17; since the
  green full run (39425682679 on 9475607) only harness files changed; quick CI on 77c4266 green (39429904081);
  no changes under functions/, public/ or package files against main (no server or D1 change; IndexedDB
  upgrades v6 → v9 run on the device and are covered by the upgrade unit tests).
- main fast-forwarded to phase 17 (the user chose this over a PR): one production deploy.
- Remaining USER-CHECKLIST items are now checked in daily use; problems found go to new work.
