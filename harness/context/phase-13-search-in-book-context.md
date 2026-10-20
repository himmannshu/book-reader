# Phase 13 context: search inside a book

Built under the user's standing instruction of 2026-10-20; every judgment call below was made by
the agent and can be revisited.

## Shape

- **Engine:** `PdfDoc.pageText(index)` joins PDF.js's text items (a line break at each line end).
  PDF.js parses the page in its worker; only the strings cross to the main thread.
- **Matching** (src/core/search.ts): case, accents (Unicode NFD marks) and the amount of white
  space are ignored; offsets map back to the original text. Queries need 2 letters. Matches do
  not overlap.
- **Search run** (src/ui/useSearch.ts): page by page, 4 pages requested ahead so the worker is
  never idle (600-page fixture here: 3.7 s → 2.7 s), progress shown a few times a second, page
  texts cached per document, at most 1,000 results, a new query cancels the old one.
- **Marks on the page** come from the text layer, which only visible pages have: the viewer finds
  the same matches in the layer's text and draws boxes in percent of the page (like highlights).
  The match counting is the same function on nearly the same text, so result n on a page is the
  n-th box there.
- **Choosing a result** scrolls to its page; once the page's text layer is ready, the current
  match is put about a third of the way down the window.

## Judgment calls

- **No new budget.** The plan says to add a search budget to the phase 02 benchmarks, but budget
  changes need the user. The benchmark records `searchMs` and reports it ("no budget yet"); the
  user picks a number (see harness/USER-CHECKLIST.md). Measured in the cloud session (slower than
  the Mac): about 2.7 s for a cold search of all 600 pages.
- Cmd/Ctrl+F opens the book's search instead of the browser's, which cannot see text drawn on
  canvases.
- Marks stay while there is a query, also with the panel closed; on narrow screens choosing a
  result closes the panel (like the other panels). A floating next/previous bar is left for the
  phase 14 design pass.
- A search runs on the same PDF.js worker as page drawing, so pages may draw a little slower
  while a long book is being searched; reading is never blocked.
