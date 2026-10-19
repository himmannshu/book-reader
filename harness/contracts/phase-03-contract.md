# Contract: Phase 03 Local book persistence

Agreed definition of done, written before any code. The author drafts it. The user or the
reviewing agent approves it. After approval, only append clearly marked amendments.

- Approved by: Himanshu (user), 2026-10-19

User decision during planning: book files are stored as Blobs in IndexedDB, not OPFS
(supersedes part of D5; see harness/context/architecture-decisions.md).

## Checkable items

Every browser check runs in both Chromium and WebKit.

| # | Behavior | How to verify | Result (filled in at review) |
|---|---|---|---|
| 1 | An imported book appears in "Your books" after a page reload | e2e | |
| 2 | Opening it from the list draws page 1 without the file picker | e2e (band color pixels) | |
| 3 | Removing a book (after confirming) removes it from the list and deletes its stored file; still gone after reload | e2e checks the list and the IndexedDB stores | |
| 4 | Importing the same file twice keeps one entry | e2e | |
| 5 | The list is ordered by most recently opened | e2e: import A, then B; open A; A is listed first | |
| 6 | "Library" returns from the reader to the list and closes the open book | e2e | |
| 7 | Storage failures show readable messages (quota: not enough space; unavailable: this browser mode can't save books), and the book stays readable for the session | App unit tests with a failing fake store, plus adapter error-mapping unit tests | |
| 8 | The IndexedDB adapter is unit-tested: add, list order, getFile, dedupe, markOpened, remove, schema version 1 | `npm run test:unit` | |
| 9 | Using `indexedDB` or `navigator.storage` outside `src/storage` fails lint | Negative check, then revert | |
| 10 | Speed budgets still pass, now that opening also saves | `npm run test:perf` within the existing budgets | |
| 11 | `scripts/verify.sh` passes locally, and CI is green | Local run; GitHub run URL | |
| 12 | User-checked in real Safari on the Mac: import a real book in `npm run dev`, close the tab, reopen; the book is listed and opens | User checks and reports | |

## Out of scope for this contract

- Covers, reading progress, sort and filter (phase 11)
- Cloud copy (phase 09)
- Reading position (phase 10)
- Export or backup of stored books

## Amendments

(none)

### Amendment 1 (2026-10-19, recorded after the phase 03 review, finding F7)

The preamble's "book files are stored as Blobs in IndexedDB" changed during the build. Files are
stored as ArrayBuffers, because Safari private browsing and Playwright's WebKit reject Blobs in
IndexedDB. See D5b in harness/context/architecture-decisions.md. The checkable items are
unchanged.
