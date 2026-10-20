# AGENTS.md

Shared instructions for every coding agent in this repo (Claude Code, Codex, or anything else).
Claude Code reads this through CLAUDE.md. Codex reads it directly. Keep this file short and
put detail in the files it points to. Do not duplicate rules anywhere else.

## Project

A Kindle-like reader for PDF books, built as an installable web app (PWA) that runs on Mac,
iPad and iPhone. It is a personal tool first, but it should be able to open up to other people
later. Core features: fast native PDF reading (continuous scroll), table of contents,
bookmarks, highlights and notes. The stack is TypeScript, React and Vite, with PDF.js for
rendering. Data is local-first (IndexedDB, D5a), and Cloudflare (R2, D1, Workers, Pages)
is the cloud for backup and moving books between devices. Claude Code and Codex build it in
turns. The reasoning behind each choice is in harness/context/architecture-decisions.md.

Goals and non-goals live in GOALS.md. The phase roadmap lives in PLANS.md.

## Source of truth

| Question | File |
|---|---|
| What are we building and what is out of scope? | GOALS.md |
| What is the phase order? | PLANS.md |
| What exactly is in the current phase? | harness/build/phase-NN-<slug>.md |
| What does "done" mean for this phase? | harness/contracts/phase-NN-contract.md |
| Which features pass or fail right now? | harness/features.json |
| Where did the last agent stop? | harness/HANDOFF.md |
| What was actually run and observed? | harness/build-log.md |
| Why was a decision made? | harness/context/phase-NN-<slug>-context.md |
| What did the reviewer find? | harness/code_review/ |
| Reusable prompts for each workflow step | harness/prompts/ |

If two files disagree, the more specific one wins, and you record the conflict in the build log.

## Session start (always, in this order)

1. Read harness/HANDOFF.md.
2. Read the last 30 lines of harness/build-log.md.
3. Run `git status` and `git log --oneline -8`.
4. Run `scripts/verify.sh` and note whether the baseline is green.
5. Read the current phase file and its contract.

Treat any uncommitted changes you did not make this session as unverified until step 4 passes.
Do not trust a status line over what the tests show.

## Working agreements

- Work on one phase at a time. Stop when it is done. Do not start the next phase on your own.
- Before starting a phase, post a short plan (scope, files likely touched, tests, risks) and wait
  for approval. After approval, work without asking for approval on every edit.
- Write the failing test or check first, then the minimum code to pass it, then refactor.
- Only the phase contract defines "done". A phase is complete when every contract item has
  observed evidence in harness/build-log.md.
- Never mark an item in harness/features.json as passing unless you ran the check and saw it pass.
  Never delete or reword a feature description. Only change its status and evidence.
- Keep the plan high level. Do not invent detailed technical specs in PLANS.md. Decide
  implementation details during the phase, where you can see the real code.
- Small commits on a phase branch named `phase-NN-<slug>`. Commit format: `phase NN: <what>`.
  Use `wip:` prefix for checkpoints. Commit before you stop, always.
- Ask before: pushing, deploying, touching credentials, adding a paid dependency, or any write
  to an external system. Pushing `main` deploys production (Cloudflare Pages Git integration), and
  pushing any other branch creates a preview deployment, so every push is also a deploy.

## Keeping the handoff alive

Usage limits can cut an agent off without warning, so the handoff must stay current while you
work, not only at the end. Update harness/HANDOFF.md after each meaningful step (a test going
green, a decision, a blocker) and run `scripts/handoff.sh --write` to refresh the auto snapshot.
If you are about to stop for any reason, follow harness/prompts/04-handoff.md.

## Commands

