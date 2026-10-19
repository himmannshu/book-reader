# Contract: Phase 06 Highlights

Agreed definition of done, written before any code. The author drafts it. The user or the
reviewing agent approves it. After approval, only append clearly marked amendments.

- Approved by: Himanshu (user), 2026-10-19 (approved in chat with the phase 06 plan)

## Checkable items

Every browser check runs in both Chromium and WebKit. Browser checks use the generated
`text-4-pages.pdf` fixture, whose text positions are recorded in tests/fixtures/manifest.json.

| # | Behavior | How to verify | Result (filled in at review) |
|---|---|---|---|
| 1 | Selecting text in a page shows a "Highlight" button near it; pressing it draws a highlight over exactly that text (each line's box within 2 px of the selected text) and clears the selection | e2e | |
| 2 | A multi-line selection (made by dragging the mouse) becomes one highlight with one box per line, covering no unselected lines | e2e | |
| 3 | A selection across a page break becomes one highlight with boxes on both pages and one joined quote | e2e | |
| 4 | After the window is resized (pages drawn at a new scale), highlights stay aligned with their text | e2e (1280 → 700 px wide) | |
| 5 | Highlights are still there after a reload and reopening the book from the Library | e2e | |
| 6 | Stored highlights hold page index, rectangles in PDF points and the quoted text; the stored numbers are the same whatever the window size, and match the fixture's text positions | e2e reads IndexedDB | |
| 7 | Clicking a highlight shows "Remove highlight"; pressing it removes the highlight, which stays gone after a reload; clicking elsewhere or Escape removes nothing | e2e | |
| 8 | Removing a book from the Library deletes its highlights | e2e | |
| 9 | No Highlight button for whitespace-only selections or text outside the pages; for an unsaved book the button is disabled with a visible reason; a failed save shows a readable message | e2e + unit | |
| 10 | Keyboard: the Highlight and Remove buttons work with Enter when focused; Escape hides them | e2e | |
| 11 | Selection-to-points conversion, line merging, page splitting, quote normalizing and the v2→v3 upgrade (books and bookmarks kept) are unit-tested | `npm run test:unit` | |
| 12 | Speed budgets still pass with the text layer on | `npm run test:perf` | |
| 13 | `scripts/verify.sh` passes locally, and CI is green | Local run; GitHub run URL | |
| 14 | User-checked: on a real book, highlight a few passages (one across lines), resize the window, reload, remove one; on iPhone or iPad too if possible | User checks and reports | |

## Out of scope for this contract

- Highlight colors beyond one default
- Notes (phase 07)
- A highlights list or panel
- Export (phase 12)
- Editing a highlight's extent
- Highlights in scanned or image-only PDFs (no text layer; the Highlight button never appears)

## Amendments

(none)
