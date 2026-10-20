# SearchResult

One match in the Search panel: page, chapter and a line of context with the match marked.

- The matched words get the `hl-yellow` fill and weight 600; the context is `body` in `ink`.
- The result the page is showing is `accent-soft`; previous/next in the SearchField move it.
- About 40 characters each side of the match, cut at word boundaries with an ellipsis.
- The same marks appear on the page itself while the panel is open.

Consumer provides: `before`, `match`, `after`, `page`, optional `chapter`, `active`, `onSelect`.
