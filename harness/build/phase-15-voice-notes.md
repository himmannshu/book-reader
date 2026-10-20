# Phase 15: Voice notes

- Status: In progress
- Branch: phase-15-voice-notes
- Depends on: 07

## Objective

Record a spoken note on a page or a highlight, and play it back from the Notes panel; it survives a
reload.

## In scope

- Recording with the browser's MediaRecorder (on the device), up to 5 minutes per note
- Voice notes on the current page (Notes panel) and on a highlight (the highlight's actions)
- Playback, go to the note's place, delete
- Readable messages when recording isn't possible (no MediaRecorder, microphone refused or missing)

## Non-goals

- Transcription
- Syncing the audio to other devices (left for later; see the context file)

## Plan (2026-10-20)

Approved by: agent under the user's standing instruction of 2026-10-20. Stacked on phase 14's
branch. Core model and storage (schema v9) with unit tests first; recorder and hook; Notes panel
section and highlight action; e2e with a synthetic microphone.

## Verification plan

- Focused command: `npm run test:e2e -- voice-notes`
- Full command: `scripts/verify.sh`

## Stop condition

Stop when every contract item has observed evidence in harness/build-log.md.
