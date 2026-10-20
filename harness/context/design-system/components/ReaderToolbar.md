# ReaderToolbar

The bar across the top of the reader: back to the library, the book and chapter, and the reading tools.

- `toolbar-height` (52px) plus the safe-area inset, translucent `surface` with a background blur and a `line` hairline below.
- Order, left to right: Library, Contents | title and chapter | Search, Listen, Reading settings, Bookmark. The bookmark is always last, where the thumb lands.
- `compact` (iPhone portrait): Contents and Search move into More, and the title aligns left.
- The tool whose panel is open shows `pressed`. The bookmark is pressed when the current page has one.
- `hidden` fades it out while the person scrolls; a tap on the page brings it back. It never hides while a panel or the highlight menu is open.

Consumer provides: `title`, optional `chapter`, `bookmarked`, `active`, `compact`, `hidden` and the handlers.
