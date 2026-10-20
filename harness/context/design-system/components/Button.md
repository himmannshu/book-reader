# Button

Text buttons for the few actions that need words: Add book, Export notes, Record voice note.

- **primary** (`accent` fill, `on-accent` text) at most once per screen, for the action the screen is for. In the empty library that is Add book.
- **secondary** is the default: `surface-raised` with a `line-strong` border.
- **ghost** for low-weight actions inside panels (Export, Clear all), set in `accent`.
- **danger** only to confirm a destructive step after the person has asked for it (Delete book, Delete note), never as the first button they see.
- Labels: verb first, sentence case, two or three words. No full stops, no exclamation marks.
- `md` is 40px tall and grows to `touch-target` (44px) on touch screens; `sm` (32px) only inside rows and the recording strip.

Consumer provides: `children` (the label), `variant`, optional `icon`, `onClick`.
