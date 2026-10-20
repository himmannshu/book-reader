# Phase 16 context: listen to a book

Built under the user's standing instruction of 2026-10-20; every judgment call below was made by
the agent and can be revisited.

## Judgment calls

- **The browser's own speech** (speechSynthesis), never a cloud voice: on the device, free,
  works offline on Apple devices. The voice is the system default for the page's language;
  choosing a voice is left for later.
- **Sentence by sentence**, at most 280 characters per piece: Chrome stops long utterances after
  about 15 s, and short pieces let the page mark follow closely.
- **Pause is "stop and remember the sentence"**, not speechSynthesis.pause(): pause/resume is
  unreliable across browsers (Chrome on some systems, Safari on iOS). Resume starts the paused
  sentence again.
- **Following the page:** the spoken sentence is found in the page's text layer with the same
  matching as search (the viewer's marking code is now shared) and marked in blue; when it leaves
  the window, the view scrolls to put it a third of the way down. A page without text is skipped.
- **Where to start:** the first sentence ending after the share of the top page that is above
  the window (the saved-place anchor), which is close enough for prose.
- The Listen button stays pressed while reading; pressing it again stops.
- On the narrowest phones (< 360 px) the bar's padding and gaps shrink so seven 44 px buttons fit.

## Known limits (for the user's device check)

- iOS may stop speech when the screen locks or the app is in the background.
- Words split across text items (some PDFs) can make the mark miss a sentence; reading goes on.
