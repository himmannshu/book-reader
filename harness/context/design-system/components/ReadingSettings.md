# ReadingSettings

The popover behind the Aa button: theme, zoom and fit.

- `popover-width` (300px) on `surface-raised` with `shadow-raised`; on iPhone it becomes a bottom sheet with the same three groups.
- Theme changes apply instantly to the whole app, chrome and pages together. The swatches show each theme's own paper.
- Zoom steps through 25, 50, 67, 75, 90, 100, 110, 125, 150, 175, 200, 250, 300 and 400%. Choosing a zoom switches Fit to Custom; choosing Width or Page recalculates the zoom.
- Group labels are `caption` in `ink-muted`; there are no other words in the popover.

Consumer provides: `theme`, `zoom`, `fit` and their change handlers.
