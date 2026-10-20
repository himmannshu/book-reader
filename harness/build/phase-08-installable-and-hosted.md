# Phase 08: Installable and hosted

- Status: Complete with recorded exceptions (see contract Amendment 1: iPhone offline deferred)
- Branch: phase-08-installable-and-hosted
- Depends on: 03

## Objective

The app can be installed to the Mac Dock and the iPhone/iPad Home Screen, opens offline, and is hosted on Cloudflare Pages behind a personal login (Cloudflare Access).

## In scope

- Web app manifest and icons
- Service worker so the app shell opens offline
- Build output deployable to Cloudflare Pages
- Deploy instructions for the user

## Non-goals

- Moving books to the cloud (phase 09)
- Sign-up for other users

## Expected files or components touched

- public/ manifest and icons
- service worker
- deploy notes

## Decisions needing a human

- User creates the Cloudflare account, Pages project and Access policy
- Explicit go-ahead before every deploy

## Verification plan

- Red: Browser test expects a valid manifest and an offline reload of the shell; fails
- Green: Manifest + service worker
- Focused command: `npm run test:e2e -- pwa`
- Full command: `scripts/verify.sh`

## Acceptance criteria

Mirror these in harness/contracts/phase-08-contract.md as checkable items.

- Browser test: the app shell reloads while the network is offline
- The manifest is valid and the app is installable in Chromium
- User-checked: installed on iPhone or iPad from the hosted URL, and a stored book opens offline
- Hosted URL requires the personal login

## Risks and recovery

A buggy service worker can serve stale versions; include an update path. Deploying is an external write: ask first.

## Stop condition

Stop when every contract item has observed evidence in harness/build-log.md.
Do not start the next phase.
