# Phase 14 review: UI and UX design pass

- Reviewer: Claude Code (Opus 5.5, evaluator subagent, fresh context), 2026-10-20
- Branch: phase-14-ui-ux-design at a6cbbff. Reviewed in the top worktree
  /home/user/book-reader-p17 (phase-17-share-excerpts at 8d7718b, which contains this branch).
  Before/after comparisons used /home/user/book-reader-p13 (8f46ca4) and /home/user/book-reader-p14.
- Inputs: harness/contracts/phase-14-contract.md (with Amendment 01), harness/build/phase-14-ui-ux-design.md,
  harness/context/phase-14-ui-ux-design-context.md, harness/EVALUATOR.md, `git diff 8f46ca4 a6cbbff`.

## Verdict: FAIL

The redesign works. There is one bar, icons, 44 px targets on touch, the Display menu, Safari pinch,
the horizontal place, the page error message and the phone search bar, and the scroll path costs
nothing measurable. It fails on three things:

1. Text contrast (item 4) is not met everywhere. The matched word in each search result is 2.91:1
   in Dark, which is far under 4.5:1.
2. At desktop widths under 1400 px the bar is ten unlabeled icons with no tooltip. The context file
   and USER-CHECKLIST both tell the user to "hover for names".
3. No green full CI run covers this branch. The only full run that includes it (39392502232, on
   phase 17) is red, and CI perf never ran, so item 10 has no WebKit evidence.

## Environment (cloud container)

- Node 24 via `source /opt/nvm/nvm.sh && nvm use 24`. Each worktree has its own node_modules.
- Playwright: `PLAYWRIGHT_BROWSERS_PATH=$HOME/pw-browsers`, Chromium only. WebKit evidence can
  only come from full CI.
