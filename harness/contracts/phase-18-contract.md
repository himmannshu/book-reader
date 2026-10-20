# Contract: Phase 18 Design foundations

Agreed definition of done, written before any code. The author drafts it. The user or the
reviewing agent approves it. After approval, only append clearly marked amendments.

- Approved by: the user, 2026-10-20 ("approved" in the cloud session). Judgment calls:
  harness/context/phase-18-design-foundations-context.md.

## Checkable items

| # | Behavior | How to verify | Result (filled in at review) |
|---|---|---|---|
| 1 | The design system's reference (guidelines, tokens, component guidelines and sources, icons) is in the repo, and the fonts are in `public/fonts/` with their licence | files present; listed in the context file | |
| 2 | The Light, Sepia and Dark colour values in the app's stylesheet match the design's `tokens.json` exactly, and no component sets a colour outside the token blocks | unit (config test reading app.css and tokens.json) | |
| 3 | Contrast in all three themes: `ink` and `ink-muted` at least 4.5:1 on `surface`, `surface-raised` and `surface-sunken`; `accent` text 4.5:1 on `surface` and `surface-raised`; `on-accent` 4.5:1 on `accent`; `danger` and `ink` 4.5:1 on `danger-soft`; `line-strong` and `focus-ring` 3:1 on every surface | e2e (computed colours) | |
| 4 | Book titles and headings use Literata, and interface text uses Source Sans 3. Both load from the app's own files and still render after going offline and reloading. Text inputs are at least 16 px | e2e (computed fonts, `document.fonts`, offline reload) | |
| 5 | The toolbar and panel icons come from the design's icon set, and every icon-only button still has an accessible name and a tooltip | e2e (existing design test) + unit | |
| 6 | Every button, link, field and select shows a 2 px focus ring when reached with the keyboard | e2e (keyboard tab, computed outline) | |
| 7 | With reduced motion requested, nothing moves (no transitions or animations longer than 0 ms, except colour changes) | e2e (`emulateMedia`) | |
| 8 | Button, IconButton, ProgressBar, Toast and EmptyState follow the design (variants, sizes, roles), are used in place of the app's current equivalents, and touch targets stay at least 44 px on touch screens | unit + existing e2e (44 px, names) | |
| 9 | Toasts show at the bottom, above the listen bar when it is open. Failures stay until dismissed; other messages leave after about 4 s | e2e | |
| 10 | On the page: highlights, search marks, the read-aloud mark and text selection use the design's colours; Sepia pages are tinted and Dark pages filtered as the design gives it | e2e (pixel and computed-style checks) | |
| 11 | All earlier tests pass unchanged except where the design changed a colour, icon or wording (each change recorded in the build log; no check loosened) | full suite | |
| 12 | Speed budgets pass unchanged | perf (Chromium here; WebKit in CI) | |
| 13 | `scripts/verify.sh` (cloud stand-in) passes and the full CI run on the branch is green | local run; GitHub run URL | |
| 14 | User-checked on Mac, iPad and iPhone: the look in all three themes, the fonts offline | User report | |

## Out of scope for this contract

- Layout changes and new components (phases 19–23); highlight colours (phase 21).

## Amendments
