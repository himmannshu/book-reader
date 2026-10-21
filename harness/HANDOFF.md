# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Claude Code (Opus 5.5), local session on the user's Mac, 2026-10-21 (phase 21 finished; phases 22 and 23
  built under the standing instruction below; the roadmap in PLANS.md is fully built).
- Local baseline: verify on main (fea67a5) failed 9 WebKit tests on macOS (first WebKit run on a
  Mac). Fixed on branch `mac-webkit-baseline` (6a30927, not pushed): verify PASS there, WebKit and
  perf included. Causes: harness/context/mac-webkit-baseline-context.md. One real app change:
  `.picker` drawn with `appearance: none` (Mac Safari drew selects at 27 px). Merging it to main
  is the user's call (pushing main deploys).
- Phases 00–18 Complete. Phase 18 (design foundations) and the test-suite trim were merged into
  main by fast-forward on 2026-10-20 (CI green: runs 39477809896, 39483921300).
- 2026-10-21: the user asked to merge every phase into main. main fast-forwarded to phase 23 (19–23 and the Mac
  WebKit fix from `mac-webkit-baseline`) and was pushed, which deployed production; the push's full CI run is the
  check (build log). Phases 19 and 20 Complete (user-checked).
- Phase 21 In progress on `phase-21-highlight-colours` (stacked on `phase-20-panels-and-sheets`). Pushed 2026-10-21;
  full CI green (run 39664582126). Only the user's device check (contract item 13) is left.
- Phase 22 (library shelf) built on `phase-22-library-shelf` (from 21) and phase 23 (listen bar and voice notes) on
  `phase-23-listen-bar-voice-notes` (from 22). Both pushed 2026-10-21 for previews (no full CI); only their device
  checks are left.
- Phases 19–23 planned (PLANS.md) from the user's Claude Design system "Book Reader"
  (https://claude.ai/artifact/5EuNHSDvWfNx3LnfyLzi7Z; copy in harness/context/design-system/).
- Branch `docs-readme` holds the new README alone; merge it when the demo GIF is ready.
- Branch `phase-10-reading-comfort-k8v7pk` is merged and stale; the user deletes it on GitHub.
- Everything the user must check is in harness/USER-CHECKLIST.md.

## Standing instruction from the user (2026-10-21, after phase 21's CI run)

"Let's go ahead and build all the phases, I don't think we need to run CI checks, and the verify with every
phase since the changes are small. Unless, we are touching code that will affect performance and core logic,
we shouldn't try and run the full suite. ... you choose the best direction and good architecture choices.
Don't wait for my permission, maybe plan all the phases first or do the planning phase by phase."
- Overrides AGENTS.md's "wait for approval" and "do not start the next phase", and the per-phase full verify
  and CI run, for this run (phases 22–23). Everything else in AGENTS.md holds.
- Checks per phase: lint, format, types, unit tests and the affected e2e specs (both engines). `scripts/verify.sh`
  only when a phase touches the viewer, rendering, scrolling, the engine, src/core, storage or sync. The build log
  says which scope was used and why. Contract items for full verify / CI are recorded as deferred, not passed.
- Contracts: "Approved by: agent under the user's standing instruction of 2026-10-21"; judgment calls in each
  phase's context file. Branches stacked: `phase-22-…` from `phase-21-highlight-colours`, and so on.
- Not pushing (the instruction does not mention it, and every push deploys a preview); commit locally.
- Never: main, credentials, Cloudflare dashboard, paid services, budget changes.

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

- Nothing half done. HEAD is on `phase-23-listen-bar-voice-notes`; every branch is committed.
- Phase 21 (Highlight colours): built, reviewed twice (harness/code_review/phase-21-review.md and its recheck
  appendix), `scripts/verify.sh` PASS at 3517cbb, CI green (run 39664582126). N8 (ONE_ROW_EXTRA duplicates app.css
  sizes) left; N2 and N3 are questions in the user's checklist.
- Phase 22 (Library shelf redesign, build log 17:40): cards, chips with counts, grid/list (remembered), author from
  the PDF's metadata kept with the local cover, More menu with in-card confirmations. Unit 420, browser suite, sync
  29 all passing. Not reviewed by an evaluator; no full verify or CI (standing instruction).
- Phase 23 (Listen bar and voice notes, build log 19:05): floating listen bar with previous/next sentence and a
  speed button, voice note strip with a decoded waveform, recording strip, Record voice note in the note editor
  (gone from the selection menu). Unit 425, browser suite 376 + 2 skipped passing. Not reviewed; no full verify,
  perf or CI (standing instruction).

## Next action

1. User: device checks for phases 21, 22 and 23 (harness/USER-CHECKLIST.md, with their questions). All three are
   pushed; previews in the Cloudflare dashboard (Deployments, newest per branch).
2. The full CI run on main's push (build log) is the first full check of 22 and 23. Optionally an evaluator review
   of 22 and 23.
3. Merged into main on 2026-10-21 (fast-forward, pushed; production deployed). The phase branches can be deleted on
   GitHub when the user likes; `docs-readme` still waits for its demo GIF.
4. Watch: WebKit steady-scroll p95 swings 32–52 ms on this Mac, on phase 20 as much as 21 (budget 40); a miss means
   rerun perf alone and check no other worktree is running perf. One ~2.4 s freeze sample on every run (also on the
   baseline). WebKit whole-book search ~1400 ms on phase 20 and 21 alike (was ~900; not budgeted, worth a look).
   The library's 100-book filter on WebKit has thin headroom (up to ~90 ms against 100 on phase 21 and 22 alike).

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
- Phase 21: 'Delete' in a row's More menu removes the note; 'Remove highlight' removes the highlight (and asks
  when it has a note). The HighlightMenu stays open for a new highlight; a save finishing after Escape must not
  bring it back (useHighlights checks `shownAction` is unchanged). Specs set viewports with `test.use`, never in a
  beforeEach (that overrode the phone sizes and hid B1).
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
Snapshot 2026-10-21 18:57 EDT
- Branch: phase-23-listen-bar-voice-notes
- HEAD: de92e8a phase 23: listen bar (previous/next sentence, speed button) and voice note strip with waveform
- Uncommitted files: 1
- Last verify: PASS at 2026-10-21 15:29 EDT (commit 3517cbb)
- Recent commits:
    de92e8a phase 23: listen bar (previous/next sentence, speed button) and voice note strip with waveform
    22888be wip: phase 23: listen bar with previous/next sentence and a speed button
    b3ca96b phase 23: plan, contract and context
    debbf88 phase 22: library shelf redesign (cards, chips, grid/list, author from metadata)
    657eefd wip: phase 22: shelf model, author from metadata, BookCard, chips, view toggle
- Changed files:
     M harness/HANDOFF.md
<!-- AUTO:END -->
