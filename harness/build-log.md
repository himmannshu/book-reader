# Build log

Source of truth for what actually happened and what was actually observed. Append only.
Never write a planned command as if it passed. Record skipped checks and why.
If an earlier entry is wrong, append a correction that names it.

## Phase summary

| Phase | Status | Branch | Evidence | Blockers |
|---|---|---|---|---|
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
