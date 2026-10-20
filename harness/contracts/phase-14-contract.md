# Contract: Phase 14 UI and UX design pass

Agreed definition of done, written before any code. The author drafts it. The user or the
reviewing agent approves it. After approval, only append clearly marked amendments.

- Approved by: agent under the user's standing instruction of 2026-10-20 (Claude Code, cloud
  session). Judgment calls: harness/context/phase-14-ui-ux-design-context.md.

## Checkable items

| # | Behavior | How to verify | Result (filled in at review) |
|---|---|---|---|
| 1 | In the reader, the app's controls take one bar on desktop (≤ 64 px tall at 1280 × 800) and at most 112 px on a 390 px phone | e2e `design` | |
| 2 | On touch screens and narrow windows every button, select and input in the library, reader bar and panels is at least 44 × 44 px | e2e (iPhone and iPad emulation) | |
| 3 | No sideways scrolling at 320 and 390 px, in the library, the reader and each panel | e2e | |
| 4 | Text contrast is at least 4.5:1 (body, muted and button text on their backgrounds) and 3:1 for control borders, in Light, Sepia and Dark | e2e (computed colours) | |
| 5 | Toolbar buttons have icons; on phones they show icons only, with the same accessible names; theme and zoom live in a Display menu there | e2e + existing tests (names unchanged) | |
| 6 | Pinch to zoom: ctrl+wheel (trackpad pinch in Chrome) and Safari gesture events step the zoom, keeping the reading place | e2e (ctrl+wheel; synthetic gesture events) | |
| 7 | A page that fails to draw says so on the page instead of staying blank | unit (viewer) | |
| 8 | Earlier review leftovers: the title stays visible while confirming removal at 390 px; the reason a bookmark can't be added is visible (not only a tooltip); the horizontal reading position is saved and restored; on phones a next/previous bar appears after choosing a search result | e2e + unit | |
| 9 | All earlier tests pass unchanged except where a control moved by design (each such change recorded in the build log) | full suite | |
| 10 | Speed budgets pass unchanged | perf (Chromium here; WebKit in CI) | |
| 11 | `scripts/verify.sh` (cloud stand-in) passes and the full CI run on the branch is green | local run; GitHub run URL | |
| 12 | User-checked on Mac, iPad and iPhone: the look, pinch to zoom with fingers and trackpad | User report | |

## Out of scope for this contract

- Photo-preserving dark mode; new features.

## Amendments

- Amendment 01 (2026-10-20, agent under the standing instruction): item 6 now covers Safari gesture
  events only. Ctrl+wheel (Chrome's trackpad pinch) was dropped because handling it requires a
  non-passive wheel listener, which makes Chrome's wheel scrolling wait for the main thread
  (speed is a feature, AGENTS.md). A test checks that ctrl+wheel is not intercepted.
