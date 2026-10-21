# Phase 23: Listen bar and voice notes

- Status: In progress (plan approved by the agent under the user's standing instruction of 2026-10-21)
- Branch: phase-23-listen-bar-voice-notes (cut from `phase-22-library-shelf`)
- Depends on: 20

## Objective

Reading aloud uses the design's floating ListenBar, and voice notes record and play in the design's
VoiceNote strip with a waveform. Design references: `harness/context/design-system/components/
{ListenBar,VoiceNote}.md` and their sources in `components/src/`.

## In scope

- ListenBar, floating at the bottom of the reader (`listen-bar-height`, `surface-raised`, `radius-lg`,
  `shadow-raised`, inset `space-4` and the safe area): Reading aloud or Paused with the place ("p. 12 ·
  chapter"), previous sentence, the accent play/pause, next sentence, a speed button that cycles 0.75×,
  1×, 1.25×, 1.5×, 2×, and Stop. Under 480 px the status text hides and the controls align left.
- Previous and next sentence move the reading, across page breaks too, while reading or paused.
- Voice note rows: an accent play/pause, a waveform of the recording whose played part fills `accent`,
  the time ("0:03 / 0:05") and Delete. The waveform comes from the recording itself; one that can't be
  decoded shows a flat line.
- Recording: the `danger-soft` strip with a pulsing dot, the word Recording, where, the elapsed time, Stop
  (saves) and Cancel.
- Record voice note moves into the note editor (page and highlight notes); the selection menu loses
  Voice note (kept there until this phase by phase 21's decision 2). The Notes panel keeps "Record voice
  note on this page".

## Non-goals

- The speed slider on a long press (the button cycles), voice choice, a seek bar for voice notes
- Syncing voice notes (they stay on this device, as since phase 15)

## Expected files or components touched

- `src/core/read-aloud.ts` (speeds, next speed), `src/core/voice-notes.ts` (waveform levels)
- `src/ui/useReadAloud.ts` (skip), new `src/ui/ListenBar.tsx`, new `src/ui/VoiceNotePlayer.tsx`,
  `src/ui/VoiceNotes.tsx`, `src/ui/NotesPanel.tsx` (editor button), `src/ui/SelectionActions.tsx`,
  `src/ui/ReaderView.tsx`, `src/ui/app.css`
- e2e: `listen.spec.ts`, `voice-notes.spec.ts`, `panels.spec.ts`, `design-system.spec.ts`

## Verification plan

Scope (standing instruction of 2026-10-21): lint, format, types, unit tests and the full browser suite (both
engines). No perf or sync run: the viewer, rendering and sync are unchanged (read aloud already marks and
follows the sentence; voice notes are local). No CI run.

- Red first: unit tests for the speed cycle and waveform levels; e2e for next/previous sentence across a
  page break, the speed button, the bar's parts and phone layout, the voice note strip (play, time,
  waveform), recording strip, and Record voice note in the note editor.

## Acceptance criteria

See harness/contracts/phase-23-contract.md.

## Risks and recovery

- Decoding audio for the waveform costs a little CPU when the Notes panel opens: done once per note per
  session, after the row shows, never while scrolling the pages.

## Stop condition

Stop when every contract item has observed evidence in harness/build-log.md (deferred items recorded).
