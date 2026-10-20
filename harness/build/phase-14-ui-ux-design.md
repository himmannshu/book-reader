# Phase 14: UI and UX design pass

- Status: In progress
- Branch: phase-14-ui-ux-design
- Depends on: 10, 11

## Objective

The app looks and feels like a calm, polished reader on Mac, iPad and iPhone: one consistent visual
design (type, spacing, colour, icons) across library, reader and panels, touch-friendly controls,
and the rough edges found in earlier reviews fixed.

## In scope

- Design tokens (spacing, type, radius, colour) used throughout app.css
- A small icon set (inline SVG, no dependency) for the toolbars
- One reader bar instead of two; on phones, icons only (same accessible names) and a Display menu
  holding theme and zoom
- Touch targets of at least 44 × 44 px on touch screens and narrow windows
- WCAG AA contrast for text in Light, Sepia and Dark
- Pinch to zoom: trackpad pinch (Chrome's ctrl+wheel, Safari's gesture events) and touch pinch on
  iPad and iPhone (gesture events)
- Review leftovers: page draw failure message (01 B3), title shrinking while confirming removal at
  390 px (03 F1), bookmark reason only in a tooltip (05), 5 px sideways scroll at 320 px, saving
  the horizontal reading position (10), a next/previous bar for search on phones (13)

## Non-goals

- New features beyond the list above
- Photo-preserving dark mode (needs the engine to separate images)

## Expected files or components touched

- src/ui (App, ReaderView, panels, new icons and display menu), src/ui/app.css
- src/viewer (error message, horizontal position), src/core/reading-state

## Decisions needing a human

- none (judgment calls in harness/context/phase-14-ui-ux-design-context.md; the look is checked
  by the user on devices)

## Verification plan

- Red: e2e checks for phone toolbar height, touch target sizes, contrast and 320 px overflow fail on
  the current UI
- Green: the redesign
- Focused command: `npm run test:e2e -- design`
- Full command: `scripts/verify.sh`

## Acceptance criteria

- Mirrored in harness/contracts/phase-14-contract.md

## Risks and recovery

Reworking the toolbars can break many existing tests that find controls by name; keep every
accessible name. Visual changes must not cost scroll performance (no new effects on pages).

## Stop condition

Stop when every contract item has observed evidence in harness/build-log.md.

## Plan (2026-10-20)

Approved by: agent under the user's standing instruction of 2026-10-20. Stacked on phase 13's
branch.
