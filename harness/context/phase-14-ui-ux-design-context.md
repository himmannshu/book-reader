# Phase 14 context: UI and UX design pass

Built under the user's standing instruction of 2026-10-20; every judgment call below was made by
the agent and can be revisited (the user checks the look on devices).

## Shape

- **One bar.** In the reader, the app header becomes the reader's bar: back to the Library, the
  book's name, then the reader's tools (rendered into the header with a React portal from
  ReaderView), theme and Open PDF. The second row of the old design is gone.
- **Icons.** src/ui/icons.tsx: a dozen 24 × 24 stroke icons drawn for this app (no dependency).
  Buttons keep their text as their accessible name; the text shows next to the icon only at
  1400 px and wider, and is a tooltip (title) otherwise. Bookmarks (list) and Bookmark page
  (toggle, filled when the page is bookmarked) have different icons.
- **Phones (< 700 px):** two compact rows (back, title, Open; then six tools). Theme and zoom move
  into a Display menu (Aa). The "Saved on this device" notice is a toast that fades after 4 s
  instead of a toolbar row. After choosing a search result, a small bar steps through matches.
- **Touch targets:** `--control-h` is 44 px on coarse pointers and narrow windows; panel entries,
  library buttons, dialog buttons and fields get at least 44 px there too.
- **Tokens:** spacing (4/8/12/16/24), radii (6/10), text sizes and control height as CSS custom
  properties; new rules use them. Older rules were left alone where they already matched.
- **Contrast:** control borders darkened to reach 3:1 in all themes (the only failing pair);
  text pairs already passed 4.5:1. A test computes them from the live CSS.

## Judgment calls

- **Pinch to zoom settles on a level** (nearest by ratio) when the pinch ends, instead of a live,
  continuous zoom: drawing pages at arbitrary scales mid-gesture would blow the memory and redraw
  budget. It uses Safari's gesture events (trackpad, and two fingers on iPad and iPhone);
  preventing their default stops iOS zooming the whole app instead.
- **Chrome's trackpad pinch (ctrl+wheel) is not handled.** It was built, then removed: catching it
  needs a non-passive wheel listener on the pages, and then every wheel scroll in Chrome waits for
  the main thread (which is busy while pages draw). Scrolling speed wins; in Chrome, zoom with the
  buttons, the Zoom menu or the + and - keys. A test checks that no wheel listener blocks
  scrolling.
- **The bookmark button is aria-disabled, not disabled, while a book isn't saved**, so a tap says
  why (iOS shows no tooltips; phase 05 review). Unit test updated by design.
- **The horizontal place** is saved with the reading state (`centreX`, the middle of the view as a
  share of the content width) and restored on open.
- **A page that fails to draw** shows "This page couldn't be drawn." on the page.
- **The focus ring on the pages** is quieter (the pages get focus whenever a book opens).
- Not done: photo-preserving dark mode (needs the engine to tell images apart).

## Tests changed by design

- comfort.spec "on a phone": opens the Display menu before checking theme and zoom.
- ReaderView.test "marks the toggle disabled and says why…": aria-disabled and a tap.
