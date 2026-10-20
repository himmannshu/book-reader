# Contract: Phase 16 Listen to a book

- Approved by: agent under the user's standing instruction of 2026-10-20 (Claude Code, cloud
  session). Judgment calls: harness/context/phase-16-listen-to-book-context.md.

## Checkable items

| # | Behavior | How to verify | Result (filled in at review) |
|---|---|---|---|
| 1 | Listen reads the book aloud from the place at the top of the window, sentence by sentence, page after page, and stops at the end | e2e (stand-in speech engine) | |
| 2 | The sentence being spoken is marked on its page and kept in view, also across pages | e2e | |
| 3 | Pause keeps the place; Resume starts that sentence again and goes on; Stop ends it and clears the mark | e2e | |
| 4 | A new speed applies to what is read next | e2e | |
| 5 | Without speech in the browser, Listen says so | e2e | |
| 6 | Sentences split sensibly (abbreviations, initials, decimals, wrapped lines, blank lines) and no piece is longer than 280 characters | unit | |
| 7 | Phone layout still fits at 320 px with the new button; speed budgets unchanged; verify (cloud stand-in) passes; full CI green | e2e design, perf, local run, GitHub run URL | |
| 8 | User-checked: listening on Mac, iPad and iPhone with real voices (pause/resume, following the page, the screen locked on iPhone) | User report | |

## Amendments

(none)
