# SidePanel

The container for Contents, Bookmarks, Notes and Search in the reader.

- **side** (Mac, iPad, any width of 720px or more): docked right at `panel-width`, full height, `surface-raised`, a `line` edge and `shadow-sheet`. The page stays readable beside it.
- **sheet** (iPhone, narrower than 720px): rises from the bottom to at most 88% of the height, with a grabber and `radius-xl` top corners over a `scrim`. Drag down or tap the scrim to close.
- Title in `title-md`. Tabs or the SearchField go in `header` so they stay pinned while the body scrolls.
- Choosing an entry jumps the page there; on iPhone it also closes the sheet, on larger screens the panel stays open.
- `footer` holds panel-wide actions such as Export notes.

Consumer provides: `title`, `presentation`, optional `header`, `footer`, `children`, `onClose`.
