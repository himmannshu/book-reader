# SegmentedControl

Two to four mutually exclusive options shown side by side: theme, fit mode, library sort and grid/list view.

- Selected segment: `surface-raised` lifted on the `surface-sunken` track with a `line-strong` edge, so it is not told apart by colour alone.
- Use `swatch` for the theme picker so each option previews its paper colour.
- Use `iconOnly` only for the grid/list view switch, where the icons are unambiguous. The label is still announced.
- `block` makes it fill its container, as in Reading settings.

Consumer provides: `options` (`value`, `label`, optional `icon` or `swatch`), `value`, `onChange`, `label` for the group.
