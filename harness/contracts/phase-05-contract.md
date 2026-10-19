# Contract: Phase 05 Bookmarks

Agreed definition of done, written before any code. The author drafts it. The user or the
reviewing agent approves it. After approval, only append clearly marked amendments.

- Approved by: Himanshu (user), 2026-10-19 (approved in chat with the phase 05 plan)

## Checkable items

Every browser check runs in both Chromium and WebKit. "Current page" is the page covering the most
of the reader's viewport (ties go to the earlier page).

| # | Behavior | How to verify | Result (filled in at review) |
|---|---|---|---|
| 1 | Pressing "Bookmark page" on page N marks it (`aria-pressed=true`), and the Bookmarks panel lists "Page N · <chapter>" | e2e | |
| 2 | The toggle follows the page in view: scrolling to an unmarked page shows it unpressed; scrolling back shows it pressed | e2e | |
| 3 | Choosing a bookmark brings its page to the top of the reader and draws it (band color matches) | e2e | |
| 4 | Bookmarks are listed in page order, whatever order they were added | e2e | |
| 5 | After a reload and reopening the book from the Library, its bookmarks are still listed | e2e | |
| 6 | Removing a bookmark (from the panel, or by un-toggling) removes it, and it stays removed after a reload | e2e | |
| 7 | Removing a book from the Library deletes its bookmarks; importing it again starts with none | e2e | |
| 8 | A book with no outline names bookmarks "Page N"; with no bookmarks the panel shows "No bookmarks yet." | e2e with basic-3-pages | |
| 9 | When the book can't be saved, the toggle is disabled with a reason; a failed bookmark save shows a readable message | unit (App/ReaderView tests with a failing store) | |
| 10 | Keyboard: Bookmarks opens with Enter, entries are reachable with arrows and work with Enter, Escape closes the panel and returns focus to Bookmarks; at 600 px wide the panel overlays the pages and closes after a choice | e2e | |
| 11 | Current-page logic, bookmark label and id, and the storage upgrade (v1 books kept, bookmarks removed with their book) are unit-tested | `npm run test:unit` | |
| 12 | Speed budgets still pass (reading bookmarks never delays the first page) | `npm run test:perf` | |
| 13 | `scripts/verify.sh` passes locally, and CI is green | Local run; GitHub run URL | |
| 14 | User-checked: on a real book, bookmark a few pages, reload, and jump back to them | User checks and reports | |

## Out of scope for this contract

- Custom labels or renaming bookmarks
- More than one bookmark per page, or a position within a page (bookmarks jump to the page top)
- Cloud copy (phase 09)
- Showing bookmarks in the Library view
- A keyboard shortcut for the bookmark toggle

## Amendments

(none)
