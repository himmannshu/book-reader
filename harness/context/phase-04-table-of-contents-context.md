# Phase 04 context: table of contents

Material decisions only.

## Outline through the engine interface

- `PdfDoc.outline(): Promise<OutlineItem[]>` with `{ title, pageIndex: number | null, children }`.
- src/engine/outline.ts (pure, unit-tested) resolves the destinations:
  - explicit page references, through `getPageIndex`
  - plain page numbers
  - named destinations, through `getDestination`

  Web links, missing names, unresolvable references and pages outside the book become
  `pageIndex: null` and are shown disabled. One bad entry never hides the rest. Only a failure of
  `getOutline` itself shows "couldn't be read".
- The outline loads lazily, the first time Contents opens, and is cached per book in
  ReaderView state. First-page times are unchanged (verify: 174/172 ms vs 175/175 before).

## Jumping

- `Viewer.scrollToPage(index)` puts the page's top edge at the top of the reader (index
  clamped). It uses the same anchor math as resize and relayout, so it holds when estimated page
  sizes are replaced by measured ones.
- Entries jump to the top of their page, not to the exact position inside it (out of scope).

## Panel behaviour

- A `nav` labelled "Table of contents", toggled by the Contents button (`aria-expanded`). Focus
  moves to the first enabled entry when it opens. Escape closes it and returns focus to the
  button.
- Arrow keys, Home and End move between enabled entries. Safari's Tab skips buttons by default,
  so Tab alone would leave Safari keyboard users stuck. Found by the WebKit e2e test.
- At 700 px wide and above the panel sits beside the pages (they re-fit). Below that it covers
  the pages and closes after a choice.

## Test fixture

- outline-12-pages.pdf is built in scripts/generate-fixtures.mjs with pdf-lib low-level objects
  (`addOutline`), since pdf-lib has no outline API. It covers nesting, a named destination
  (catalog /Names /Dests) and an unregistered name as a broken entry.
