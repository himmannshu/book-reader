# Phase 18 review: Design foundations

- Reviewer: Claude Code (Opus 5.5, evaluator subagent, fresh context), 2026-10-20
- Branch: phase-18-design-foundations. I reviewed the code at ed30213. While I worked, HEAD moved to
  b0a487a, but only in docs (`harness/HANDOFF.md`, `harness/USER-CHECKLIST.md`; `git diff --stat ed30213 b0a487a`).
  No code changed. The phase diff is `git diff origin/main...HEAD`.
- Inputs: harness/contracts/phase-18-contract.md, harness/build/phase-18-design-foundations.md,
  harness/context/phase-18-design-foundations-context.md, harness/context/design-system/ (README.md,
  tokens.json, components/*.md, components/src/), harness/EVALUATOR.md.

## Verdict: PASS (conditional on the full CI run)

Every contract item I can check here passes, and I found no blockers. Two parts can only be checked
in GitHub CI: item 12's enforced budgets (and WebKit perf), and item 13's full CI run. Both are
**PENDING**. If that run is red, this verdict becomes FAIL, the same way it did in phase 17.

## Environment

- Node 24.22, cloud container, Chromium 153 standing in. Only Chromium was run (no WebKit here).
- Stand-in verify, run myself:
  - lint, format:check, typecheck: OK
  - unit: 377/377
  - e2e `--project=chromium`: 151 passed, 1 failed. The failure is `pwa.spec.ts:53` "installable",
    the known environment failure.
  - `test:sync --project=sync-chromium`: 15/15
- Look and layout: a production build (`dist/`) served with `npx vite preview --port 4199`.
  Playwright probe scripts in my scratch directory took screenshots in Light, Sepia and Dark at
  1280×800 and on iPhone 13 emulation (library, empty library, reader, Contents and Notes panels,
  the "Saved" toast, the error toast, the search bar, highlight actions), plus iPad gen 7 landscape
  and 320/390 px touch viewports.
- Perf: Chromium only. Five runs of each build, alternating this branch and origin/main (14de167),
  with main built in a scratch worktree. Nothing else was running.
- Mutation checks were done in a scratch worktree of HEAD, then the worktree was removed. No repo
  file was edited except this review.

## Contract items

| # | Result | Evidence |
|---|---|---|
| 1 | PASS | All of these are present in harness/context/design-system/: README.md, tokens.json, icons.md, 23 `components/*.md`, `components/src/{bundle.css,icons.ts,index.tsx,index.d.ts}`. public/fonts/ has 4 woff2 files (each starts with the `wOF2` magic bytes) plus `Literata-OFL.txt` and `SourceSans3-OFL.txt` (SIL OFL 1.1). The context file lists them. The design's per-icon SVG files were not copied, but `icons.ts` holds the same paths, which is enough. |
| 2 | PASS | tests/config/design-tokens.test.ts passes (part of the 377). I re-ran `npm run tokens` in a clean worktree and got no diff, so tokens.css matches tokens.json and the generator is deterministic. grep finds no colour literals in src/ui/*.tsx or app.css. The only literals left are the status-bar strings in theme.ts (tested against `surface`) and PDF.js's own text-layer.css, which app.css:1366 overrides for selection. The two app-only tokens (`--page-paper`, `--page-ink-muted`) are written by the generator and documented. |
| 3 | PASS | `design.spec.ts` "text contrast meets WCAG AA" passes in all 3 themes. It covers every pair the contract lists, plus ink on hl-yellow composited over surface-raised. I computed more pairs from tokens.json, all ≥ 4.5 in every theme: accent/accent-soft (pressed tools) 6.22–7.09, ink-muted/canvas (cover placeholder) 4.97–7.71, on-danger/danger (Delete everywhere) 6.77–7.83, on-accent/accent-hover 9.9–12.0. |
| 4 | PASS | The design-system.spec fonts tests pass. My probe: Literata on book-info, library titles, panel h2 and the EmptyState heading; Source Sans 3 on buttons and labels. All four woff2 files are in `dist/sw.js`'s precache. The offline test reloads with the network off and `document.fonts.check` is true for both. Every field in the library, reader, Search panel and Display popover is 16 px. |
| 5 | PASS | All 47 icon names and SVG bodies in src/ui/icons.tsx are byte-identical to the design's icons.ts (a script compared them: 0 diffs). Stroke is 1.75 (unit test). ToolButton and IconButton set `title` and the accessible name, and Toast's Dismiss is an IconButton. The existing design.spec name and tooltip tests pass. |
| 6 | PASS | The e2e keyboard test passes (25 tabs in the reader with Notes open). My probe tabbed through the library (theme select, Open PDF input, filter, sort, book, Remove) and an error toast's Dismiss: every one had `solid 2px` and `offset 2px` in `focus-ring`. Mutation: setting the ring to 1 px fails the test. The reader scroller keeps its quieter accent-soft ring on purpose (it is not a button or field). |
| 7 | PASS | The reduced-motion e2e test passes. Probe: with `reducedMotion: 'reduce'`, the "Saved" toast still leaves after 4 s (only the duration goes to 0, the delay stays). The recording dot stops pulsing (iteration count 1). No JS smooth scrolling (grep). |
| 8 | PASS | controls.test.tsx 8/8. Button, IconButton, ProgressBar, Toast and EmptyState replace `.button`, `.notice`, `.error`, the hand-made progress bar and the empty `panel-note`s. The only `.error` left is inline in the Notes and Voice notes panels, as decided. iPhone 13 probe found no visible button, field, select or label under 44×44 anywhere: empty library, library, remove confirm, reader, Contents, Bookmarks, Notes, Search, Display, player, and error toast with Dismiss. The iPad (coarse pointer) reader was the same. |
| 9 | PASS | Probe with the real "Saved on this device." toast while reading aloud: toast bottom 704 vs player top 734 (desktop), 568 vs 594 (iPhone). The real error toast while listening: 652–704 vs player 734–784. The phone search bar case also works (screenshot). The failure stays after 4.5 s and goes on Dismiss; messages leave in about 4 s. Mutations: removing the `:has()` lift fails the player test, and letting danger toasts fade too fails "a failure stays". |
| 10 | PASS | e2e "on the page" tests pass: selection = `--selection`, highlight = `hl-yellow`, current match outlined in accent, Dark `invert(0.9) hue-rotate(180deg)`. comfort.spec checks the Sepia pixel to within ±4 of the design tint composite. Screenshots look right in all three themes (in Dark the highlight shows as a warm tint, through the page filter). See N2 for the search marks. |
| 11 | PASS | Only design.spec.ts and comfort.spec.ts changed among the old tests, and both changes are recorded in the build log. The contrast test now checks more pairs. The Sepia check went from "r−b>30" to an exact composite ±4 plus r>b, which is stricter. Dark theme-color changed to the design's value. Nothing was loosened. |
| 12 | PASS locally / budgets PENDING (CI) | Chromium, five alternating runs each. firstPageMs: p18 411/384/396/363/352 (median 384) vs main 365/358/376/377/348 (median 365). jumpMs: p18 median 40 vs main 37. p95 16.8/33.3 bimodal on both. blank 0, maxCanvasMB 67.1 on both. Combined with the author's 6 rounds (380.5 vs 377), I see no clear regression; the +19 ms median gap is within this machine's noise (N8). Both builds fail the 250 ms Mac budget here, which is the known environment issue. The enforced budgets and WebKit come from CI. |
| 13 | Local PASS / CI PENDING | The stand-in suite above is green, sync included. There is no full CI run on this branch yet. |
| 14 | PENDING (user) | Device check on Mac, iPad and iPhone. |

Layout limits from the brief:
- Toolbar at 1280×800: 57 px in the reader and the library (limit 64).
- Toolbar at 390 and 320 px: reader 101 px (limit 112), library 53 px.
- No sideways scroll at 390 px.
- At 320 px, nothing scrolls sideways in the library or reader, but with the read-aloud bar open
  the page is 331 px wide (N5). main is 339 px wide in the same case, so this is older and not a
  regression.

## Rubric

| Criterion | Score | Threshold | Notes |
|---|---|---|---|
| Contract fidelity | 5 | 5 | Items 1–11 pass when exercised. 12 and 13 wait on CI, which is the condition on the verdict. 14 is the user's check. |
| Functionality | 4 | 4 | Real flows work in all themes and sizes. Toasts behave correctly around the player and the search bar. |
| Robustness | 4 | 4 | Failures stay until dismissed and are still announced as alerts. Fonts fall back while loading and work offline. |
| Code quality | 4 | 3 | One generator is the single source for the tokens, with a drift test. The controls are small and typed. Some leftovers (N6). |
| Test quality | 4 | 3 | All three mutations I tried were caught (focus width, the toast lift, danger auto-hide). The player-toast test uses a hand-made element (N3). |
| Product depth | 3 | 3 | A foundation phase: the whole app moves onto the design system with no features lost. |
| Design | 4 | 3 | Coherent and calm, clearly the design's palette and type, not library defaults. A few in-scope details differ (N1, N2, N7). |

## Blockers

- None from my checks. The full CI run (items 12 and 13) must be green before merge.

## Non-blocking findings

- **N1 Placeholder text uses the browser's default grey, not a token.** The library "Filter" field
  (Library.tsx:88) and "Search in book" (SearchPanel.tsx:90) have no `::placeholder` rule, so
  Chromium draws #757575. On `surface-sunken` that gives 3.88:1 (Light), 3.45:1 (Sepia) and 4.09:1
  (Dark), all under 4.5. This goes against the design's "do not add a lighter grey for text".
  Reproduce: in the library, `getComputedStyle(input, '::placeholder').color` returns
  `rgb(117, 117, 117)` in every theme. Fix: `::placeholder { color: var(--ink-muted) }`.
- **N2 Search marks are painted over the text, not under it.** `.search-hit` (app.css:648–652) has no
  `mix-blend-mode: multiply`, unlike `.highlight-box`. The translucent hl-yellow therefore tints the
  glyphs (the "page" match on iPhone looks olive). It stays readable (about 5.9:1 by my
  calculation). The context file says "highlights and search marks … multiplied, so text stays
  black", and the design says marks are "drawn under the text". The code doesn't match either.
- **N3 The toast-above-player e2e test checks a fake toast.** e2e/design-system.spec.ts:189–195 adds
  its own `div.br-toast` instead of making the app show one. So it tests the CSS rule but not that
  the app's toasts use it. I checked real toasts by hand (item 9). The search-bar half of the
  `:has()` rule has no test.
- **N4 Concurrent toasts overlap (carried over from p17 N2).** App.tsx:561/563 and ReaderView.tsx:994
  (plus `annotationError`) each render a `.br-toast` at the same fixed spot. When two are up at once
  (for example the app's "Saved on this device." and the reader's "Copied the passage…" within 4 s),
  they sit on top of each other. Found by reading the code; I did not reproduce it.
- **N5 (older, not a regression) 320 px with the read-aloud bar open scrolls sideways:**
  `documentElement.scrollWidth` 331 (main 339). No element's box goes past the right edge. The likely
  cause is the transformed `left: 50%` player bar's layout box (app.css:1028–1043).
- **N6 Leftovers:**
  - `.bookmark-toggle[aria-pressed='true']` (app.css:328–331, accent fill) is always overridden by
    the later `.tool-button[aria-pressed='true']` rules (app.css:736–740 and 1188–1193, which also
    repeat each other), so it is dead code.
  - Blank lines were left where `className="icon-only"` was removed: ReaderView.tsx:704, 726, 895,
    902, 924, 933, 939.
- **N7 Small differences from the design inside this phase's scope:**
  - Zoom steps use the `plain` IconButton, where IconButton.md says `filled` for zoom steps.
  - The cover-placeholder title is serif at 0.85rem = 13.6 px (app.css:606–620), where the README
    says never set serif below 15 px.
  - The search panel's "No matches." is still a status line rather than a compact EmptyState. The
    plan only names the empty library and empty panels, so this is a note, not a miss.
- **N8 Perf to watch in CI:** firstPageMs median +19 ms (5%) and jumpMs +3 ms in my 5+5 rounds. This
  is within this machine's noise, and the author's 6 rounds showed nothing, but compare against main
  in the WebKit perf numbers of the CI run.
- **N9 WebKit risk:** e2e/design-system.spec.ts:233–236 reads `getComputedStyle(span, '::selection')`.
  WebKit's support for reading pseudo-element selection colours is uncertain. If CI's WebKit run fails
  there, the check needs a different probe; it does not mean the feature is broken.

## Author appendix (Claude Code, 2026-10-20)

- N1 fixed: placeholders use `ink-muted` (app.css `::placeholder`).
- N2 fixed: search marks are multiplied like highlights, so matched words stay black.
- N3 kept: the app has no way to raise a toast while the player is open without changing the book
  (which stops the player), so the test places one the way the app renders them; the reviewer checked
  real toasts by hand. Revisit when phase 23 rebuilds the listen bar.
- N4 kept (noted): an app toast and a reader toast at the same moment would overlap. Not seen in use;
  phase 19 can stack them if it happens.
- N6 fixed: the dead `.bookmark-toggle` pressed rule and the duplicate `.tool-button` pressed rule are
  gone; the stray blank lines in ReaderView.tsx are removed.
- N7: zoom steps now use the `filled` IconButton; the cover placeholder title is 15 px. The search
  panel's "No matches." stays a status line (outside the plan's list).
- N8 and N9: to watch in CI. N9 changed now: the selection check reads the stylesheet rule in every
  browser, and the computed ::selection colour only in Chromium (WebKit doesn't report it).
- Full chromium run after the fixes: 150 passed, 2 failed: pwa "installable" (environment) and the
  100-book shelf timing test under two-worker load; that test passed 3/3 when run alone.
