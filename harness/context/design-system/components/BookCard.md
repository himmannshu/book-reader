# BookCard

One book on the library shelf: its cover, title, author, reading progress and at most one status badge.

- **grid** layout (iPad, Mac, and iPhone at three per row): the cover is `cover-width` wide at 2:3 with `shadow-page` and `radius-xs` corners, like a printed book.
- **row** layout for the list view and narrow phones: a 64px cover, text beside it, a `line` divider below.
- Without a rendered first page (`coverUrl`), a typographic cover is drawn: `surface-raised`, an `accent` band across the top, the title in Literata. Never a stock image.
- A book that is only in the cloud copy is dimmed and badged In cloud; tapping it downloads and opens it.
- Title in `book-title`, clamped to two lines; author in `caption` and `ink-muted`.
- Progress shows as a bar until the book is finished, then as the Finished badge.

Consumer provides: `title`, optional `author`, `coverUrl`, `progress`, `availability`, `layout`, `onOpen`, `onMore`.
