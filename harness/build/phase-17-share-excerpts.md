# Phase 17: Share excerpts

- Status: In progress
- Branch: phase-17-share-excerpts
- Depends on: 06

## Objective

Share a highlighted passage, with the book's title, to social media or another app.

## In scope

- A Share action on a highlight
- The system share sheet (Web Share API) where the browser has one; a copy to the clipboard
  otherwise, with a confirmation

## Non-goals

- Picture cards of a passage, posting directly to a social network

## Plan (2026-10-20)

Approved by: agent under the user's standing instruction of 2026-10-20. Stacked on phase 16's
branch. Share text in src/core (unit tests first); share helper; highlight action; e2e with
stand-in share sheet and clipboard.

## Verification plan

- Focused command: `npm run test:e2e -- share`
- Full command: `scripts/verify.sh`

## Stop condition

Stop when every contract item has observed evidence in harness/build-log.md.
