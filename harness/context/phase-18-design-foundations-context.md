# Phase 18 context: design foundations

Material decisions only. Plan and contract: harness/build/phase-18-design-foundations.md,
harness/contracts/phase-18-contract.md. Plan approved by the user on 2026-10-20.

## Source of the design

- The Book Reader design system, made by the user in Claude Design on 2026-10-20:
  https://claude.ai/artifact/5EuNHSDvWfNx3LnfyLzi7Z. Its files were copied into
  `harness/context/design-system/` so agents without access to the link can follow it:
  - `README.md`: the brand book (principles, voice, themes, type, space, motion, icons, screens)
  - `tokens.json`: every token, per theme
  - `icons.md` and `components/<Name>.md`: guidelines
  - `components/src/`: the design's React sources, CSS and types (reference only; lint ignores them)
- Fonts: `public/fonts/` holds Literata and Source Sans 3 (variable, normal and italic), with their
  SIL Open Font License texts (`*-OFL.txt`, from github.com/google/fonts).

## Judgment calls

- **One source for the tokens.** `npm run tokens` (scripts/generate-tokens.mjs) writes
  `src/ui/tokens.css` from the copied `tokens.json`: font faces, a `:root` block per theme,
  spacing, radius, size and font stacks, and the type styles as classes (`.title-md`, `.caption`).
  tests/config/design-tokens.test.ts fails if the stylesheet drifts from the design, if app.css
  declares a colour of its own, or if the status-bar colours differ from each theme's `surface`.
- **Two app tokens outside the design**, written by the generator: `--page-paper` (white) and
  `--page-ink-muted`. They are on the PDF page, which stays paper-white in every theme because the
  Dark and Sepia filters apply over the whole page.
- **Old names mapped to the design's:** `--bg` → `surface`, `--surface` → `surface-raised`,
  `--text` → `ink`, `--muted` → `ink-muted`, `--reader-bg` → `canvas`, `--border` → `line`,
  `--control-border` → `line-strong`, `--field-bg` → `surface-sunken`, `--error-*` → `danger*`,
  `--mark-bg` → `hl-yellow`.
- **Status bar** (`theme-color`, manifest): each theme's `surface`, so it blends with the toolbar.
  It was the accent blue in Light before.
- **Fonts** load with `font-display: swap` and are precached by the service worker (the precache
  grew from about 2.0 MB to 2.3 MB). The PDF pages never wait for them.
- **Controls ported from the design** into `src/ui/controls.tsx`: Button, IconButton, ProgressBar,
  Toast and EmptyState, keeping the design's `br-` class names and its CSS (in app.css). The
  toolbar's labelled ToolButton stays until phase 19 rebuilds the toolbar; it takes the
  IconButton's look (round, quiet hover, `accent` on `accent-soft` when pressed).
- **Touch targets stay 44 px** on touch screens and narrow windows, the small sizes included (the
  design's `sm` is 32 px). The phase 14 rule wins, since the design's own principle is "Thumb first".
- **Toasts** moved to the bottom, as the design says, and rise above the listen and search bars
  when those are open (CSS `:has`, Safari 15.4+). Failures (the app's and the reader's error
  messages) are danger toasts that stay until dismissed; other messages leave after 4 s. Errors
  inside a panel (notes, voice notes) stay inline in the panel.
- **Empty states:** the empty library gets the full EmptyState ("Your library is empty" above the
  existing sentence). Panels get a compact one: icon and the existing sentence, no heading.
- **Icons:** the 47-icon set replaces the hand-drawn one. The Bookmarks panel button uses `list`
  for now, so it doesn't look like the bookmark toggle (`bookmark`, filled when the page has one);
  phase 20 moves Bookmarks into the tabbed panel. Open PDF uses `import`, Display `text-settings`.
- **Focus:** one rule gives every button, link, field, select and focusable element a 2 px
  `focus-ring` outline with a 2 px offset. The page area keeps its quieter focus style (it takes
  focus whenever a book opens).
- **Motion:** colour changes take 160 ms, toasts fade in 200 ms; under reduced motion only colour
  changes keep a duration, and the recording dot stops pulsing.
- **On the page:** highlights and search marks use the translucent `hl-yellow` (multiplied, so text
  stays black); the current search match is ringed in `accent` instead of a darker orange; the
  read-aloud sentence uses `listen-mark` with an `accent` underline; PDF.js's own selection colour
  is overridden with `selection`. Dark keeps `invert(0.9) hue-rotate(180deg)`, as the design gives
  it (the viewer already used it).
- **Sepia pages are lighter than before.** The design's `page-tint` is #f0dcae at 30%, where the app
  used an opaque #f3e2bf. The phase 10 test now checks the design's value.

## Tests changed by the design (recorded in the build log)

- e2e/design.spec.ts: the contrast test now checks the design's token pairs (more pairs than before,
  and the search mark composited over the panel).
- e2e/comfort.spec.ts: the Dark status-bar colour, and the Sepia page colour (the exact composite of
  the design's tint instead of "red minus blue over 30").