- Verify everything: `scripts/verify.sh` (the only command that counts as evidence)
- Snapshot state: `scripts/handoff.sh`
- Install: `npm ci && npx playwright install chromium webkit` (Node 24, see `.nvmrc`)
- Run dev server: `npm run dev` (http://localhost:5173)
- Unit tests only: `npm run test:unit` (Vitest, jsdom)
- Browser tests: `npm run test:e2e` (Playwright on the production build, Chromium + WebKit)
- Lint, format and types: `npm run lint`, `npm run format:check` (`npm run format` to fix),
  `npm run typecheck`
- Performance budgets: `npm run test:perf` (separate config playwright.perf.config.ts; budgets in
  e2e/perf/budgets.json; results in perf-results/). `PERF_BOOK=/path/to/book.pdf npm run test:perf`
  measures your own book without enforcing budgets or copying it into the repo.
- Regenerate test PDFs: `npm run fixtures` (writes tests/fixtures/, deterministic)
- Regenerate app icons: `npm run icons` (writes public/icons/, deterministic)
- Deploy: there is no deploy command. Cloudflare Pages builds from GitHub (see docs/deploy.md).
- Sync tests (two devices, local D1 and R2): `npm run test:sync` (playwright.sync.config.ts runs
  `wrangler pages dev` on port 8788 with local D1 and R2; no Cloudflare account needed)
- What verify runs: `scripts/verify.local.sh` (lint → format → types → unit → browser → sync → perf)
- CI (.github/workflows/verify.yml; private repo, so Actions minutes are limited): a branch push
  runs quick checks only (lint, format, types, unit). The full suite runs on pushes to `main`, on
  pull requests, and on demand. Before merging a phase, run it on the branch and record the run:
  `gh workflow run verify.yml --ref <branch>` (a phase's "CI is green" means this run).

## Conventions

Architecture decisions and their reasoning: harness/context/architecture-decisions.md.
Do not reverse one silently. Append a superseding entry there and note it in the build log.

- Runtime: Node 24, npm, with a committed `package-lock.json` and exact version pins.
  TypeScript in `strict` mode, pinned to 6.0.x because typescript-eslint does not support 7 yet
  (see harness/context/phase-00-repository-foundation-context.md).
- UI: React + Vite. The page viewer (canvases, scrolling, virtualization) is plain TypeScript
  outside React. React renders only the surrounding chrome (library, panels, settings).
- PDF: PDF.js (`pdfjs-dist`), used only through the engine interface in `src/engine`, running in
  a Web Worker. No other module imports PDF.js.
- Folder layout (high level; refine inside phases):
  - `src/core`: DOM-free logic (annotations, library model, reading position). No browser APIs.
  - `src/engine`: PDF engine interface and the PDF.js adapter and worker.
  - `src/viewer`: plain-TS viewer (virtualized pages, bitmap cache).
  - `src/storage`: the `BookStore` interface, plus the IndexedDB adapter and (later) cloud adapters.
  - `src/ui`: React components.
  - `e2e/`: Playwright tests and performance benchmarks.
  - `tests/fixtures/`: test PDFs. Generated or public domain only, never the user's own books.
  - `tests/config/`: Node-side unit tests for config files (for example `public/_headers`).
  - `public/`: static files copied as-is into the build (icons, Cloudflare `_headers`).
  - `docs/`: guides for the user, such as `docs/deploy.md` (Cloudflare setup).
  - `functions/`: Cloudflare Pages Functions (the sync and files APIs; bindings `DB` = D1,
    `FILES` = R2). `functions/_lib/` holds testable code; only `functions/api/**` files are routes.
    Type-checked with tsconfig.functions.json.
  - `src/sync/`: the sync engine, the book-file uploader and downloader, the store trigger, and
    the only `fetch` calls (`http-client.ts`).
- Unit tests sit next to the code as `*.test.ts`.
- Annotations are stored in PDF coordinates (page index plus rectangles in PDF points) together
  with the quoted text. Never store screen pixels.
- All persistence goes through the `src/storage` interfaces. UI and viewer code never call
  IndexedDB, `navigator.storage` or `fetch` to the cloud directly (lint enforces the first two).
- Tests never touch the network or the live cloud. Cloudflare pieces are tested with local
  `wrangler` emulation.
- Network: only `src/sync/http-client.ts` may call `fetch` (lint enforces it). Sync rules live in
  `src/core/sync.ts` and are shared by the browser and the server.
- No `wrangler.toml`: Pages would then take its bindings from the file instead of the dashboard.
  Local runs pass bindings as command-line flags (see playwright.sync.config.ts).
- Book files are stored as ArrayBuffers, not Blobs: Safari private browsing and Playwright's WebKit
  reject Blobs in IndexedDB.
- Never run `npm run test:perf` in two worktrees at once. The runs share port 4174 and the CPU, so
  timings from overlapping runs are meaningless.
- Speed is a feature. A change that makes a benchmark in `e2e/perf/` fail is a regression, even if
  every other test passes. Change a budget only with the user's agreement, recorded in the build log.
- Errors: never swallow them silently. Show the user a readable message for failures they can
  act on (a bad PDF, storage full).

## Boundaries

- Never read or write `.env*` or anything under `secrets/`.
- Never rewrite git history on a shared branch.
- Do not add files outside the repo structure described here without saying why in the build log.
- Do not edit harness/contracts/ after approval except to append a clearly marked amendment.

## Review

When practical, the agent that did NOT write a phase reviews it, using
harness/prompts/03-evaluate.md and the rubric in harness/EVALUATOR.md. Reviewers must run the
software, not only read the diff. See harness/SWITCHING.md.
