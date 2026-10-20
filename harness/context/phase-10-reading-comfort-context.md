# Phase 10 context: reading comfort

Material decisions only. Plan and contract: harness/build/phase-10-reading-comfort.md,
harness/contracts/phase-10-contract.md.

Built in a cloud session under the user's standing instruction of 2026-10-20 (see
harness/HANDOFF.md). Every "judgment call" below was made by the agent without the user and can
be revisited.

## Judgment calls

- **Reading state is per device, not synced.** It changes on every scroll pause; syncing it would
  schedule a sync round every few seconds while reading and needs a new server kind. Kindle-style
  "furthest page read" across devices can come later as its own small change. Stored in a new
  IndexedDB object store `readingState` (schema v7, keyed by book id), deleted with the book.
- **What is saved:** the anchor at the top of the window (page index, fraction of the page,
  pixels above it) plus the zoom setting. Pixel positions are never saved, so a position stays
  right at any window size or zoom.
- **When it is saved:** 600 ms after scrolling stops, when the tab is hidden or closed
  (`visibilitychange`, `pagehide`), on leaving the reader, and after a zoom change. The scroll
  listener only records a timestamp and arms one timer, so idle scrolling stays cheap (WebKit's
  scroll budget has little headroom).
- **Saving on leaving must happen in a layout-effect cleanup.** React runs passive-effect
  cleanups after it has detached the DOM, and a detached scroller reads `scrollTop` 0, so a save
  there overwrote the place with the top of the book. Leaving and hiding always save (a scroll
  set just before may not have fired its event yet); the pause timer is cleared on unmount.
- **Opening the same file with Open PDF resumes** too, as long as the reader has not scrolled or
  zoomed since the book opened (the stored id is known only after the file is hashed and saved).
- **Boot script:** index.html has a small inline script that reads the saved theme from
  `localStorage` and sets `data-theme` and `theme-color` before the stylesheet paints. It is the
  one read of app storage outside src/storage, and it duplicates the key name (comments point
  both ways). The app has no Content-Security-Policy, so inline scripts run. Lint now also keeps
  `localStorage` out of src/ outside src/storage.
- **Theme is app-wide** (Light, Sepia, Dark; default Light), kept in `localStorage` through
  src/storage/preferences.ts, because it must be read synchronously before the first render to
  avoid a flash. A missing or blocked `localStorage` falls back to Light for the session.
- **Pages in Dark** use a CSS filter on each page (`invert` plus `hue-rotate(180deg)`), which keeps
  hues roughly right and needs no redraw. **Sepia** multiplies a warm colour over the page (white
  becomes paper, black stays black). Highlights are inside the page, so they are tinted the same
  way and stay visible. The installed app's status bar follows the theme (`theme-color`).
- **Zoom percentages mean actual size** (100% = 1 PDF point is 96/72 CSS px), as in Preview and
  Acrobat. Levels: 25, 33, 50, 67, 75, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400%. Zoom in
  and out step from the zoom actually shown, so they work from Fit width or Fit page too.
- **Fit width keeps the phase 01 reading column**: the window width minus margins, capped at
  900 px. Filling a wide Mac screen makes lines too long to read; zoom in for bigger. This also
  keeps the phase 02 benchmarks measuring exactly what they measured before.
- **Fit page** fits each page inside the window (both directions), never wider than Fit width.
- **Pages wider than the window** get explicit left positions in the layout (content width =
  widest page + margins) instead of the CSS centring trick, so the left edge can be scrolled to.
  Zooming keeps the horizontal centre of the view.
- **Memory when zoomed:** a cap of 16,777,216 pixels per canvas (iOS Safari's limit; larger
  canvases draw blank there), and phase 02 F1 fixed: when the visible pages would exceed the canvas
  budget, the resolution comes from a stable worst case (the most pages of this size that can
  overlap the window), so it no longer changes, and redraws every page, each time a page enters
  or leaves the view.
- **Keys:** + (or =), - and 0 (Fit width) while the pages have focus, without modifiers.
  Cmd/Ctrl with + and - stay the browser's own zoom.
- **Pinch-to-zoom is deferred** to phase 14 (UI and UX pass): it needs gesture handling on iOS
  and a trackpad path on the Mac, and is a design question as much as a technical one.

## Environment (cloud session)

See the build log entry for the baseline: WebKit and Playwright's pinned Chromium cannot be
downloaded (network policy), so local browser checks run on a Chromium 153 build from npm and
WebKit is covered by the full CI run on the branch.
