# Contract: Phase 09b Sync book files

Agreed definition of done, written before any code. The author drafts it. The user or the
reviewing agent approves it. After approval, only append clearly marked amendments.

- Approved by: Himanshu (user), 2026-10-19, at planning (plan approval).

User decisions: download on open; cap cloud storage at 9 GB.

## Checkable items

Browser checks run in Chromium and WebKit against `wrangler pages dev` with local D1 and R2.

| # | Behavior | How to verify | Result (filled in at review) |
|---|---|---|---|
| 1 | A book imported on device A uploads in the background; device B opens it from the Library without importing it (download with progress, then page 1 shows), and A's annotations are there | e2e, two contexts, local D1 and R2 | |
| 2 | Books larger than one part (8 MiB) upload in parts and arrive byte-identical | e2e (generated ~20 MB PDF) + unit | |
| 3 | An interrupted upload resumes from the next part (after a failed part or a reload), without starting over | unit + e2e (one part request aborted) | |
| 4 | A download whose bytes don't match the book's SHA-256 is rejected, nothing is saved, and the message is readable | e2e (altered response) + unit | |
| 5 | Opening a cloud-only book offline, or before it has finished uploading, shows a readable message, and works once possible | e2e | |
| 6 | "Delete everywhere" removes the file from the cloud (B can't download it; the server returns 404), and an upload can't bring a deleted book back | e2e + unit | |
| 7 | "Remove from this device" frees the file here; the book can be downloaded again and keeps its annotations | e2e | |
| 8 | Uploads stop at the cap with "Cloud storage is full" and the book keeps working locally | unit + e2e (small cap set for tests) | |
| 9 | File endpoints reject requests without a valid Access token, and one user can never read another's files | unit (and a logged-out curl after deploy) | |
| 10 | The local database migrates from v5 to v6 with books, annotations and sync state intact | Unit (populated v5 database) | |
| 11 | Speed budgets pass unchanged; uploads never delay the first page or scrolling | `npm run test:perf` | |
| 12 | `scripts/verify.sh` passes locally (including the sync suite with R2), and CI is green | Local run; GitHub run URL | |
| 13 | User-checked after deploy: a book added on the Mac opens on the iPhone without importing; try the largest real book | User report | |

## Out of scope for this contract

- Downloading every book automatically
- Uploads while the app is closed
- Accounts for other people

## Amendments

(none)
