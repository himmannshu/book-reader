# Contract: Phase 09a Sync library and annotations

Agreed definition of done, written before any code. The author drafts it. The user or the
reviewing agent approves it. After approval, only append clearly marked amendments.

- Approved by: Himanshu (user), 2026-10-19, at planning. Building starts only after phase 08 is complete.

User decisions: split phase 09 into 09a/09b; the API runs as Pages Functions behind the existing
Access login; removing a book offers "Remove from this device" and "Delete everywhere".

## Checkable items

Browser checks run in Chromium and WebKit against `wrangler pages dev` with local D1.

| # | Behavior | How to verify | Result (filled in at review) |
|---|---|---|---|
| 1 | Bookmarks, highlights and notes made on device A appear on device B, which has the same book | e2e, two contexts, local D1 | |
| 2 | A book added on A appears on B as "on your other devices"; importing the same file on B shows A's annotations | e2e | |
| 3 | Editing the same item on both devices keeps the later edit on both | e2e + unit (ties broken by device id) | |
| 4 | Deleting a bookmark, highlight or note on A removes it on B; a deletion never resurrects | e2e + unit | |
| 5 | "Remove from this device" keeps the book in the cloud and on B; "Delete everywhere" removes it and its annotations on B | e2e | |
| 6 | Changes made offline are kept and sync when back online; reading never waits on sync | e2e (setOffline) | |
| 7 | The local database migrates from v4 to v5 with existing books and annotations intact | Unit (populated v4 database) | |
| 8 | The API rejects requests without a valid Access token (401) in production mode; data is stored per user | Unit/e2e | |
| 9 | A readable sync status (synced, offline, failed + Retry) and a Sync now button | e2e | |
| 10 | UI code never calls `fetch` for sync directly (lint boundary) | Negative check | |
| 11 | Speed budgets still pass unchanged (sync never blocks the first page) | `npm run test:perf` | |
| 12 | `scripts/verify.sh` passes locally (including the sync suite), and CI is green | Local run; GitHub run URL | |
| 13 | User-checked after deploy: annotations made on the Mac appear on the iPhone/iPad (same book imported on both), and a deletion on one shows on the other | User report | |

## Out of scope for this contract

- Book files in the cloud (phase 09b)
- Real-time sync; merging edits within one annotation
- Accounts for other people

## Amendments

(none)
