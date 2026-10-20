# Phase 09: Cloud library

> **Note (2026-10-19):** split by the user into phase 09a
> (harness/build/phase-09a-sync-library-and-annotations.md) and phase 09b
> (harness/build/phase-09b-sync-book-files.md). This file is kept for history.

- Status: Not started
- Branch: phase-09-cloud-library
- Depends on: 05, 06, 07, 08

## Objective

Books and their annotations are copied to the cloud, so a book added on one device, with its bookmarks, highlights and notes, appears on another. Conflicts use a simple last-write-wins rule per item.

## In scope

- Small Worker API in front of R2 (book files) and D1 (annotations and metadata)
- Cloud adapter behind the existing storage interface
- Upload, download, and a basic sync step
- Tests against local `wrangler` emulation only

## Non-goals

- Real-time sync
- Merging edits to the same annotation
- Accounts for other people

## Expected files or components touched

- worker/ (or similar)
- src/storage cloud adapter
- e2e/

## Decisions needing a human

- User provides Cloudflare resources and bindings (agents never handle keys)
- Explicit go-ahead before deploying the Worker

## Verification plan

- Red: Test with two simulated devices against local emulation: a book added on A is missing on B; fails
- Green: Cloud adapter + Worker + sync step
- Focused command: (decided in phase)
- Full command: `scripts/verify.sh`

## Acceptance criteria

Mirror these in harness/contracts/phase-09-contract.md as checkable items.

- Against local emulation, a book and its annotations added on device A appear on device B
- Reading still works offline; changes sync when back online
- Deleting an item on one device removes it on the other
- User-checked on real devices after deploy

## Risks and recovery

Data loss through sync bugs. Keep local data authoritative until a sync succeeds; never delete locally because the cloud lacks an item.

## Stop condition

Stop when every contract item has observed evidence in harness/build-log.md.
Do not start the next phase.
