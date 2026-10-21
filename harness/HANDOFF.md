# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Claude Code (Opus 5.5), local session on the user's Mac, 2026-10-21 (resumed 14:00; recheck done, N6/N7 fixed, verify PASS at 3517cbb).
- Local baseline: verify on main (fea67a5) failed 9 WebKit tests on macOS (first WebKit run on a
  Mac). Fixed on branch `mac-webkit-baseline` (6a30927, not pushed): verify PASS there, WebKit and
  perf included. Causes: harness/context/mac-webkit-baseline-context.md. One real app change:
  `.picker` drawn with `appearance: none` (Mac Safari drew selects at 27 px). Merging it to main
  is the user's call (pushing main deploys).
- Phases 00–18 Complete. Phase 18 (design foundations) and the test-suite trim were merged into
  main by fast-forward on 2026-10-20 (CI green: runs 39477809896, 39483921300).
- Phases 19 and 20 Complete (user-checked, CI green) on stacked branches, not merged into main.
- Phase 21 In progress on `phase-21-highlight-colours` (stacked on `phase-20-panels-and-sheets`). Pushed 2026-10-21;
  full CI green (run 39664582126). Only the user's device check (contract item 13) is left.
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

- Phase 21 (Highlight colours), plan approved 2026-10-21 (every highlight in the Notes tab; Voice note kept in the
  menu until phase 23). Everything in the contract is built; nothing is half done in the code. HEAD c7e1c64.
  - Done this session (evidence in harness/build-log.md, the two 2026-10-21 Phase 21 entries):
    - Notes rows for every highlight (`annotationRows`, src/core/notes.ts) with a row More menu
      (src/ui/RowMenu.tsx, also on bookmark rows); Notes count includes highlights (46d23fe).
    - Earlier specs updated for the Yellow swatch and the More menus, each change listed (b936df2).
    - Two-device recolour test, e2e/sync/sync.spec.ts (53ed3aa).
    - Evaluator review (harness/code_review/phase-21-review.md) FAIL at fab20ab: B1 menu too wide on phones,
      B2 Listen from here across a page break, B3 voice rows broken, B4 no Share on page notes. All fixed in
      814f19d with tests seen red first; also N1 (docked panel), N4 (colour pressed mid-save), N5 (stale width).
    - `scripts/verify.sh` PASS at 814f19d (unit 404, browser 352 + 2 skipped, sync 29, perf 10). Only harness
      docs changed since.
    - 14:00 session: verify at de3e7c0 failed only WebKit steady-scroll p95 (52, then 41 ms alone). Four alternating
      perf runs against phase 20 all passed with the same spread (p20 32/38 ms, p21 38/32 ms): noise, not phase 21
      (build log 14:00 entry).
  - Evaluator recheck at 8113d9a (review file appendix): items 1–11 PASS, B1–B4/N1/N4/N5 fixed. Open: item 12 (no
    green verify at HEAD yet: timing checks fail under load, pass alone; CI not run) and item 13 (device check).
    New non-blocking N6 (Add note during a colour's save) and N7 (menu over a highlight left off screen after a
    resize; it now closes, as on scroll) fixed in 3517cbb with tests seen red. N8 (ONE_ROW_EXTRA duplicates
    app.css sizes) left. `scripts/verify.sh` PASS at 3517cbb (run 2; run 1 hit the known WebKit load stall).
  - Left as they are (for the user's device check): N2 bookmark rows' More menu holds only Remove bookmark;
    N3 Add note on a fresh selection then Cancel keeps the yellow highlight (recorded judgment call).

## Next action

1. Phase 21: done locally (verify PASS at 3517cbb). No evaluator pass over the N6/N7 fixes (small; the user's call).
2. Pushed and CI green (run 39664582126, build log 16:06). Next: the user's device check, listed under Phase 21
   in harness/USER-CHECKLIST.md (with three questions: N3 Cancel, N2 bookmark More menu, N7 rotation).
3. User: merge into main when ready (pushing main deploys production; main lacks phases 19–21 and the Mac WebKit fix).
4. Watch: WebKit steady-scroll p95 swings 32–52 ms on this Mac, on phase 20 as much as 21 (budget 40); a miss means
   rerun perf alone and check no other worktree is running perf. One ~2.4 s freeze sample on every run (also on the
   baseline). WebKit whole-book search ~1400 ms on phase 20 and 21 alike (was ~900; not budgeted, worth a look).

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
Snapshot 2026-10-21 18:14 EDT
- Branch: phase-21-highlight-colours
- HEAD: 5e9c064 phase 21: full CI green recorded (run 39664582126)
- Uncommitted files: 2
- Last verify: PASS at 2026-10-21 15:29 EDT (commit 3517cbb)
- Recent commits:
    5e9c064 phase 21: full CI green recorded (run 39664582126)
    5749740 phase 21: N6, N7 fixes recorded; verify PASS
    3517cbb phase 21: recheck fixes (N6 Add note during a colour's save keeps it; N7 menu over a highlight closes on resize)
    bf4db8e phase 21: evaluator recheck recorded (items 1-11 pass; N6-N8 new, non-blocking)
    8113d9a phase 21: perf comparison with phase 20 recorded (WebKit p95 miss was noise)
- Changed files:
     M harness/HANDOFF.md
     M harness/USER-CHECKLIST.md
<!-- AUTO:END -->
