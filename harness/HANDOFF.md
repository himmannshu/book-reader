# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Codex, 2026-10-19
- Phase: 06 (highlights) Complete. All 14 contract items have observed evidence in the build log.
  Local `scripts/verify.sh` PASS (122 unit, 130 e2e, 8 perf; WebKit p95 37 ms); F-007 passing.
  CI PASS on 7ac8b1e: https://github.com/himmannshu/book-reader/actions/runs/39320769897.
  User confirmed the real-book/device check works as expected (contract 14).
- Branch: phase-06-highlights, tracking origin/phase-06-highlights; verified source pushed at 7ac8b1e.
  main is one commit ahead of origin (a9c3832, handoff only).

## Done this session

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

- Nothing half done. B1 fixed in 4341f7c, B2 in 1c5834c, B3 in 57fa6ad; fixture metadata in 7ac8b1e.

## Next action

1. Await the user's merge instruction. CI/push was authorized; merging was not. Do not start phase 07.
   A fresh agent should follow harness/prompts/00-orient.md.

## Decisions worth remembering

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
Snapshot 2026-10-19 16:48 EDT
- Branch: phase-06-highlights
- HEAD: 7ac8b1e phase 06: measure fixture widths without kerning
- Uncommitted files: 6
- Last verify: PASS at 2026-10-19 16:32 EDT (commit 9463bfc)
- Recent commits:
    7ac8b1e phase 06: measure fixture widths without kerning
    9463bfc phase 06: record user device check and pre-CI verification
    ad3ec91 handoff: Codex 2026-10-19 phase 06 blockers corrected
    57fa6ad phase 06: dismiss stale highlight offers when text is released
    1c5834c phase 06: prevent duplicate pending highlight saves
- Changed files:
     M PLANS.md
     M harness/HANDOFF.md
     M harness/build-log.md
     M harness/build/phase-06-highlights.md
     M harness/code_review/phase-06-review.md
     M harness/features.json
<!-- AUTO:END -->
