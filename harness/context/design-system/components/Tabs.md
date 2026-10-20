# Tabs

Switches between Contents, Bookmarks and Notes inside the reader's side panel.

- Labels are `label` style; the selected tab is `ink` with a 2px `accent` underline, the others `ink-muted`.
- `count` shows the number of bookmarks or notes. Omit it for Contents.
- Three tabs at most. Search has its own panel because it keeps its own field and results.

Consumer provides: `items` (`value`, `label`, optional `count`), `value`, `onChange`, `label`.
