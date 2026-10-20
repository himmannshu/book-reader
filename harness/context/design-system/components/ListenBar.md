# ListenBar

The bar that floats at the bottom of the reader while the book is read aloud.

- `listen-bar-height` (64px), `surface-raised`, `radius-lg`, `shadow-raised`, inset `space-4` from the screen edges and the safe area.
- The centre is the accent play/pause button flanked by previous/next sentence. The speed button cycles 0.75×, 1×, 1.25×, 1.5×, 2×; a long press opens the Slider.
- The sentence being spoken is tinted `listen-mark` on the page with a 2px `accent` underline, and the page scrolls to keep it in the middle third.
- Close stops speech and removes the bar. Pausing keeps the bar.
- Under 480px the status text hides and the controls align left.

Consumer provides: `playing`, `rate` and the handlers, optional `position` and `voice`.
