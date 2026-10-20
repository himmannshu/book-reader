# VoiceNote

Records and plays back a spoken note attached to a page or a highlight.

- **idle**: a secondary "Record voice note" button in the note editor.
- **recording**: a `danger-soft` strip with a pulsing `danger` dot, the word Recording, the elapsed time and Stop. The word is always there, so the state does not depend on colour.
- **playing / paused**: an accent play button, a waveform whose played part fills `accent` over `line-strong`, and the time in tabular figures.
- Voice notes stay on this device and are not synced. When the panel lists them on another device, say "Voice note on another device".

Consumer provides: `state`, optional `duration`, `elapsed`, `levels` and the handlers.
