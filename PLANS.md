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
| 10 | Reading comfort | Dark and sepia themes, zoom and fit modes, and each book reopens where I left off | 01 | Complete (merged 2026-10-20; device checks continue in use) |
| 11 | Library view | A shelf with covers and reading progress, with sort and filter | 03 | Complete (merged 2026-10-20; device checks continue in use) |
| 12 | Export highlights and notes | A book's highlights and notes export to a Markdown file | 07 | Complete (merged 2026-10-20; device checks continue in use) |
| 13 | Search inside a book | Full-text search in the open book, with results that jump to each match | 02 | Complete (merged 2026-10-20; device checks continue in use) |
| 14 | UI and UX design pass | The app looks and feels like a calm, polished reader on Mac, iPad and iPhone: a consistent visual design (type, spacing, color, icons) across library, reader and panels, touch-friendly controls, and the rough edges found in reviews fixed | 10, 11 | Complete (merged 2026-10-20; device checks continue in use) |
| 15 | Voice notes | Record a spoken note on a page or highlight, play it back from the notes panel; it survives a reload | 07 | Complete (merged 2026-10-20; device checks continue in use) |
| 16 | Listen to a book | The book is read aloud from where I am, the spoken text is followed on the page, and I can pause and resume | 01 | Complete (merged 2026-10-20; device checks continue in use) |
| 17 | Share excerpts | Share a highlighted passage (with the book title) to social media or another app | 06 | Complete (merged 2026-10-20; device checks continue in use) |
| 18 | Design foundations | The whole app uses the Book Reader design system's themes, fonts (Literata, Source Sans 3, working offline), icons, focus rings and motion, and its basic controls (buttons, icon buttons, progress bars, toasts, empty states), with the layout unchanged | 14 | In progress (built, CI green; waiting on the user's device check) |
| 19 | Reader chrome | The reader has the designed toolbar (book and chapter title, tools in the designed order, a compact form on iPhone, fading while scrolling), a Reading settings popover for theme, zoom and fit, a page pill, and pages styled per theme | 18 | Not started |
| 20 | Panels and sheets | Contents, Bookmarks and Notes share one tabbed panel, and Search has its own; panels dock beside the page on Mac and iPad and rise as bottom sheets on iPhone; the contents tree folds and shows the current chapter | 19 | Not started |
| 21 | Highlight colours | A selection menu offers four highlight colours, a note, copy, share and listen from here; the colour is kept, synced and shown in lists and exports | 20 | Not started |
| 22 | Library shelf redesign | The library shows the designed book cards in a grid or a list, with author, status badges, filter chips with counts and a designed empty state | 18 | Not started |
| 23 | Listen bar and voice notes | Read aloud uses the floating listen bar (previous and next sentence, speed), and voice notes record and play in the designed strip with a waveform | 20 | Not started |

Phases 18–23 apply the "Book Reader" design system made in Claude Design (2026-10-20):
https://claude.ai/artifact/5EuNHSDvWfNx3LnfyLzi7Z. Phase 18 copies its reference (tokens, guidelines,
component sources, icons, fonts) into the repo, so agents without access to the link can follow it.

Status values: Not started, In progress, Blocked, Complete. Only harness/build-log.md can
justify a change to Complete.

## Rules for this file

- One phase should be small enough to implement and verify in a few sessions.
- Keep dependency order. Do not pull later work forward.
- When a phase begins, create harness/build/phase-NN-<slug>.md from the template, and a
  contract in harness/contracts/ before writing code.
