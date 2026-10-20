# Contract: Phase 15 Voice notes

- Approved by: agent under the user's standing instruction of 2026-10-20 (Claude Code, cloud
  session). Judgment calls: harness/context/phase-15-voice-notes-context.md.

## Checkable items

| # | Behavior | How to verify | Result (filled in at review) |
|---|---|---|---|
| 1 | A voice note can be recorded on the current page from the Notes panel, with a running timer, Stop and save, and Cancel | e2e (synthetic microphone) | |
| 2 | A voice note can be recorded on a highlight from its actions; it lists with the highlight's passage | e2e | |
| 3 | Voice notes play back from the Notes panel (an audio player with the recording) and are still there after a reload | e2e | |
| 4 | A voice note can be deleted; removing a highlight or a book deletes its voice notes (here and by a remote book deletion); they are never synced | e2e + unit (fake IndexedDB) | |
| 5 | A refused or missing microphone, or a browser without recording, gives a readable message | e2e + unit | |
| 6 | Recording stops by itself at 5 minutes; damaged records are ignored; the database upgrades to v9 with all data intact | unit | |
| 7 | Speed budgets unchanged; `scripts/verify.sh` (cloud stand-in) passes; full CI green | perf, local run, GitHub run URL | |
| 8 | User-checked: record and play back on Mac, iPad and iPhone (the microphone prompt appears once) | User report | |

## Amendments

(none)
