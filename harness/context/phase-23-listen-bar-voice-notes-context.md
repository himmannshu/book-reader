# Phase 23 context: Listen bar and voice notes

Judgment calls made under the user's standing instruction of 2026-10-21 (no approval round).

1. **Waveform from the recording, at display time.** The row decodes its audio (OfflineAudioContext) once per
   session and reduces it to bar levels with a pure function. No storage change, and notes recorded before this
   phase get a waveform too. Rejected: measuring levels while recording and storing them (a storage change, and
   old notes would have none).
2. **The speed button cycles; no slider.** The design's long press for a slider is left out: the five speeds
   are one tap apart.
3. **Names kept for the existing controls.** The bar stays a toolbar named "Read aloud" with Pause, Resume and
   Stop reading; the recording strip keeps "Stop and save" as Stop's accessible name and "Cancel recording".
   The visible words follow the design.
4. **Record voice note in the note editor.** It records for the editor's target. Starting it closes the editor
   the way any other step does (an unsaved note is asked about first), then records as before. The Notes
   panel keeps "Record voice note on this page".
5. **The viewer is unchanged.** Read aloud already tints the spoken sentence with `listen-mark` and an accent
   underline and follows it on the page.
