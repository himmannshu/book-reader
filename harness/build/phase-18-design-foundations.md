# Phase 18: Design foundations

- Status: Not started (plan awaiting the user's approval)
- Branch: phase-18-design-foundations
- Depends on: 14

## Objective

The whole app takes on the Book Reader design system made in Claude Design
(https://claude.ai/artifact/5EuNHSDvWfNx3LnfyLzi7Z): its three themes, two typefaces, icon set,
focus rings and motion, and its basic controls. The layout does not change in this phase: the
toolbar, panels and library keep their current structure. Phases 19–23 change those.

## In scope

- A reference copy of the design system in the repo (guidelines, `tokens.json`, component
  guidelines and sources, icons), so agents without access to the link can follow it. Fonts go in
  `public/fonts/` with their licence (SIL Open Font License).
- Colour tokens for Light, Sepia and Dark, named as in the design (`surface`, `surface-raised`,
  `surface-sunken`, `canvas`, `ink`, `ink-muted`, `accent`, `line`, `line-strong`, `danger`,
  `positive`, ...), replacing the current custom properties. The status-bar colour (`theme-color`)
  follows them.
- Spacing, radius, shadow and size tokens from the design.
- Literata for book titles and headings, Source Sans 3 for the interface, self-hosted, working
  offline (service worker precache), with system fallbacks while they load. Type styles as
  classes; tabular figures for numbers; text inputs at 16 px or more.
- The 47-icon set (Lucide paths, ISC licence) replacing the current hand-drawn icons, at a
  1.75 px stroke.
- A 2 px focus ring with a 2 px gap on every interactive element; motion at 160–200 ms with no
  movement under `prefers-reduced-motion`.
- Controls ported from the design's sources into `src/ui/`, and used wherever the app already has
  the same control: Button (primary, secondary, ghost, danger), IconButton, ProgressBar, Toast
  (at the bottom, above the listen bar; failures stay until dismissed, other messages leave after
  4 s) and EmptyState (empty library and empty panels). Segmented controls, chips, badges and the
  other components arrive with the screens that use them (phases 19–23).
- On-page colours: highlight fill (`hl-yellow`), search marks, the read-aloud mark
  (`listen-mark` plus an accent underline), text selection, the Sepia page tint, and the Dark
  page filter as the design gives it (`invert(0.9) hue-rotate(180deg)`).

## Non-goals

- Layout changes: the new toolbar, Reading settings popover, page pill, tabbed panels, bottom
  sheets, library cards and listen bar (phases 19–23)
- Highlight colours other than yellow (phase 21)
- New features of any kind

## Expected files or components touched

- `src/ui/app.css`, `src/ui/icons.tsx`, `src/ui/controls.tsx` and the components that use them
- `src/ui/theme.ts` and the boot script in `index.html` (status-bar colours)
- `vite.config.ts` (precache the fonts), `public/fonts/`
- `harness/context/design-system/` (the reference copy)
- e2e: `design.spec.ts` (contrast pairs, fonts, focus, motion), the offline test; unit tests for
  the new controls and a config test that ties the CSS to `tokens.json`

## Decisions needing a human

- none beyond approving this plan. Judgment calls go in
  harness/context/phase-18-design-foundations-context.md.

## Verification plan

- Red first: a config test that compares the theme blocks in app.css with the design's
  `tokens.json` (fails today), contrast checks on the new token pairs, a fonts-offline check, a
  focus-ring check and a reduced-motion check
- Green: the token, type, icon and control changes
- Focused command: `npm run test:unit` and `npm run test:e2e -- design`
- Full command: `scripts/verify.sh` (cloud stand-in: Chromium only), then the full CI run on the
  branch for WebKit and the speed budgets

## Risks

- Speed: the fonts add about 280 KB to the first install. They load with `font-display: swap`,
  and the PDF pages never wait for them, so first-page time should not move. The perf budgets
  decide.
- Tests that find elements by colour, icon shape or exact text may need updating where the design
  changed them. Each such change is recorded in the build log, and no check is loosened.
- Phase 16 moved notices to the top so they would not cover the player. The design puts toasts at
  the bottom, so they sit above the listen bar instead.

## Acceptance criteria

See harness/contracts/phase-18-contract.md.
