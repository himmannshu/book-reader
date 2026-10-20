# Phase 09a context: sync library and annotations

Material decisions only. Plan and contract: harness/build/phase-09a-…md,
harness/contracts/phase-09a-contract.md.

## Shape

- **Shared rules** (src/core/sync.ts):
  - `shouldApply` is last write wins: the newer `updatedAt` wins, and an exact tie goes to the
    larger device id.
  - `nextStamp` never goes backwards for an item.
  - The browser and the server import the same module.
- **Server** (functions/, Pages Functions):
  - One route, `POST /api/sync { deviceId, since, changes }`.
  - D1 table `sync_items` (primary key user + kind + id), plus a per-user sequence in `sync_seq`.
    `INSERT … RETURNING` makes each number unique even when two devices sync at once.
  - Migrations are idempotent and run on first use, so the user never runs SQL.
  - A deleted book also deletes its annotations on the server.
  - A device never gets its own changes back, but its cursor still moves past them.
  - Pages of 500.
  - Input validation: kinds, ids up to 200 characters, stamps, device match, at most 500 changes
    and 64 KB per item. Anything else gets 400.
- **Identity** (functions/_lib/auth.ts):
  - The Cloudflare Access token is verified with jose against
    `https://<ACCESS_TEAM_DOMAIN>/cdn-cgi/access/certs`, with issuer `https://<team>`, audience
    `ACCESS_AUD`, and the email as the user.
  - Dev mode (`AUTH_MODE=dev`) works only on localhost. There, an `x-dev-user` header picks the
    user, so each test gets its own data.
- **Local store** (schema v5):
  - `syncMeta` holds one row per item: stamp, deleted flag, device, pending.
  - It's written in the same transaction as every local write, and tombstones stay.
  - `syncState` holds the device id and cursor.
  - The v4 → v5 upgrade queues everything already stored for the first sync.
  - Book records, bookmarks, highlights and notes keep their shapes. `hasFile` is computed when
    listing.
  - Remote changes are applied in one transaction. They never become pending, and a remote book
    deletion cascades here too.
- **Engine** (src/sync/engine.ts):
  - Single-flight: a request during a running sync makes it run once more. One round pushes a
    batch, applies remote changes, marks the sent items synced (only if unchanged since) and moves
    the cursor.
  - Statuses: syncing, synced, offline, signed-out (Access redirect, 401 or 403), unavailable
    (404/405: no API, as in local previews; the status line is hidden), and failed.
- **When it syncs:**
  - The store wrapper (src/sync/triggering.ts) schedules a sync 2 s after any local write.
  - useSync syncs on start, on the `online` event and when the page becomes visible.
  - Sync now does it by hand.
  - `syncVersion` makes the open reader reload its bookmarks, highlights and notes after remote
    changes.
- **Remove from this device** drops only the file. The book record and annotations stay, so
  re-importing the PDF restores everything. **Delete everywhere** removes everything, everywhere.

## Testing

- The unit tests cover the server store on node:sqlite (functions/_lib/sqlite-test-db.ts), the
  auth checks (jose keys made in the test), the handler, the v4→v5 migration, and the engine with
  two real local stores against an in-memory server with the same rules.
- The e2e tests (e2e/sync/, playwright.sync.config.ts) build the app and run
  `wrangler pages dev` on port 8788 with local D1 (`--d1 DB=…`, `--binding AUTH_MODE=dev`).
  Two browser contexts per test act as two devices. **Each test's devices must be closed
  afterwards:** contexts left open kept syncing and rendering, and WebKit slowed to 30–50 s per
  test (found and fixed during the build).
- Each sync test was also run against a deliberate break: no UI refresh, no last-write-wins,
  ignoring remote deletions, removing from this device deleting everywhere, no back-online
  trigger, a wrong offline status. All were caught, after two tests were reordered or isolated so
  they really exercised the rule.

## Known

- Chromium first page in the perf benchmark is ~195 ms, up from ~172 before 09a. That's within
  the 250 ms budget, probably because the startup sync competes at launch. If it gets tight,
  start the first sync after the first page is drawn.
- WebKit p95 is still close to its 40 ms budget whenever the pre-existing ~2.4 s freeze lands in
  one of the three scrolls.
