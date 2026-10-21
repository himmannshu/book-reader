# Phase 21 context: highlight colours

Material decisions only. Plan and contract: harness/build/phase-21-highlight-colours.md,
harness/contracts/phase-21-contract.md. Plan posted to the user on 2026-10-21; not yet approved.

## Judgment calls (proposed)

- Branch cut from `phase-20-panels-and-sheets` (main has none of phases 19–20).
- Colour is an optional field on the highlight record; absent or unknown means yellow. No server or
  D1 change: sync items carry the record as JSON, and a recolour is an ordinary last-write-wins edit.
- Add note over a fresh selection makes a yellow highlight first, then opens the note (a note needs a
  highlight to attach to).
- Targets in the menu: 40 px as designed, 44 px on touch screens (the app's touch rule from phase 14).
- Export names the colour of every highlight, yellow included, so the file reads the same everywhere.

## Open for the user

- Whether the Notes tab lists every highlight (recommended) or notes only.
- Whether Voice note stays in the selection menu until phase 23 (recommended).
