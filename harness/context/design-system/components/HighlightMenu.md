# HighlightMenu

The small menu that appears over a text selection on the page: colour, note, copy, share, listen from here.

- Choosing a colour creates the highlight at once; the menu stays so a note can follow. Yellow is the default.
- On an existing highlight the current colour is ringed in `ink` and Remove highlight appears.
- Swatches are `swatch-*` tokens, each ringed in `line-strong` so yellow holds on light paper. The page fills use the translucent `hl-*` tokens, not the swatches.
- Placed above the selection with its arrow pointing down; below when there is no room. It never covers the selected text.
- 40px targets in a 48px bar; it is the one menu that must work with a thumb mid-selection.

Consumer provides: optional `color` (for an existing highlight) and the handlers.
