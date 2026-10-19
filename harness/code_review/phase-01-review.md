# Phase 01 review: Open and read a PDF

- Reviewer: Claude Code (Opus 5.5), evaluator subagent, fresh context
- Date: 2026-10-18
- Commit reviewed: 5a41e4b (branch phase-01-open-and-read-pdf)
- Inputs: AGENTS.md, harness/EVALUATOR.md, harness/build/phase-01-open-and-read-pdf.md,
  harness/contracts/phase-01-contract.md. I read the build log and diff only after writing my own checks.

## How I tested

- `scripts/verify.sh` → lint, format, typecheck, unit (20 passed), browser (16 passed, chromium and webkit) → `--- PASS`.
- Production build served with `vite preview --port 4199`. I drove it with Playwright scripts kept
  outside the repo, in Chromium and WebKit, using the repo fixtures plus extra probe PDFs I generated
  (empty file, truncated PDF, header-only PDF, zero-page PDF, 40 thin "strip" pages, a rotated page,
  a 1500-page book).
- Dev server (`vite --port 5199`, StrictMode on): opened two books in a row and scrolled. No console
  errors or warnings in either browser.
- Mutation checks on a scratch copy of HEAD (not the repo), Chromium e2e only: see Test quality.
- Lint boundary checked with `eslint --stdin --stdin-filename <path>`, which runs the same config as
  `npm run lint` but does not write any files.

## Contract items

| # | Result | What I ran and saw |
|---|---|---|
| 1 | PASS | verify e2e passes in both browsers. My own probe opened basic-3-pages through the file input, page 1 slot `rendered`, band color matched. |
| 2 | PASS | verify e2e (basic-3-pages and long-300-pages, both browsers). I also jumped to pages 151, 8, 299, 43 of the long book: each canvas showed the expected band color, so the right page is drawn in the right slot. |
| 3 | PASS | verify e2e (max ≤ 8 canvases, page 1 released). After 200 random scroll jumps: 3 canvases, 297 placeholders, 0 error slots, no console errors (both browsers). |
| 4 | PASS | verify e2e. Probe: mixed-sizes ratios match. Rotated page (90°) slot ratio 1.294 against 1.294 expected. |
| 5 | PASS | verify e2e. Probe: empty, truncated, and header-only files all show "This file isn't a readable PDF." Valid → invalid keeps the old book and shows the alert. Valid PDF opens after that and the alert clears. |
| 6 | PASS | verify e2e. Probe: after reading the middle of long-300, opening big-1500 starts at page 1 with 1500 slots and correct book info. File input is disabled while a book is opening (checked). The same file chosen twice reopens cleanly. |
| 7 | PASS (width) | verify e2e. Probe: anchored at 60% into page 100, resized 1280→500→1280. Fraction 0.600 then 0.599, page 100 still in view. A height-only resize has a bug, see B1. |
| 8 | PASS | Static `import`, `import type`, `export * from`, and the `?url` worker import in src/ui and src/viewer → lint exit 1 with the "Import PDF.js only inside src/engine" message. The same import in src/engine → exit 0. Gaps in B4. |
| 9 | PASS | `npm run test:unit` → 20 passed. layout.test.ts covers top, middle, gap, bottom, overscan clamping, maxPages cap, single page, empty layout, and anchor restore. |
| 10 | PASS | `scripts/verify.sh` → `--- PASS` at 5a41e4b. |
| 11 | PASS (user-observed, not re-verified) | The build log records the user's report. I cannot open the user's own book. As a stand-in, I ran the dev server with fixtures and a 1500-page synthetic book: no errors. |

## Rubric

