# AGENTS.md

Shared instructions for every coding agent in this repo (Claude Code, Codex, or anything else).
Claude Code reads this through CLAUDE.md. Codex reads it directly. Keep this file short and
put detail in the files it points to. Do not duplicate rules anywhere else.

## Project

A Kindle-like reader for PDF books, built as an installable web app (PWA) that runs on Mac,
iPad and iPhone. It is a personal tool first, but it should be able to open up to other people
later. Core features: fast native PDF reading (continuous scroll), table of contents,
bookmarks, highlights and notes. The stack is TypeScript, React and Vite, with PDF.js for
rendering. Data is local-first (OPFS and IndexedDB), and Cloudflare (R2, D1, Workers, Pages)
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
  to an external system.

## Keeping the handoff alive

Usage limits can cut an agent off without warning, so the handoff must stay current while you
work, not only at the end. Update harness/HANDOFF.md after each meaningful step (a test going
green, a decision, a blocker) and run `scripts/handoff.sh --write` to refresh the auto snapshot.
If you are about to stop for any reason, follow harness/prompts/04-handoff.md.

## Commands

- Verify everything: `scripts/verify.sh` (the only command that counts as evidence)
- Snapshot state: `scripts/handoff.sh`
Planned names. They are created in phase 00, and none of them exist before then.

- Install: `npm ci`
- Run dev server: `npm run dev`
- Unit tests only: `npm run test:unit`
- Browser (Playwright) tests: `npm run test:e2e`
- Lint and types: `npm run lint` and `npm run typecheck`

## Conventions

Architecture decisions and their reasoning: harness/context/architecture-decisions.md.
Do not reverse one silently. Append a superseding entry there and note it in the build log.

- Runtime: Node 24, npm, with a committed `package-lock.json`. TypeScript in `strict` mode.
- UI: React + Vite. The page viewer (canvases, scrolling, virtualization) is plain TypeScript
  outside React. React renders only the surrounding chrome (library, panels, settings).
- PDF: PDF.js (`pdfjs-dist`), used only through the engine interface in `src/engine`, running in
  a Web Worker. No other module imports PDF.js.
- Folder layout (high level; refine inside phases):
  - `src/core`: DOM-free logic (annotations, library model, reading position). No browser APIs.
  - `src/engine`: PDF engine interface and the PDF.js adapter and worker.
  - `src/viewer`: plain-TS viewer (virtualized pages, bitmap cache).
  - `src/storage`: storage interfaces, plus local (OPFS/IndexedDB) and cloud adapters.
  - `src/ui`: React components.
  - `e2e/`: Playwright tests and performance benchmarks.
  - `tests/fixtures/`: test PDFs. Generated or public domain only, never the user's own books.
- Unit tests sit next to the code as `*.test.ts`.
- Annotations are stored in PDF coordinates (page index plus rectangles in PDF points) together
  with the quoted text. Never store screen pixels.
- All persistence goes through the `src/storage` interfaces. UI and viewer code never call
  IndexedDB, OPFS or `fetch` to the cloud directly.
- Tests never touch the network or the live cloud. Cloudflare pieces are tested with local
  `wrangler` emulation.
- Speed is a feature. A change that makes a benchmark in `e2e/` fail is a regression, even if
  every other test passes.
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
