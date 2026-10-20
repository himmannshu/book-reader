# Phase 11 context: library view

Material decisions only. Plan and contract: harness/build/phase-11-library-view.md,
harness/contracts/phase-11-contract.md. Built under the user's standing instruction of 2026-10-20;
every judgment call below was made by the agent and can be revisited.

## Judgment calls

- **Covers are page 1, drawn on this device, never synced.** Stored in a new IndexedDB store
  `covers` (schema v8) as a JPEG in an ArrayBuffer (Safari refuses Blobs in IndexedDB), about
  10–20 KB each. Kept when only the file is removed (the shelf still looks right), deleted with
  the book.
- **When covers are made:** never while reading. When the reader closes and the book has no
  cover, page 1 is drawn small from the still-open document before it is destroyed. Books with a
  file but no cover (imported before this phase, or the app closed while reading) get one in the
  background while the Library is showing: one book at a time, after a short idle delay,
  stopping when the Library closes.
- **Books only on other devices** show a placeholder cover with the title, since there is no file
  to draw from.
- **Progress** is the saved place (phase 10) over the page count, which the reading state now also
  stores (an optional field, so states saved before still read; those books show progress once
  read again).
- **Sort:** Recent (default), Title, Progress; remembered in preferences (localStorage, like the
  theme). **Filter:** title contains the typed text, ignoring case and accents.
- **Layout:** a grid of cards (cover, title, progress, Remove). The title button keeps its name
  (the cover image inside it has empty alt text), so screen readers and the earlier tests find
  books the same way.
