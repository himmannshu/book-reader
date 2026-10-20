# Phase 09b: Sync book files

- Status: In progress (planned in detail and approved 2026-10-19)
- Branch: phase-09b-sync-book-files
- Depends on: 09a

## Objective

A book added on one device can be opened on another without importing it again: the file is
copied to Cloudflare R2 in the background and downloaded the first time it is opened elsewhere.

User decisions (planning, 2026-10-19): download on open (not every book on every device); cap
cloud storage at 9 GB so R2 stays in its free 10 GB.

## In scope

- Pages Functions under `/api/files/` (one catch-all route over a testable `functions/_lib/files.ts`),
  every request identified with the 09a Access check:
  - `POST /api/files/:bookId/uploads {size}`: 409 if the book isn't synced or is deleted;
    storage-full over the cap (9 GB; `FILES_CAP_BYTES` overrides it for tests); `{done:true}` if
    already stored; else an R2 multipart upload `{uploadId, partSize}`.
  - `PUT /api/files/:bookId/uploads/:uploadId/:part`: one part of exactly the part size (8 MiB;
    the last may be smaller) → `{etag}`.
  - `POST .../complete {parts}`: completes and records `(user, book_id, size)` in D1 `files`
    (schema v2); aborts with 410 if the book was deleted meanwhile.
  - `GET /api/files/:bookId`: streams from R2 with `Range` (206); 404 when not stored.
- R2 key `files/<sha256(user)>/<bookId>`. A synced book tombstone deletes the R2 object and the row.
- The server never hashes files (CPU limits); the downloading device checks SHA-256 = book id.
- IndexedDB v6: `uploads` store (state uploading | done | full, uploadId, parts with etags);
  `books.putFile` saves a verified download.
- Uploader (after each sync; one book and one part at a time; progress saved per part; resumes)
  and downloader (8 MiB ranges, progress, retries, hash check, cancel), DOM-free in src/sync/.
- Transport in src/sync/http-client.ts (the only fetch).
- UI: cloud-only rows open with "Downloading… N%" and Cancel; readable messages for offline,
  not uploaded yet, damaged download, cloud full; the sync status line shows uploads.

## Non-goals

- Downloading every book automatically; real-time sync; accounts for other people
- Presigned URLs or R2 API tokens (uploads go through the Function)
- Background uploads while the app is closed (iOS suspends it; resume covers it)

## Decisions needing a human

- The user enables R2, creates buckets `book-reader-files` and `book-reader-files-preview`, and
  binds them as `FILES` (Production / Preview). See docs/deploy.md section 2c.
- Explicit go-ahead before every push (pushes deploy).

## Stop condition

Stop when every contract item has observed evidence in harness/build-log.md.
Do not start the next phase.
