# Phase 15 review: Voice notes

- Reviewer: Claude Code (Opus 5.5, evaluator subagent, fresh context), 2026-10-20
- Branch: phase-15-voice-notes at 55f70ea. Reviewed in /home/user/book-reader-p17 (8d7718b, which
  contains it). The phase diff is `git diff a6cbbff 55f70ea`. The v8 → v9 upgrade check used a
  build of /home/user/book-reader-p14.
- Inputs: harness/contracts/phase-15-contract.md, harness/build/phase-15-voice-notes.md,
  harness/context/phase-15-voice-notes-context.md, harness/EVALUATOR.md.

## Verdict: FAIL

Recording, playback, reload, delete, the highlight and book cascades, error messages, the 5-minute
stop and the v9 upgrade all work. There are two real lifecycle bugs: voice-note audio is never freed
when the reader closes (a memory leak that grows with every open), and the microphone stays on
forever if you leave the book while the permission prompt is up. No green full CI covers the branch.

## Environment

The same as phase 14's review (/home/user/book-reader-p14/harness/code_review/phase-14-review.md):
- Node 24, Chromium only via `PLAYWRIGHT_BROWSERS_PATH=$HOME/pw-browsers`
- stand-in verify in p17: lint, format, types OK; unit 354; e2e chromium 138 passed + 1 environment
  failure; sync 15/15
- full CI 39392502232 red, sync and perf not reached
- Synthetic microphone: `getUserMedia` stubbed to return an AudioContext oscillator through a
  MediaStreamDestination. The probe kept every track, so it could check `readyState`, and wrapped
  `URL.createObjectURL`/`revokeObjectURL` to count live URLs. Headless Chromium records
  `audio/mp4` here.

## Contract items

