# Phase 15 context: voice notes

Built under the user's standing instruction of 2026-10-20; every judgment call below was made by
the agent and can be revisited.

## Judgment calls

- **On this device only, for now.** The audio stays in IndexedDB (schema v9, store `voiceNotes`,
  indexed by book and by highlight). Syncing it would need new server routes and R2 objects per
  note; the standing instruction allows R2 under the 9 GB cap, but the user should decide whether
  voice notes are worth cloud space, so it is left as a follow-up (USER-CHECKLIST).
- **MediaRecorder on the device**, never a speech service. Safari records MP4/AAC, Chrome and
  Firefox WebM/Opus; the first supported type is used. 5 minutes per note at most (about 2–5 MB),
  then it stops and saves by itself.
- **Several voice notes per page or highlight** (unlike text notes, one per target): a recording
  cannot be edited, so adding another is the natural way to add a thought.
- Removing a highlight removes its voice notes, like its text note.
- Tests use a synthetic microphone (a 440 Hz tone from an AudioContext), so no device or
  permission dialog is needed; where a test browser has no MediaRecorder, the tests check the
  readable message instead.
