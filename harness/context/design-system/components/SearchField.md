# SearchField

The in-book search input, with the match count and previous/next buttons inside it.

- 44px tall, `surface-sunken` with a `line-strong` border; focus thickens the border to `focus-ring`.
- Text is 16px so iOS does not zoom the page when it gains focus.
- `status` reads "3 of 41" while results exist and "No matches" when there are none. It is announced politely.
- Enter goes to the next match, Shift+Enter to the previous, Escape clears.
- In the reader it sits pinned under the Search panel title; the results list scrolls below it.

Consumer provides: `value`, `onChange`, optional `status`, `onPrev`, `onNext`, `onClear`.
