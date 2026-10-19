# HANDOFF

The first thing any agent reads and the last thing it updates. Written for a fresh agent
with no memory of earlier sessions. Keep it short and current. Replace, do not append.

## Status

- Last agent: Codex, 2026-10-19
- Current session: user reports Notes/Bookmarks jumps land on the wrong page. Diagnosed generated
  cases and filed requested bookmark issue #1; no application code changed. No push/deploy authorized.
- Phase: 07 (notes) In progress. Earlier local implementation verify at 117ed45 passed
  (137 unit, 166 browser, 8 perf; WebKit p95 35 ms; unchanged budgets).
  Latest baseline at 798c536 also PASS (137/166/8, WebKit p95 32). User report now reopens contract
  8/18; F-006/F-008 failing pending reproduction. Contract 17 still needs authorized CI.
- Phase 06 Complete (all 14 items observed), F-007 passing.
  CI PASS on 7ac8b1e: https://github.com/himmannshu/book-reader/actions/runs/39320769897.
  User confirmed the real-book/device check works as expected (contract 14).
- Branch: phase-07-notes (not pushed), based on completed phase 06 at 8372a99.
  main lacks phase 06; the new branch carries that required dependency without a main-branch merge.
  main is one commit ahead of origin (a9c3832, handoff only).

## Done this session

- Verified clean baseline; investigated shared viewer/navigation paths and 12 long-book jumps.
  No reproduction yet. Created/verified requested bookmark issue #1; details in the latest build log.
- Updated feature statuses to reflect the unresolved user report, rather than treating fixture
  success as user acceptance. The implementation history below is retained for context.
- Recorded accepted choices and reasoning as D7/D8 in architecture-decisions.md: keep the established
  direction unless evidence shows a major improvement; support notes on highlights and whole pages.
- Contract approved (Amendment 01), phase/roadmap In progress. Core/schema v4 implemented with
  transactional note cascades and a populated v3 migration test (3381801).
- Notes hook/editor/panel, App navigation guard and passage jumps implemented (52a80c0).
- Comprehensive lifecycle/error/keyboard/touch checks and focus fixes (e4a8e58); floating-menu
  lower-edge overflow reproduced/fixed (117ed45). Final full verify PASS (137/166/8).
- Browser checks exposed Safari editor/confirmation Tab skips and focus lost after deletion; fixed.
  Covers iPhone/iPad taps, cross-page/foot-of-page jumps, isolation, cascades, failure/retry and drafts.
- Touch editor screenshots inspected; deterministic vector-only fixture added. Detailed contract
  evidence in build-log. CI/user report from Phase 06 is NOT counted for Phase 07.

## In flight

- No half-edited app code. User-reported jumps are unresolved despite green automated checks.
- https://github.com/himmannshu/book-reader/issues/1 is OPEN for Bookmarks. Notes has the same
  reported symptom; shared cause not established. Both engines passed page-201 jumps on a generated
  300-page book at widths 1280/810/390 (12 jumps, checked immediately and after 600ms).
- Asked for device/browser, page versus highlight note, expected-versus-actual page; no reply yet.
- No independent Phase 07 review yet. A different agent can use prompt 03 after prompt 00.

## Next action

1. Get the missing reproduction details for Notes/Bookmarks, reproduce red before proposing a
   correction, and update issue #1 with observed evidence. Do not infer a shared cause or dismiss
   the user report because fixture tests pass. No app fix implemented in this diagnostic turn.
   CI/user acceptance remain open; no push/deployment/main merge authorized.

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

- Phase 07: wrong-page Notes/Bookmarks user report unresolved (issue #1); CI outstanding. Main lacks the completed
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
- WebKit has limited local perf headroom (latest pass 35 ms against 40; Phase 06 had a 51 ms
  failure under load). An occasional ~2.4 s scroll freeze is pre-existing (phase-03 context file).

<!-- AUTO:BEGIN -->
Snapshot 2026-10-19 17:45 EDT
- Branch: phase-07-notes
- HEAD: 798c536 handoff: Codex 2026-10-19 phase 07 locally verified
- Uncommitted files: 4
- Last verify: PASS at 2026-10-19 17:43 EDT (commit 798c536)
- Recent commits:
    798c536 handoff: Codex 2026-10-19 phase 07 locally verified
    117ed45 phase 07: keep highlight note actions inside reader bounds
    e4a8e58 phase 07: cover note lifecycle failures and touch keyboard flows
    52a80c0 phase 07: add notes editor and guarded reader navigation
    3381801 wip: phase 07 note core and transactional storage; UI checks red
- Changed files:
     M harness/HANDOFF.md
     M harness/build-log.md
     M harness/build/phase-07-notes.md
     M harness/features.json
<!-- AUTO:END -->
