# AnnotationRow

One bookmark, highlight or note in the Bookmarks and Notes panels.

- Metadata line first, in `caption` and `ink-muted`: the kind's icon, the page, the chapter, the date at the right.
- A highlight's passage is set in `quote` (Literata) with its own `hl-*` colour behind the words, as it looks on the page. Clamp passages over six lines and let the row open to the full text.
- The written note follows in `body` and `ink`. A spoken note adds a VoiceNote under it.
- A bookmark shows the first line of its page in `ink-muted`.
- Tapping the row jumps to the place; More holds Edit note, Change colour, Share, Copy and Delete.
- Rows are divided by `line` hairlines, never boxed into cards.

Consumer provides: `kind`, `page`, optional `quote`, `color`, `note`, `voice`, `chapter`, `date`, `onSelect`, `onMore`.
