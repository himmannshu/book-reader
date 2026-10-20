# Contract: Phase 11 Library view

Agreed definition of done, written before any code. The author drafts it. The user or the
reviewing agent approves it. After approval, only append clearly marked amendments.

- Approved by: agent under the user's standing instruction of 2026-10-20 (Claude Code, cloud
  session). Judgment calls: harness/context/phase-11-library-view-context.md.

## Checkable items

| # | Behavior | How to verify | Result (filled in at review) |
|---|---|---|---|
| 1 | Each book on the shelf shows a cover made from its first page (its colours match page 1), after reading it and also for books imported before (made in the background while the Library shows, without opening them) | e2e `library-view` (cover pixels vs the fixture's page-1 band colour) | |
| 2 | A book that is only on other devices shows a placeholder cover with its title, until it is downloaded | e2e (seeded record) + unit | |
| 3 | Each book shows its reading progress from the saved place (e.g. "50%" with a progress bar for page 151 of 300), and "Not started" before | e2e + unit (progress math) | |
| 4 | Sort by Recent (default), Title and Progress, and a text filter on the title (case and accents ignored) change what the shelf shows; with no match it says so | e2e + unit | |
| 5 | The choice of sort is remembered | e2e (reload) | |
| 6 | With 100 books the shelf shows within 1 s and filtering updates within 100 ms of typing | e2e (seeded IndexedDB) | |
| 7 | Covers never slow reading: no cover work runs while a book is open, and at most one book is opened for a cover at a time | unit (cover queue) + perf | |
| 8 | Covers are local to the device, kept when only the file is removed, deleted with the book (here and by a remote deletion), and the database upgrades v7 → v8 with all data intact | unit (fake IndexedDB) | |
| 9 | Existing library behaviour still works: open, remove from device, delete everywhere, downloads (phase 09b) | existing e2e and unit tests | |
| 10 | Speed budgets from phase 02 pass unchanged | `npm run test:perf` (Chromium here; WebKit in CI) | |
| 11 | `scripts/verify.sh` (cloud stand-in) passes, and the full CI run on the branch is green | Local run; GitHub run URL | |
| 12 | User-checked: the shelf on Mac, iPad and iPhone with real books (covers, progress, sort, filter) | User report | |

## Out of scope for this contract

- Collections, tags, editing metadata other than the title.
- Syncing covers or progress across devices.

## Amendments

(none)
