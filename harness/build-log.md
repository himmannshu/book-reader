# Build log

Source of truth for what actually happened and what was actually observed. Append only.
Never write a planned command as if it passed. Record skipped checks and why.
If an earlier entry is wrong, append a correction that names it.

## Phase summary

| Phase | Status | Branch | Evidence | Blockers |
|---|---|---|---|---|
| 01 | In progress | phase-01-open-and-read-pdf | verify PASS at 5d07bf2; items 1–10 observed | item 11 needs the user |
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
