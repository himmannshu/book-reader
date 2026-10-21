# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Claude Code (Opus 5.5), local session on the user's Mac, 2026-10-20.
- Local baseline: verify on main (fea67a5) failed 9 WebKit tests on macOS (first WebKit run on a
  Mac). Fixed on branch `mac-webkit-baseline` (6a30927, not pushed): verify PASS there, WebKit and
  perf included. Causes: harness/context/mac-webkit-baseline-context.md. One real app change:
  `.picker` drawn with `appearance: none` (Mac Safari drew selects at 27 px). Merging it to main
  is the user's call (pushing main deploys).
- Phases 00–18 Complete. Phase 18 (design foundations) and the test-suite trim were merged into
  main by fast-forward on 2026-10-20 (CI green: runs 39477809896, 39483921300).
- Phases 19–23 planned (PLANS.md) from the user's Claude Design system "Book Reader"
  (https://claude.ai/artifact/5EuNHSDvWfNx3LnfyLzi7Z; copy in harness/context/design-system/).
- Branch `docs-readme` holds the new README alone; merge it when the demo GIF is ready.
- Branch `phase-10-reading-comfort-k8v7pk` is merged and stale; the user deletes it on GitHub.
- Everything the user must check is in harness/USER-CHECKLIST.md.

## Standing instructions from the user (2026-10-20; ended with the merge of 10–17)

(Ended with the merge on 2026-10-20; kept for the record.) The user was away and asked the agent to keep building the roadmap, phase after phase, using the
original direction (GOALS.md, architecture-decisions.md) and its own best judgment wherever input
would normally be needed. These override AGENTS.md's "wait for approval" and "do not start the
next phase" for this run only. Everything else in AGENTS.md still holds.
- Order: 10 → 17 as in PLANS.md. One phase at a time, each on its own branch `phase-NN-<slug>`,
  cut from the previous phase's branch (stacked), since main only moves with the user.
- Plans and contracts: write them as usual, mark "Approved by: agent under the user's standing
  instruction of 2026-10-20", and record each judgment call in the phase's context file.
- Pushing: phase branches may be pushed (a preview deploy and quick CI). Never push or merge
  main: that deploys production. The user reviews the previews and merges.
- Full CI: before calling a phase done, run `gh workflow run verify.yml --ref <branch>` if gh is
  available; otherwise record that it couldn't run. `scripts/verify.sh` stays the evidence.
- Items only the user can check (real devices, Cloudflare dashboard steps): leave them pending,
  list them in "Waiting on the user" below with exact steps, and move on to the next phase.
- Never: credentials or Cloudflare dashboard changes, paid services or dependencies, budget
  changes in e2e/perf/budgets.json, the user's own books. Prefer free, on-device browser features
  (for example the Web Speech API for reading aloud, MediaRecorder for voice notes).
- If the cloud machine can't run part of verify (for example WebKit, wrangler or perf timings),
  first run verify on main there as a baseline, record what the environment can't do, and never
  loosen a test or budget to get a pass.
- Run the evaluator subagent on each finished phase when practical; fix blockers it finds.

- Added by the user later on 2026-10-20 (going to sleep): keep going through every phase to 17
  without stopping or asking, unless a usage limit hits. Keep harness/USER-CHECKLIST.md as the
  strict list of what the user must check, per phase. Never risk a bill: stay inside free tiers
  (Cloudflare Pages builds: about one push per phase plus fixes; Actions: quick checks on pushes,
  one full run per phase; R2 under the 9 GB cap; no paid APIs). Push branches as you see fit.

## Waiting on the user

- Everything is listed in harness/USER-CHECKLIST.md (per phase, with exact steps).

## In flight

- Phase 20 done except the user's device check: review PASS after fixes; `scripts/verify.sh` PASS at d966d2b; full CI
  green (run 39546956538 on 4d8203b, after a test-race fix). `phase-20-panels-and-sheets` is pushed up to 4d8203b
  (preview built); the record commit after it is local. PLANS row 20 In progress until the user's check; F-022
  passing (device check noted). It is stacked on phase 19 and `mac-webkit-baseline`; none is merged into main.
- Local machine notes: `npm ci && npx playwright install chromium webkit` (Node 24). Never run perf in two places
  at once. Close heavy browser tabs before verify: WebKit tests stall under load.

## Next action

1. User: device checks for phase 20 (USER-CHECKLIST); merges into main (pushing main deploys production; a
   fast-forward to `phase-20-panels-and-sheets` brings the baseline fix and phases 19–20).
3. Then phase 21 (Highlight colours): plan and contract for approval. It includes the AnnotationRow More menu
   (Change colour, Share, Copy) deferred from phase 20 by the user's choice.
4. Watch: WebKit steady-scroll p95 near its budget in some full runs, and one of its three samples is a ~2.4 s
   freeze on every run (also on the baseline: worth a look of its own); load-sensitive tests (voice-notes chromium,
   library-view 100 books, design zoomed reopen); WebKit whole-book search measured 1391 ms once (893 in the
   evaluator's run; not budgeted).

## Decisions worth remembering

- Phase 07 direction: D7–D9; contract approved by the user (Amendment 01 records approval).
- Engine API and memory bounds: harness/context/phase-01-open-and-read-pdf-context.md.
- Layout uses page 1's size as an estimate, then corrects after loadPageSizes() (anchor kept).
- pdfjs-dist 6.4 → minimum Safari/iOS 17.4.
- TypeScript pinned to 6.0.x until typescript-eslint supports 7 (phase-00 context file).
- Highlights: rects in PDF points, top-left origin, rotation applied (same space as PageSize); line top/height
  from the text span's box, since Chromium rounds selection boxes to whole px (phase-06 context file).
- Text layers only for visible pages, after a scroll pause; the highlight hook's scroll listener must stay idle
  while no floating button shows, or WebKit p95 reaches the 40 ms budget.
- Touch actions must not cancel pointerdown: WebKit then suppresses the click. Keep mousedown
  prevention for desktop and use offeredRange for touch/keyboard focus changes.
- Ranges move when nodes are removed. The create-offer observer keeps the original endpoint nodes
  and disconnects on dismissal; it adds no observer/layout work to idle scrolling.
- Fixture drawText uses unkerned Tj advances; sum individual glyph widths for the manifest. pdf-lib's
  whole-string width includes kerning that its PDF output does not apply.

## Blockers and doubts

- Phase 07: CI/full user checklist confirmation outstanding. Main lacks the completed
  Phase 06 dependency; the Phase 07 branch deliberately starts at 8372a99 instead of main.
- Phase 06:
  - No blocking contract items remain. B1–B3 corrected, user check confirmed, CI green.
  - N1 Highlight before highlights load silently does nothing; N2 WebKit has thin performance headroom
    (budget 40 ms) and the benchmark never measures text layers; N3 unsaved note touches the edge at 320 px.
    N4 duplicate import cleaned up with B2.
- Historical non-blocking review findings (not all rechecked in Phase 07; user to decide):
  - Phase 05 minor: disabled toggle's reason only a tooltip (iOS can't show it); unused Viewer.currentPage;
    toggle ~2 px past the edge at 320 px.
  - Phase 03 F1 (medium, iPhone): book title shrinks to 0 px while confirming removal at 390 px.
  - Phase 03 F2/F3: wrong "unavailable" wording at startup; save-failure alert survives Library.
  - Phase 03 F4–F6, F8: missing-file record stays listed; misleading message on list-refresh failure;
    markOpened failures not logged; remove confirmation not disabled while opening.
  - Phase 02 F1: redraw storm when visible pages exceed the memory budget (matters for zoom-out, phase 10).
  - Phase 02 F2: memory checks pass even with the cap removed; no browser test for lowered resolution.
  - Phase 02 nits: perf-marks uses `performance` in src/core; page:rendered marks accumulate; stale e2e name.
  - Phase 01 B3 (failed page draw shows a white box), B4 (lint misses dynamic import and .js).
  - Header notice causes 5 px sideways scroll at 320 px.
- WebKit has limited local perf headroom (latest pass 34 ms against 40; Phase 06 had a 51 ms
  failure under load). An occasional ~2.4 s scroll freeze is pre-existing (phase-03 context file).

<!-- AUTO:BEGIN -->
Snapshot 2026-10-21 01:17 EDT
- Branch: phase-20-panels-and-sheets
- HEAD: 4d8203b tests: phase 20 Add-note test waits for the relayout after the panel closes (CI WebKit)
- Uncommitted files: 4
- Last verify: PASS at 2026-10-21 00:27 EDT (commit d966d2b)
- Recent commits:
    4d8203b tests: phase 20 Add-note test waits for the relayout after the panel closes (CI WebKit)
    88274c3 phase 20: review recheck 2 PASS (conditional on CI); user checklist; handoff
    d966d2b phase 20: focus goes into a panel even when it is empty; Tab stays in phone sheets
    089fd2f phase 20: review fixes (chapter in note rows; sheet keeps keyboard focus; contents as lists; N3-N5)
    9fd4434 phase 20: tabbed panel, search panel, docked and sheet panels, contents tree
- Changed files:
     M harness/HANDOFF.md
     M harness/build-log.md
     M harness/code_review/phase-20-review.md
     M harness/features.json
<!-- AUTO:END -->
