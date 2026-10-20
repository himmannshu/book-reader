# IconButton

A round, icon-only button: the reader's toolbars, panel close buttons and row overflow menus.

- `label` is required; it becomes the accessible name and the tooltip ("Bookmark this page", "Close Contents").
- **plain** in toolbars. **filled** (`surface-sunken`) for close buttons and zoom steps, where the button needs an edge. **accent** only for play/pause.
- Use `pressed` for tools that stay on: the open panel's button, Listen while it plays, the bookmark toggle. Pressed is `accent` on `accent-soft`; the bookmark fills in.
- Sizes: `md` 40px (44px on touch), `sm` 32px inside rows, `lg` 52px for play/pause.

Consumer provides: `icon`, `label`, optional `pressed`, `variant`, `size`, `onClick`.
