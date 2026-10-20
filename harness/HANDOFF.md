# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Claude Code (Opus 5.5), 2026-10-20, moving this session to a cloud session.
- Phases 00–09b Complete (08 with the iPhone-offline exception). origin/main = cb6ec8a, deployed
  to production (verify PASS; CI run 39369974201 green). The two later docs-only commits on local
  main (42508fe, 1b47217) were not pushed (pushing main deploys production); they reach the cloud
  through branch phase-10-reading-comfort, cut from them.
- Roadmap (PLANS.md): 10 Reading comfort, 11 Library view, 12 Export, 13 Search, 14 UI and UX
  design pass (added 2026-10-20), 15 Voice notes, 16 Listen to a book, 17 Share excerpts.

## Standing instructions from the user (2026-10-20; they apply until the user says otherwise)

The user is away and asked the agent to keep building the roadmap, phase after phase, using the
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

## Waiting on the user

- Nothing yet.

## In flight

- Moving to the cloud from branch phase-10-reading-comfort. Next: phase 10 plan, contract, build.

## Next action

1. Session start (AGENTS.md), including a verify baseline in the cloud environment.
2. Phase 10 on branch phase-10-reading-comfort (already created from local main at 1b47217).

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
Snapshot 2026-10-20 01:07 EDT
- Branch: phase-10-reading-comfort
- HEAD: 1b47217 planning: UI/UX design pass as phase 14; standing instructions for autonomous work
- Uncommitted files: 1
- Last verify: PASS at 2026-10-20 00:30 EDT (commit cb6ec8a)
- Recent commits:
    1b47217 planning: UI/UX design pass as phase 14; standing instructions for autonomous work
    42508fe phase 09b: merged main verified and deployed; handoff
    cb6ec8a phase 09b: merged into main; build-log times corrected to commit times
    d97c64c Merge ci-trim: quick checks on branches, full suite on main and before merging
    5117709 Merge phase 09b: sync book files
- Changed files:
     M harness/HANDOFF.md
<!-- AUTO:END -->
