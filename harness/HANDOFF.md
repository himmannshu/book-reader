# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Claude Code (Opus 5.5), 2026-10-19
- Phase: 04 In progress. Items 1–9 pass (evaluator re-review); item 11 user-checked ("Contents look
  good."). Only item 10 is open: CI run 39279260419 on aaafd9f was still queued at hand-off.
- Branch: phase-04-table-of-contents (pushed at aaafd9f; later commits are harness docs only, not pushed)

## Done

- Phases 00–03 complete and on main (plus the first-page fix).
- Phase 04: Contents panel; review findings fixed (fresh reader per book, Escape from anywhere,
  focus pages after a jump, tests for lazy loading and the unreadable-outline state).
- Evaluator reviews: phase 01 PASS, 02 PASS, 03 PASS, 04 re-review FAIL only on items 10/11 (11 now
  done). Phase 00 skipped by the user's choice. Reviews in harness/code_review/.
- D5b recorded (ArrayBuffers supersede D5a's Blobs) with a phase 03 contract amendment.

## In flight

- CI run 39279260419 (phase-04-table-of-contents @ aaafd9f), still queued on GitHub at 11:54 EDT
  (created 11:36). If it stays queued, ask the user before cancelling or re-running it.
- Local baseline, 11:54 EDT: one verify run failed on WebKit perf p95 (50 ms vs 40); a re-run of
  `npm run test:perf` alone passed (33 ms). Logged as a one-off; see build log.

## Next action

1. Run `/start-session`. Check the run: `gh run view 39279260419 --json status,conclusion,url`.
   If it is green, record it in the build log, set phase 04 Complete (build file, PLANS.md,
   build-log summary row), and refresh this handoff. If it failed, read the log first.
2. Ask the user before merging phase 04 into main (and before pushing again).
3. Ask the user which non-blocking review findings to fix (listed below), then plan phase 05 (bookmarks).

## Decisions worth remembering

- Engine API and memory bounds: harness/context/phase-01-open-and-read-pdf-context.md.
- Layout uses page 1's size as an estimate, then corrects after loadPageSizes() (anchor kept).
- pdfjs-dist 6.4 → minimum Safari/iOS 17.4.
- TypeScript pinned to 6.0.x until typescript-eslint supports 7 (phase-00 context file).

## Blockers and doubts

- Open, non-blocking review findings (user to decide):
  - Phase 03 F1 (medium, iPhone): book title shrinks to 0 px while confirming removal at 390 px.
  - Phase 03 F2/F3: wrong "unavailable" wording at startup; save-failure alert survives Library.
  - Phase 03 F4–F6, F8: missing-file record stays listed; misleading message on list-refresh failure;
    markOpened failures not logged; remove confirmation not disabled while opening.
  - Phase 02 F1: redraw storm when visible pages exceed the memory budget (matters for zoom-out, phase 10).
  - Phase 02 F2: memory checks pass even with the cap removed; no browser test for lowered resolution.
  - Phase 02 nits: perf-marks uses `performance` in src/core; page:rendered marks accumulate; stale e2e name.
  - Phase 01 B3 (failed page draw shows a white box), B4 (lint misses dynamic import and .js).
  - Header notice causes 5 px sideways scroll at 320 px.
- WebKit p95 frame time ~28–37 ms on the M2 (budget 40); an occasional ~2.4 s WebKit scroll freeze
  is pre-existing and uninvestigated (phase-03 context file).

<!-- AUTO:BEGIN -->
Snapshot 2026-10-19 11:54 EDT
- Branch: phase-04-table-of-contents
- HEAD: d1e7a16 phase 04: refresh handoff snapshot
- Uncommitted files: 2
- Last verify: FAIL at 2026-10-19 11:51 EDT (commit d1e7a16)
- Recent commits:
    d1e7a16 phase 04: refresh handoff snapshot
    ab41928 phase 04: item 11 user-checked; CI queued; handoff for next session
    aaafd9f after reviews: refresh handoff snapshot
    719a4b3 after reviews: handoff lists open findings and next steps
    ca1d8ba phase 03: evaluator review (PASS); D5b and contract amendment for ArrayBuffer storage
- Changed files:
     M harness/HANDOFF.md
     M harness/build-log.md
<!-- AUTO:END -->