| # | Result | Evidence |
|---|---|---|
| 1 | PASS | The timer reads "Recording on page 1 · 0:02 of 5:00" after 2.3 s. Stop and save gives the row "Page · Page 1 · 0:02". Cancel leaves no row, and the microphone track ends. e2e voice-notes passes (chromium). |
| 2 | PASS | e2e: Voice note on a highlight lists with “Charlie three”. |
| 3 | PASS | Probe: blob 39,621 bytes, `audio/mp4`, duration 2.36 s, no media error. `play()` reached currentTime 0.45 s. e2e: still there after a reload. |
| 4 | PASS | Delete works (e2e). Unit voice-note-store: highlight removal, book removal and remote book deletion each delete the voice notes, and nothing is queued for sync. Code: `deleteVoiceNotes` runs in the same transactions (indexeddb-book-store.ts). |
| 5 | PASS | NotAllowedError gives "Allow the microphone for this app to record voice notes." (e2e). NotFoundError gives "No microphone was found.". NotReadableError gives "The voice note couldn't be recorded. Try again.". No MediaRecorder, or no `navigator.mediaDevices`, gives "Recording isn't available in this browser.". |
| 6 | PASS on behaviour, tests missing | 5-minute stop, probe with `page.clock`: after +1 min it reads "1:01 of 5:00". After 5 min it saved by itself as "Page · Page 1 · 5:00", and the microphone track ended. Damaged records: unit `validVoiceNote`. Upgrade: a real profile built with phase 14 (v8: 1 book, file, bookmark, note, reading state, cover, 3 syncMeta) was opened with phase 17. It became v9 with every count unchanged plus `voiceNotes: 0`. The reading place (scrollTop 900) and the note were intact. **No unit test exists for the time limit** (recorder.ts and useVoiceNotes have no tests), and there is no v8 → v9 unit test (only cover-store's v7 → current). The contract says "unit". |
| 7 | **FAIL** | Perf in Chromium is unchanged (see phase 14 and p17 runs). The Chromium stand-in is green. There is no full CI on this branch, and the stacked run 39392502232 is red. |
| 8 | PENDING (user) | Mac, iPad and iPhone recording. |

## Rubric

| Criterion | Score | Threshold | Notes |
|---|---|---|---|
| Contract fidelity | 3 | 5 | Item 7 is not met. Item 6 is shown by behaviour, without the unit tests it names. Item 8 is pending. |
| Functionality | 4 | 4 | The main flows all work. Recording carries on invisibly when the panel closes (N1). |
| Robustness | 2 | 4 | B1 memory leak, B2 microphone never released. A track that ends mid-recording saves as 0:00 (N2). |
| Code quality | 3 | 3 | Clear store and recorder. The unmount cleanup uses `setItems` on an unmounting component (a no-op), and `show` has side effects inside a state updater. |
| Test quality | 3 | 3 | Good e2e with a real recorder, and good store unit tests. The lifecycle is untested: a mutation that deletes `active.current?.cancel()` from the unmount effect left voice-notes e2e green (reverted). |
| Product depth | 4 | 3 | Several notes per target, passages listed, go-to, cascades. |
| Design | 3 | 3 | Clear recording row with a pulsing dot. "Export highlights and notes" now sits visually under the VOICE NOTES heading (N4). |

## Blockers

- **B1 Audio object URLs leak on every reader close.** src/ui/useVoiceNotes.ts:63–72 frees the
  URLs inside `setItems(...)` in an unmount cleanup. React never runs an updater for an unmounted
  component, so nothing is revoked. Steps: record 2 voice notes → Library (live blob URLs: 2 voice
  + 1 cover = 3) → open and close the book 3 more times → 9 live, 13 created, 4 revoked. Every
  voice note's audio (up to about 5 MB each) is pinned again on every open, until the page unloads.
  On an iPhone that is a tab-kill risk. Revoke from a ref holding the current list, not from a state
  updater.
- **B2 The microphone stays on if the reader closes while `getUserMedia` is pending.** In
  `start()` (useVoiceNotes.ts:107), `active.current = started` runs after the await, even when the
  component is gone. Nothing then calls `cancel()`/`release()`. The 5-minute auto-save returns
  early (`recording` state is null), so `release()` is never called either. Steps: delay
  getUserMedia 1.5 s → Record → press Library at once. 2.5 s later 1 microphone track is still
  `live` and never ends. On a desktop browser the permission prompt is not modal, so this is easy to
  hit, and the microphone indicator stays on until reload.
- **B3 (item 7) No green full CI** covering this branch. Sync and perf did not run in CI.

## Non-blocking findings

- N1 If you close the Notes panel while recording, recording goes on (the microphone track stays
  live) with no in-app sign of it. The timer and Stop live only inside the panel. It auto-saves
  after 5 minutes. Show a recording indicator in the bar, or keep the panel open.
- N2 If the track ends by itself (microphone unplugged, iOS interruption), MediaRecorder stops, but
  the UI keeps showing "Recording … 0:03". Pressing Stop and save then saves the note as **0:00**,
  because `endedAt` is set only when the app itself calls `recorder.stop()` (recorder.ts:96–110).
  Steps: record 2 s → `track.stop()` → Stop and save. Neither the recorder `error` event nor the
  track's `ended` event is handled.
- N3 "Voice note" on a highlight while another recording runs is ignored silently (it just opens
  the panel on the current recording). Leaving the book mid-recording discards the recording
  without asking.
- N4 Notes panel hierarchy: the Export button now follows the voice-notes section, so it looks like
  a voice-notes action.
- N5 Under StrictMode (dev only), `show()`'s create and revoke inside the updater runs twice and
  leaks one set of URLs.
- Process: harness/build-log.md has **no entry for phase 15**. AGENTS.md says a phase is complete
  only when every contract item has observed evidence there. features.json F-018 is correctly still
  failing.

## Appendix (author, 2026-10-20 12:55 UTC): findings addressed

- Leak: the hook keeps the live object URLs in a ref and frees them when the reader closes (unit test: red on
  the old hook, green now).
- Microphone left on: a recording that starts after the reader closed (permission prompt still up) is cancelled
  at once, freeing the microphone (unit test).
- A recording under 0.5 s (a microphone that dropped out) is not saved; the reader is told (unit test).
- Closing the Notes panel mid-recording shows a floating bar with Stop and save / Cancel (e2e).
- The unit tests named in the contract now exist: the 5-minute limit (fake timers, fake MediaRecorder) and the
  v8 → v9 upgrade with books, covers and reading states intact.
- CI: covered by the next full run on phase 17 (contains this branch).
