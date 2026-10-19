# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Codex, 2026-10-19
- Current session: Phase 07 implementation, following prompt 02. User approved the plan, contract
  and all interaction defaults. Implementation/normal local commits are authorized; no push/deploy.
- Phase: 06 (highlights) Complete. All 14 contract items have observed evidence in the build log.
  Local `scripts/verify.sh` PASS (122 unit, 130 e2e, 8 perf; WebKit p95 37 ms); F-007 passing.
  CI PASS on 7ac8b1e: https://github.com/himmannshu/book-reader/actions/runs/39320769897.
  User confirmed the real-book/device check works as expected (contract 14).
- Branch: phase-07-notes (not pushed), based on completed phase 06 at 8372a99.
  main lacks phase 06; the new branch carries that required dependency without a main-branch merge.
  main is one commit ahead of origin (a9c3832, handoff only).

## Done this session

- Recorded accepted choices and reasoning as D7/D8 in architecture-decisions.md: keep the established
  direction unless evidence shows a major improvement; support notes on highlights and whole pages.
- Preflight `scripts/verify.sh` at 8372a99 PASS (122 unit, 130 browser, 8 perf).
- Contract approved (Amendment 01), phase/roadmap In progress. Core/schema v4 implemented with
  transactional note cascades and a populated v3 migration test (3381801).
- Notes hook/editor/panel, App navigation guard and passage jumps implemented. All 135 unit tests,
  typecheck and initial 4 notes browser checks pass. Broader contract coverage/full verify pending.
- User confirmed the real-book/device check (9463bfc) and authorized pushing/running CI.
- First CI run failed one Chromium width check: fixture metadata used kerned widths for plain Tj
  text. Fixed the generator and regenerated ten manifest widths (7ac8b1e); PDF bytes unchanged.
  Assertion tolerance, runtime code and speed budgets unchanged. Red check → green.
- Local verify of that correction initially hit WebKit p95 51 ms, then full rerun PASS at 37 ms;
  both outcomes and host load are recorded. CI run 39320769897 PASS: 122 unit, 130 browser, 8 perf.
  Linux WebKit perf remains report-only under the existing policy; local budgets are enforced for both.
- Marked phase 06 Complete in the phase file and roadmap; updated F-007 evidence and review appendix.
  Historical evaluator FAIL is preserved; no new independent evaluator verdict. No merge or deployment.

## In flight

- Phase 07 implementation is not fully verified yet. Approved defaults:
  one editable note per highlight/page, explicit Save/Cancel in Notes, guarded draft navigation, and
  confirmation before removing a highlight together with its note. Baseline verify PASS (122/130/8).

## Next action

1. Expand notes contract checks (deletion, dirty navigation, failures, keyboard/touch, passage jumps),
   fix observed failures, then run full scripts/verify.sh. Keep D7–D9. No push/deploy/main merge.

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

- Phase 07: implementation in progress; CI/user check outstanding. Main lacks the completed
  Phase 06 dependency; the Phase 07 branch deliberately starts at 8372a99 instead of main.
- Phase 06:
  - No blocking contract items remain. B1–B3 corrected, user check confirmed, CI green.
  - N1 Highlight before highlights load silently does nothing; N2 WebKit has thin performance headroom
    (budget 40 ms) and the benchmark never measures text layers; N3 unsaved note touches the edge at 320 px.
    N4 duplicate import cleaned up with B2.
- Open, non-blocking review findings (user to decide):
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
- WebKit has thin local perf headroom (latest pass 37 ms against 40; one 51 ms failure under load
  this session). An occasional ~2.4 s WebKit scroll freeze is pre-existing (phase-03 context file).

<!-- AUTO:BEGIN -->
Snapshot 2026-10-19 17:17 EDT
- Branch: phase-07-notes
- HEAD: 3381801 wip: phase 07 note core and transactional storage; UI checks red
- Uncommitted files: 16
- Last verify: PASS at 2026-10-19 17:06 EDT (commit 8372a99)
- Recent commits:
    3381801 wip: phase 07 note core and transactional storage; UI checks red
    b1ceea0 phase 07: record approved notes contract and implementation context
    8372a99 handoff: Codex 2026-10-19 phase 06 complete [skip ci]
    7ac8b1e phase 06: measure fixture widths without kerning
    9463bfc phase 06: record user device check and pre-CI verification
- Changed files:
     M e2e/notes.spec.ts
     M harness/HANDOFF.md
     M harness/build-log.md
     M src/ui/App.tsx
     M src/ui/ReaderView.test.tsx
     M src/ui/ReaderView.tsx
     M src/ui/SelectionActions.tsx
     M src/ui/annotation-messages.ts
     M src/ui/app.css
     M src/ui/useHighlights.ts
     M src/viewer/viewer.test.ts
     M src/viewer/viewer.ts
    ?? src/ui/ConfirmDialog.tsx
    ?? src/ui/NotesPanel.tsx
    ?? src/ui/useNotes.test.tsx
<!-- AUTO:END -->
