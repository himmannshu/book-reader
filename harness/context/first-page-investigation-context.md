# First-page investigation (after phase 02)

Why a real book (DDIA, 24 MB, 613 pages) showed its first page in 462 ms (Chromium) / 384 ms
(WebKit) while the generated heavy fixture takes ~145 ms. Measured on the M2 (8 GB), Playwright
headless, device scale factor 2, 1280×720 viewport. Raw runs are in harness/build-log.md.

## Breakdown

Time from `book:open-start`, median of 3, in the real app (dev build, so ~40 ms slower than the
production benchmark but the split is the same):

| Stage | Heavy fixture (Chromium) | DDIA (Chromium) | DDIA (WebKit) |
|---|---|---|---|
| `book:opened` (read file + `getDocument` + page 1 size) | 188 | 156 | 180 |
| page 0 drawn | 227 | 554 | 553 |
| page 1 (overscan) drawn | 229 | 537 | 543 |

Opening is not the problem: DDIA reaches `book:opened` as fast as the fixture. The extra
~380 ms is all between `opened` and page 0 drawn, and page 0 finishes *after* its overscan
neighbour (page index 1).

Each stage on its own (ad-hoc script driving PDF.js directly, same scale as the app,
3.57 device px per PDF point):

| Step (DDIA) | Chromium | WebKit |
|---|---|---|
| `file.arrayBuffer()` of 24 MB | 10 ms | 10 ms |
| `getDocument` (includes worker start) | 144 ms | 162 ms |
| `getPage(1)` | 0–1 ms | 0–1 ms |
| Draw page 1 (cover) alone | 23–31 ms | 35–41 ms |
| Draw page 1 alone at DPR 1 | 31 ms | 38 ms |
| Draw page 2 alone | 311 ms | 252 ms |
| Page 2 operator list only (worker side, no canvas) | 308 ms | 253 ms |
| Page 2 alone at DPR 1 | 333 ms | 263 ms |
| Pages 1 and 2 started together: page 1 done after | 382 ms | 312 ms |
| Same, plus `loadPageSizes()` (613 `getPage`) | 403 ms | 322 ms |

## Cause

- Page 2 of DDIA holds the book's only CMYK JPEG with an ICC profile (2100×2756, 2 MB;
  `pdfimages -list`: `image icc 4 jpeg`). PDF.js decodes and colour-converts it in its worker,
  taking ~250–310 ms. The cost is all in the worker (operator list ≈ full draw time) and does not
  depend on the output resolution.
- The viewer started page 0 (visible) and page 1 (overscan) at the same time. PDF.js has one
  worker, so page 0's operator list waited behind page 1's image decode.
- Ruled out: reading 24 MB (10 ms), PDF.js parse/worker transfer (same as the fixture), the
  cover's two 6841×5203 CCITT stencil masks (page 1 draws in ~30 ms), DPR 2 (DPR 1 is no faster).
  `loadPageSizes()` running at the same time adds ~20 ms on both books.

## Fix

The viewer now starts overscan pages only after every visible page has finished drawing (or
failed). The visible page that finishes last resumes the overscan pages
(src/viewer/viewer.ts; tests in src/viewer/viewer.test.ts). The engine interface is unchanged.
PDF.js's own viewer works the same way (one page at a time, visible first).

- The resume call happens only while overscan is actually held back. A first version called
  `#update()` after every finished draw. That reads `scrollTop`/`clientHeight` mid-frame and could
  force a layout during scrolling, and this version avoids it.

Production benchmark (`npm run test:perf`, median of 3), before → after (final code):

| | Chromium | WebKit |
|---|---|---|
| DDIA first page | 469 → 133 ms | 393 → 129 ms |
| DDIA jump | 31 → 31 ms | 97 → 47 ms |
| Heavy fixture first page | 142 → 142 ms | 134 → 123 ms |
| Heavy fixture jump | 30 → 17 ms | 107 → 73 ms |

Jump samples vary widely (one sample in three is often 2–3× the others), so read the jump rows
as "not worse", not as a gain.

Scroll smoothness: WebKit steady-scroll p95 is noisy on this machine (27–61 ms across runs of
either version when the machine is hot). In a clean interleaved A/B (8 pairs, alternating order)
the medians were the same: before 28–33 ms (median 33), after 31–33 ms (median 33). Chromium p95
stayed at 16.7–16.8 ms. Blank frames were unchanged (0–1.1%). WebKit p95 sits close to its 40 ms
budget with or without this change. That was already known (phase-02 context).

## Not done (recommendations)

- `loadPageSizes()` starts right after open and costs ~20 ms on page 1 on both books. Starting
  it after the first visible page is drawn would save that. Small, but it changes when the layout
  becomes "measured", so it was left out of this change.
- A page with a slow image still takes ~300 ms to draw when the reader reaches it. Only an
  engine change helps there (decode off the PDF.js worker, PDFium, or a second worker). That is
  a user decision (D3).
