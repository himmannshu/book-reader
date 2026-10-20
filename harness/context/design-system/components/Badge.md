# Badge

One or two words of status on a book card or row: New, Finished, In cloud, Downloading, Offline.

- `meta` type style (12px, 600). Never more than one badge per card.
- Tones: `neutral` for location (In cloud), `accent` for New and Downloading, `positive` for Finished, `danger` for a failed import. Each carries a word, and Finished and failures also carry an icon.

Consumer provides: `children`, optional `tone`, `icon`.
