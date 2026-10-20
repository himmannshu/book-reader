# Icon

Stroke icons at 1.75px, drawn in `currentColor`, so they take the colour of the text around them.

- Use 20px in toolbars and list rows, 18px inside buttons and segmented options, 16px in chips and metadata, 24px only in the large play button.
- Colour them with text tokens: `ink` for actions, `ink-muted` for metadata and inactive tools, `accent` when the tool is on.
- Pass `title` only when the icon stands alone without a visible label and is not inside an IconButton (which labels itself).
- The names are the reader's own vocabulary (`contents`, `highlight`, `listen`, `text-settings`), not Lucide's. Add new ones to `icons.ts` with the same 24px grid and stroke.

Consumer provides: `name` (an `IconName`), optional `size` and `title`.