| Criterion | Score | Threshold | Notes |
|---|---|---|---|
| Contract fidelity | 5 | 5 | All 11 items exercised and pass. Item 11 is user-observed by contract design. |
| Functionality | 4 | 4 | Open, scroll, jump, replace, bad input and resize all work end to end in both browsers. Minor edge-case defects: B1 (blank page after a height-only resize, until you scroll), B2 (more than 8 visible pages leaves the extras blank), B5 (no keyboard scrolling until you click). |
| Robustness | 4 | 4 | Open errors are typed and mapped to readable messages. Cancelled renders are ignored correctly. Destroy races are guarded. No stubs. Weak spot: a page that fails to draw is a blank white box with only a console error, and it is not retried while it stays in view (B3). |
| Code quality | 4 | 3 | Clear engine/viewer/UI split. Pure layout module. Private fields. Comments explain why. Small duplication: `PageSize` is defined in both src/engine/types.ts and src/viewer/layout.ts. |
| Test quality | 4 | 3 | Pixel-level page identity checks. Mutations I ran: canvas kept in DOM → item 3 fails. Real sizes ignored → item 4 fails. Anchor not restored → item 7 fails. Out-of-range pages not released → item 3 fails. Gaps: no test for a height-only resize, for scroll position when a second book opens, or for the >8-visible case. |
| Product depth | 3 | 3 | A real reader core: virtualization, cancel and release, resolution capped at DPR 2, reading position kept across re-layout. No navigation yet (expected in later phases). |
| Design | 3 | 3 | Warm custom palette, not library defaults. Centered pages with shadows. Readable error banner. Page 1 sits flush against the toolbar (B6). |

## Bugs and findings

**B1 (medium). A height-only resize leaves newly exposed pages blank until the user scrolls.**
src/viewer/viewer.ts:78-80. The ResizeObserver only acts when `clientWidth` changes, so
`#update()` never runs when only the height changes.
Repro (Chromium and WebKit): viewport 600×400, open long-300-pages, wait for page 1. Then
`setViewportSize({width: 600, height: 2000})` and wait 1.5 s. Pages 1–3 are visible, but page 3 is
`data-state="placeholder"` (blank white). A 1px scroll fixes it.
Expected: any change to the visible area triggers `#update()`. Real-world triggers: making a Mac
window taller or maximizing it, or closing devtools.

**B2 (low). When more than `maxRenderedPages` pages are visible, the extra visible pages stay blank permanently.**
src/viewer/layout.ts:100 (the cap keeps `first..first+7`).
Repro: open a 40-page PDF of 792×60 pt strips at 1280×720. 9 pages are visible and page 9 stays
`placeholder`. The contract requires the cap. Rare in real books, but the result is a blank region
with no hint. Consider drawing at lower resolution or noting it as a known limit.

**B3 (low). Render failures are invisible to the user.**
src/viewer/viewer.ts:171 sets `data-state="error"`, but no CSS or text shows it. The slot stays a
white rectangle, and it is not retried while it stays in range. Only a console.error is logged.

**B4 (low). The lint boundary has gaps.**
eslint.config.js:19 only matches `src/**/*.{ts,tsx}`, and `no-restricted-imports` does not cover
dynamic `import()`.
Repro: `echo "export const p = import('pdfjs-dist');" | npx eslint --stdin --stdin-filename src/viewer/probe.ts` → exit 0.
`echo "import { getDocument } from 'pdfjs-dist'; export const x = getDocument;" | npx eslint --stdin --stdin-filename src/viewer/probe.js` → exit 0.
Item 8, as written (a static import), still passes.

**B5 (low, outside the contract). Keyboard reading does not work until the user clicks into the reader.**
The scroller (src/ui/ReaderView.tsx:16) has no tabindex and is not focused after a book opens.
Repro: open a book and press PageDown → scrollTop stays 0. Click the page, then PageDown → it
scrolls. In WebKit, Tab never reaches the reader at all.

**B6 (cosmetic). The top padding is always scrolled away.**
`anchorAt` maps any offset in the leading padding to page 0 at fraction 0
(src/viewer/layout.ts:126). So every re-layout at the top (open, loadPageSizes, resize) sets
`scrollTop = 24`.
Repro: open any book → `reader.scrollTop === 24`. Scroll to 0 and resize → back to 24. Page 1
touches the toolbar.

Observations (not bugs): a 0-page PDF made by pdf-lib opens as "1 page" (PDF.js behavior). The 1500-page
book draws its first page in about 250–320 ms. `loadPageSizes` fetches every page up front, which
phase 02 should measure on real long books.

## Verdict

**PASS.** Every criterion meets its threshold. B1 is the most important fix and should get a
regression test (grow only the viewport height, then expect the visible slots to be `rendered`).
Functionality is at its threshold, not above it. If the user considers B1 a blocker, this becomes a FAIL.
