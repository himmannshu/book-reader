# Contract: Phase 23 Listen bar and voice notes

Agreed definition of done, written before any code. The author drafts it. The user or the
reviewing agent approves it. After approval, only append clearly marked amendments.

- Approved by: agent under the user's standing instruction of 2026-10-21 (see harness/HANDOFF.md). Judgment
  calls: harness/context/phase-23-listen-bar-voice-notes-context.md.

## Checkable items

| # | Behavior | How to verify | Result (filled in at review) |
|---|---|---|---|
| 1 | While listening, a floating bar shows Reading aloud or Paused with the place (page, chapter when known), previous/next sentence, the accent play/pause, a speed button and Stop | e2e | |
| 2 | Next and previous sentence move the reading by one sentence, also across a page break, while reading or paused | e2e | |
| 3 | The speed button cycles 0.75×, 1×, 1.25×, 1.5×, 2× and the new speed applies at once | unit + e2e | |
| 4 | Under 480 px the status text hides and every control stays on screen with 44 px targets on touch screens | e2e | |
| 5 | A voice note row plays and pauses with an accent button, shows a waveform of the recording with the played part filled, and the time | unit + e2e | |
| 6 | Recording shows the strip with the word Recording, where, the elapsed time, Stop (saves) and Cancel | e2e | |
| 7 | The note editor has Record voice note (page and highlight notes); the selection menu no longer has Voice note | e2e | |
| 8 | Earlier tests pass, changed only for renamed or moved controls (each change in the build log; no check loosened) | browser suite | |
| 9 | Lint, format, types and unit tests pass | local run | |
| 10 | Full `scripts/verify.sh` and CI: deferred by the user's standing instruction (no viewer, rendering or sync change) | recorded as deferred | |
| 11 | User-checked on Mac, iPad and iPhone | User report | |

## Out of scope for this contract

- Speed slider, voice choice, seeking inside a voice note, syncing voice notes.

## Amendments

(none)
