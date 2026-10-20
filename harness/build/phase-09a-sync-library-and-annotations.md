# Phase 09a: Sync library and annotations

- Status: Complete (2026-10-20; evidence in harness/build-log.md)
- Branch: phase-09a-sync-library-and-annotations
- Depends on: 05, 06, 07, 08

## Objective

With the same book imported on two devices, its bookmarks, highlights and notes match on both.
Books added on one device appear on the other as "in your library" (the file itself arrives in
09b). Deletions reach the other device. Everything works offline and syncs when back online.

User decisions (planning, 2026-10-19): phase 09 is split into 09a (this) and 09b (book files);
the API runs as Cloudflare Pages Functions on the same site, behind the existing Access login;
removing a book offers "Remove from this device" and "Delete everywhere".

## In scope

- Pages Function `POST /api/sync { deviceId, since, changes[] }`: last-write-wins per item (newer
  `updatedAt`; tie → larger deviceId); returns unseen changes (`seq > since`, own echoes
  excluded) and a new cursor.
- D1 table `items(user, kind, id, book_id, data, updated_at, deleted, seq, device)` with a
  per-user sequence; idempotent migrations applied by the Function on first use.
- Identity from the Cloudflare Access token (`Cf-Access-Jwt-Assertion`), verified with `jose`
  against the team keys and the application audience (env vars `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`);
  data stored per user email. A `dev` identity mode only in the local test configuration.
- IndexedDB schema v5: `updatedAt` on bookmarks and highlights (= createdAt), `updatedAt` and
  `hasFile` on books, `tombstones` and `syncState` stores; local writes stamp increasing
  `updatedAt`.
- Sync engine in src/sync/ (pure merge rules + a `SyncClient` transport interface); syncs on
  start, ~2 s after changes, when back online, and on Sync now; status line (synced, offline,
  failed + Retry; "sign in again" when the Access session expired).
- Library: cloud-only books listed as "On your other devices"; Remove from this device / Delete
  everywhere, both confirmed.
- Deploy guide additions: two D1 databases (production and preview), bindings, env vars.

## Non-goals

- Book files in the cloud (09b)
- Real-time sync, merging edits within one annotation
- Accounts for other people

## Expected files or components touched

- functions/ (Pages Functions), migrations SQL
- src/sync/, src/storage (schema v5, tombstones), src/ui (status, library actions)
- e2e/sync/ with a Playwright config running `wrangler pages dev` with local D1
- docs/deploy.md, AGENTS.md (fetch boundary), package.json (wrangler, @cloudflare/workers-types, jose)

## Decisions needing a human

- User creates the D1 databases, bindings and env vars (agents never handle keys)
- Explicit go-ahead before every push (pushes deploy)

## Verification plan

- Red: two-device e2e (local D1): a bookmark added on A is missing on B; fails
- Green: schema v5 + sync engine + Pages Function
- Focused command: `npm run test:sync` (decided in phase)
- Full command: `scripts/verify.sh`

## Acceptance criteria

See harness/contracts/phase-09a-contract.md (approved at planning).

## Risks and recovery

Data loss through sync bugs: last-write-wins with tombstones; never delete locally because the
cloud lacks an item; unit tests for every merge case; two-device e2e. Clock skew: increasing
stamps, device-id tie-break. Previews use a separate D1 database.

## Stop condition

Stop when every contract item has observed evidence in harness/build-log.md.
Do not start the next phase.
