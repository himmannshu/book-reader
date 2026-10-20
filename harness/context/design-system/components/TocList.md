# TocList

The book's outline as a tree of chapters with page numbers.

- Entries are `chapter` style in `ink`; page numbers `caption` size in `ink-muted`, tabular and right-aligned.
- The chapter the reader is in is `accent` on `accent-soft`, and its parents open so it is visible when the panel opens. Scroll it into view.
- Each level indents 16px. Parents have a chevron that expands or collapses them; the title itself always jumps.
- Rows are at least `touch-target` tall.
- Books without an outline show an EmptyState: "This book has no table of contents."

Consumer provides: `items` (`id`, `title`, `page`, `children`), `currentId`, `onSelect`, optional `expanded` and `onToggle`.
