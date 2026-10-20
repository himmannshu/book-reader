# PagePill

The small floating label at the bottom of the reader: Page 142 of 380 and the percentage, or time left in the chapter.

- `meta` style in `ink-muted` on `surface-raised` with `shadow-raised`, fully rounded. It floats over the `canvas`, centred, above the safe area.
- It appears while scrolling or jumping and fades a second after the page settles.
- Use the PDF's page numbers when the book defines labels; otherwise the physical page.

Consumer provides: `page`, `pageCount`, optional `detail`.
