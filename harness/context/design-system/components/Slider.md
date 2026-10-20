# Slider

A continuous setting with its value printed beside the label: speech rate in the Listen settings.

- Track is `line-strong`, the filled part `accent`, the thumb `surface-raised` with a `line-strong` edge.
- Always show the value with `format` (`1.25×`, `150%`); never a bare slider.
- Prefer a SegmentedControl when there are four or fewer meaningful stops.

Consumer provides: `label`, `value`, `min`, `max`, `step`, `onChange`, optional `format`.