- `scripts/verify.sh` runs WebKit, so I ran its steps one by one, Chromium only, in the p17 tree:
  - lint, format:check and typecheck: OK
  - unit: 354/354
  - `playwright test --project=chromium`: 138 passed, plus 1 environment failure ("Chromium
    reports the app as installable")
  - sync (`--project=sync-chromium`): 15/15
- Perf here is noisy and slower than the Mac budgets. I alternated p13 → p14 → p17 three times on an
  idle machine and changed no budgets.
- Probes were Node scripts in the session scratchpad, driving Playwright's Chromium against
  `vite preview` on port 4173. They used the repo fixtures (text-4-pages, outline-12-pages,
  long-300-pages, no-text-1-page).
- Full CI: run 39392502232 (https://github.com/himmannshu/book-reader/actions/runs/39392502232) on
  phase-17-share-excerpts at 8d7718b. GitHub shows it started at 08:18:55Z. Result: **failure**,
  274 passed, 3 skipped, 1 failed. The failure is `[webkit] e2e/listen.spec.ts:96`, phase 16's test.
  verify.local.sh stops at the first failure, so sync and perf never ran in CI. The phase 14 run
  39387038910 was cancelled.

## Contract items

| # | Result | Evidence |
|---|---|---|
| 1 | PASS | e2e design "one bar" passes. At 1280 × 800 the reader top is ≤ 64 px. At 320 and 390 px it is ≤ 112 px. The screenshots show two compact rows on phones. |
| 2 | PASS (scope note) | e2e at iPhone 13 and iPad gen 7 emulation passes. My probe measured every reader-bar and player-bar control at 320 px at 44 × 44. Highlight actions are 44 px tall on touch. The test excludes `.selection-actions`. |
| 3 | PASS | e2e at 320 and 390 px. Probes of the library, the reader, each panel, the Display menu, the confirm-removal row and highlight actions at 320/390 all found 0 px horizontal overflow. |
| 4 | **FAIL** | The e2e only compares CSS token pairs. I scanned the computed colours of every visible text element against its composited background, in all three themes, for the library, reader, Contents, Bookmarks, Notes and Search. Every element passed except the matched word in each search result (`.search-result mark`: `--muted` text on `rgb(255 140 0 / 35%)`). That word measures **2.91:1 in Dark, 4.11:1 in Light and 4.26:1 in Sepia**. Rule: src/ui/app.css:796. |
| 5 | PASS (see B2) | The icons are there. ARIA snapshots at 1280 and 390 px keep every earlier name (Library, Contents, Bookmarks, Bookmark page, Notes, Search, Zoom out, Zoom, Zoom in, Theme, Open PDF), and the full chromium suite passes. At 390 px, Theme and Zoom move into "Display". But no button has a `title`, and labels show only at ≥ 1400 px. So at 1280 px the desktop bar is icon-only too, with no hover names. |
| 6 | PASS | Amendment 01: Safari gesture events only. Synthetic gesturestart/change/end on the long book, top of the window at page 41 (fraction 0.090): scale 1.6 gives Fit width → 175% at page 41 (fraction 0.088); scale 0.5 gives 90% (fraction 0.090); 1.02 is ignored; 100 clamps to 400%; 0.001 clamps to 25%. All three events are defaultPrevented on the pages. ctrl+wheel is not prevented (e2e). |
| 7 | PASS | Unit test viewer.test "says on the page when it could not be drawn" (the message shows on failure and goes after a redraw). |
| 8 | PASS | Title > 40 px while confirming removal at 390 (e2e). With storage off, tapping the aria-disabled Bookmark page button showed the alert "Bookmarks need this book saved on this device." at 390 px. Horizontal place restored (e2e). Phone search bar: e2e, then my 390 px check (1 of 8 → 2 of 8 → closed, marks cleared). |
| 9 | PASS | The test changes between 8f46ca4 and a6cbbff are comfort.spec (Display click) and ReaderView.test (aria-disabled). Both are recorded in the build log (08:10 entry). The chromium suite is green apart from the environment test. |
| 10 | PASS locally, no WebKit evidence | Chromium, alternating runs, firstPageMs p13 414/433/418 against p14 451/411/434 (p17 439/417/401). jumpMs 48/43/45 against 42/41/44. p95FrameMs 33.3 for all nine runs. maxCanvasMB 67.1 and blankFramePct 0 for all. That is noise. The per-state `querySelector` added in `#setState` (src/viewer/viewer.ts) shows no cost. WebKit perf never ran in CI. |
| 11 | **FAIL** | The Chromium stand-in is green (above). There is no green full CI run on this branch: 39387038910 was cancelled, and the stacked run 39392502232 is red. |
| 12 | PENDING (user) | Look, trackpad pinch and finger pinch on the devices. |

## Rubric

| Criterion | Score | Threshold | Notes |
|---|---|---|---|
| Contract fidelity | 3 | 5 | Item 4 fails on real rendering. Item 11 is not met. Item 12 is pending. |
| Functionality | 4 | 4 | Everything works end to end. The Display menu is sticky (N1). |
| Robustness | 3 | 4 | Hover names are documented to the user (context file, USER-CHECKLIST) but do not exist (B2). |
| Code quality | 4 | 3 | Small, readable shared controls (controls.tsx, icons.tsx). The portal is clean: 1 toolbar after 6 book switches. |
| Test quality | 3 | 3 | Good red-first design tests. But the contrast test checks tokens, not rendered text, and missed B1. The pinch test does not check the reading place. |
| Design | 3 | 3 | Calm, consistent bar and tokens in all three themes. Weak points: unlabeled desktop icons, the ragged stack of highlight actions, and the toast covering bottom bars (N2–N5). |

## Blockers

- **B1 (item 4) Search-result match text fails contrast.** Steps: Dark theme → Search → "page". The
  `<mark>` in each result is `rgb(162 158 149)` on orange 35% over `--surface`, which is 2.91:1. Light
  is 4.11:1 and Sepia 4.26:1. Fix it in src/ui/app.css:796 (for example `color: var(--text)`, or a
  stronger mark per theme), and make the e2e scan rendered elements, not only tokens.
- **B2 Desktop icons have no names on hover.** `ToolButton` (src/ui/controls.tsx:61) sets no `title`,
  and `.tool-label` is visible only at ≥ 1400 px (app.css:889). The context file says "is a tooltip
  (title) otherwise", and USER-CHECKLIST says "hover for names". Steps: 1280 × 800, open a book,
  hover any icon: nothing shows. All 11 header controls had `title=null`. A mouse user on a typical
  MacBook window sees ten unlabeled glyphs.
- **B3 (items 10–11) No green full CI covering this branch**, and no WebKit perf. Run 39392502232
  failed on phase 16's WebKit listen test, so sync and perf did not run. Fix that test, then run a
  full CI that reaches perf.

## Non-blocking findings

- N1 The Display menu does not close when you tap the pages, choose a theme or zoom, or open a
  panel. Steps: 390 px → Display → Notes: both stay open and overlap. If you resize to ≥ 700 px
  while it is open and come back, it reopens. Only Escape closes it (ReaderView `displayOpen`).
- N2 The "Saved on this device." toast sits at the same bottom spot as the phone search bar and
  phase 16's player bar. For 4 s after opening a book it covers them (shots listen-320,
  listen-1280).
- N3 In the reader bar, Open PDF uses an arrow-out-of-tray glyph, which is the iOS Share symbol.
  Phase 17 adds a real Share action, so the two will be confused.
- N4 Highlight actions are still a ragged vertical stack of separate buttons with different widths
  (app.css:444). With phases 15 and 17 there are four, and at 320 px they cover about half the page.
  The design pass did not touch the most-used floating control.
- N5 In the Display popover the Theme select has no visible caption, but Zoom has one.
- N6 Gesture events are prevented only on the pages. A pinch on the header could still zoom the
  whole app on iOS (device check).
- N7 After going back to the Library, focus falls to `<body>`. This is older behaviour, but the
  Library button now lives in the shared header.
- Process: features.json F-017 is correctly still failing.

## Notes for the author

Screenshots for all four widths × three themes (empty library, reader, after the toast, Contents,
Notes, Search, Display, library) were taken and checked. The look is coherent: one quiet bar, the
same radii and spacing, a readable dark theme, no clutter in the library. Fix B1 and B2, and it
reaches the design bar comfortably.

## Appendix (author, 2026-10-20 09:40 UTC): findings addressed

- Contrast of matched words in search results: a solid `--mark-bg` per theme with body text on it; the contrast
  test now checks `--text` on `--mark-bg` (≥ 4.5) in all three themes.
- Hover names: every toolbar button (and Open PDF) has its label as a tooltip; the design test checks that no
  header control lacks one.
- The Display menu also closes on a tap or click outside it (design test).
- CI: covered by the next full run on phase 17 (contains this branch); see build log.
