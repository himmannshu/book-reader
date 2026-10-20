# PLANS.md

The ordered phase roadmap. Stay at the level of product behavior and deliverables. Do not
write detailed technical specs here: if one is wrong, the mistake spreads into every later
phase. Implementation detail gets decided inside each phase, with the real code in view.

## Product summary

A personal book reader in the spirit of Kindle, focused on PDF books. The core experience is
reading a PDF natively and quickly, with the tools a serious reader wants: a table of contents
for navigation, bookmarks to mark places, highlights to mark passages, and notes to capture
thoughts. Speed is a first-class quality, not a later polish step. It is measured automatically
from phase 02 onward.

It is an installable web app used on a Mac, iPad and iPhone. Books and annotations live on the
device first, so reading never waits on the network. A cloud copy carries them between devices.
The core comes first, then reading comfort, a library view, export, and in-book search. The
reasoning behind these choices is in harness/context/architecture-decisions.md.

## Phases

| # | Phase | Outcome (what a user or test can observe) | Depends on | Status |
|---|---|---|---|---|
| 00 | Repository foundation | App shell loads in a browser test; lint, types, unit and browser tests run from `scripts/verify.sh`; CI workflow file exists | none | Complete |
| 01 | Open and read a PDF | Pick a PDF from disk and read it with continuous scroll; only pages near the viewport are drawn | 00 | Complete |
| 02 | Performance baseline | Automated speed budgets on a large test PDF (first page, scrolling, jumping, memory) fail verify on regression | 01 | Complete |
| 03 | Local book persistence | Opened books stay on the device; after a reload a simple list reopens them without re-importing | 01 | Complete |
| 04 | Table of contents | A panel shows the book's outline; choosing a chapter jumps to it | 01 | Complete |
| 05 | Bookmarks | Add and remove bookmarks, see them in a list, jump to them; they survive a reload | 03 | Complete |
| 06 | Highlights | Select text and highlight it; highlights stay in place at any zoom and survive a reload | 03 | Complete |
| 07 | Notes | Attach a note to a highlight or a page; a notes panel lists them and jumps to them; they survive a reload | 06 | Complete |
| 08 | Installable and hosted | The app installs to Dock and Home Screen, opens offline, and is hosted behind a personal login | 03 | Complete |
| 09a | Sync library and annotations | Bookmarks, highlights and notes match across devices that have the same book; books added on one device are listed on the other; deletions reach every device | 05, 06, 07, 08 | Complete |
| 09b | Sync book files | A book added on one device can be opened on another without importing it again | 09a | Complete |
| 10 | Reading comfort | Dark and sepia themes, zoom and fit modes, and each book reopens where I left off | 01 | In progress (built, CI green; waiting on the user's device check) |
| 11 | Library view | A shelf with covers and reading progress, with sort and filter | 03 | In progress (built, CI green; waiting on the user's device check) |
| 12 | Export highlights and notes | A book's highlights and notes export to a Markdown file | 07 | In progress (built, CI green; waiting on the user's check) |
| 13 | Search inside a book | Full-text search in the open book, with results that jump to each match | 02 | In progress |
| 14 | UI and UX design pass | The app looks and feels like a calm, polished reader on Mac, iPad and iPhone: a consistent visual design (type, spacing, color, icons) across library, reader and panels, touch-friendly controls, and the rough edges found in reviews fixed | 10, 11 | In progress |
| 15 | Voice notes | Record a spoken note on a page or highlight, play it back from the notes panel; it survives a reload | 07 | In progress |
| 16 | Listen to a book | The book is read aloud from where I am, the spoken text is followed on the page, and I can pause and resume | 01 | Not started |
| 17 | Share excerpts | Share a highlighted passage (with the book title) to social media or another app | 06 | Not started |

Status values: Not started, In progress, Blocked, Complete. Only harness/build-log.md can
justify a change to Complete.

## Rules for this file

- One phase should be small enough to implement and verify in a few sessions.
- Keep dependency order. Do not pull later work forward.
- When a phase begins, create harness/build/phase-NN-<slug>.md from the template, and a
  contract in harness/contracts/ before writing code.
