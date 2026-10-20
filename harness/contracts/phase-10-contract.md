# Contract: Phase 10 Reading comfort

Agreed definition of done, written before any code. The author drafts it. The user or the
reviewing agent approves it. After approval, only append clearly marked amendments.

- Approved by: agent under the user's standing instruction of 2026-10-20 (Claude Code, cloud
  session, 2026-10-20). Judgment calls: harness/context/phase-10-reading-comfort-context.md.

## Checkable items

Browser checks run in Chromium and WebKit (WebKit through the full CI run when the cloud session
cannot download it; see the build log).

| # | Behavior | How to verify | Result (filled in at review) |
|---|---|---|---|
| 1 | A saved book reopens where I left off: scroll to the middle of page N, go to the Library (or reload the app), open it again, and the same place is at the top (within 2 px), with page N drawn first rather than page 1 | e2e `comfort` | |
| 2 | The position is kept even when I leave right after scrolling (back to Library at once, or the tab is hidden or closed) | e2e (Library at once; reload after `visibilitychange`) | |
| 3 | Opening the same PDF again with Open PDF also resumes there, unless I already scrolled | e2e | |
| 4 | Theme Light, Sepia or Dark can be chosen from the toolbar; it changes the chrome and the pages (a dark page reads as dark, a sepia page as warm) and survives a reload without a flash of the light theme | e2e (screenshot pixel samples, data-theme before first render) | |
| 5 | Zoom in and Zoom out step through set levels; Fit width and Fit page work (Fit page shows the whole page in the window); the keys + - and 0 do the same from the pages; the reading place stays put across zoom changes | e2e + unit (layout, steps) | |
| 6 | Pages wider than the window scroll sideways, and every part of the page can be reached | e2e | |
| 7 | Zoom is remembered per book and restored with the position | e2e | |
| 8 | Existing highlights stay aligned with their text at 50%, 200% and Fit page | e2e (highlight box vs text span boxes) | |
| 9 | Memory stays bounded when zoomed: at 400% no canvas exceeds 16.7 M pixels, all canvases stay within the phase 02 budget, and scrolling does not redraw pages over and over (phase 02 F1) | unit (planRender) + e2e (render counts) | |
| 10 | A book's reading state is local to the device, is deleted with the book (here and by a remote deletion), survives the database upgrade v6 → v7 with all data intact, and a failure to save it never blocks reading (it is logged) | unit (IndexedDB adapter, fake IndexedDB) | |
| 11 | Speed budgets from phase 02 pass unchanged | `npm run test:perf` (Chromium locally; WebKit in CI) | |
| 12 | `scripts/verify.sh` passes (or its cloud stand-in, with the gap recorded), and the full CI run on the branch is green | Local run; GitHub run URL | |
| 13 | User-checked on devices: themes on Mac, iPad and iPhone (including the status bar colour of the installed app); zoom and resume on a real book | User report | |

## Out of scope for this contract

- Pinch-to-zoom and trackpad pinch (left to phase 14, the UI and UX pass).
- Syncing the reading position or zoom across devices.
- A paginated mode, custom fonts, brightness controls.

## Amendments

(none)
