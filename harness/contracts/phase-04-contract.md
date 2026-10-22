# Contract: Phase 04 Table of contents

Agreed definition of done, written before any code. The author drafts it. The user or the
reviewing agent approves it. After approval, only append clearly marked amendments.

- Approved by: Himanshu (user), 2026-10-19

## Checkable items

Every browser check runs in both Chromium and WebKit.

| # | Behavior | How to verify | Result (filled in at review) |
|---|---|---|---|
| 1 | "Contents" opens a panel listing the fixture's outline in order, with nesting (chapters inside their part) | e2e reads the nested list | |
| 2 | Choosing a chapter brings its page to the top of the reader and draws it | e2e: slot near viewport top, `rendered`, band color matches | |
| 3 | An entry using a named destination jumps to the right page | e2e | |
| 4 | An entry with no usable destination is shown disabled, and it is not an error | e2e: disabled button, no alert | |
| 5 | A PDF without an outline shows "This book has no table of contents." | e2e with basic-3-pages | |
| 6 | Keyboard: Contents opens with Enter, entries are reachable and work with Enter, Escape closes the panel and returns focus to Contents | e2e | |
| 7 | In a narrow window (600 px wide) the panel overlays the pages and closes after a choice | e2e | |
| 8 | Outline mapping is unit-tested: explicit page reference, named destination, numeric page, broken destination, web link, nesting | `npm run test:unit` | |
| 9 | Speed budgets still pass, because the outline loads only when the panel opens | `npm run test:perf` | |
| 10 | `scripts/verify.sh` passes locally, and CI is green | Local run; GitHub run URL | |
| 11 | User-checked: on a real book (for example one of the user's own), Contents shows its chapters and jumps to the right pages | User checks and reports | |

## Out of scope for this contract

- Making a contents list for PDFs that don't have one
- Highlighting the current chapter while reading
- Collapsing nested entries
- Jumping to a position within a page (entries jump to the page top)
- Bookmarks (phase 05)

## Amendments

- Amendment (2026-10-21, before the repo went public): item 11's example book title replaced with a generic
  phrase at the user's request. The item's meaning is unchanged.
