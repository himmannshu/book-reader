# Phase 09b: Sync book files

- Status: Not started (outline; planned in detail when it starts)
- Branch: phase-09b-sync-book-files
- Depends on: 09a

## Objective

A book added on one device can be opened on another without importing it again: the file is
copied to Cloudflare R2 and downloaded on demand.

## In scope (outline)

- Book files in R2, keyed by user and SHA-256 (deduplicated by content)
- Chunked uploads (R2 multipart) so books over Cloudflare's 100 MB request limit work; resumable
- Cloud-only books download when first opened, with progress, then stay on the device
- "Remove from this device" frees the local file; "Delete everywhere" also deletes it from R2
- Covers the original phase 09 acceptance criteria and feature F-010

## Non-goals

- Real-time sync; accounts for other people

## Decisions needing a human

- User creates the R2 bucket and binding
- Explicit go-ahead before every push (pushes deploy)

## Stop condition

Stop when every contract item has observed evidence in harness/build-log.md.
Do not start the next phase.
