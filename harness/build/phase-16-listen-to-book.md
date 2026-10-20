# Phase 16: Listen to a book

- Status: In progress
- Branch: phase-16-listen-to-book
- Depends on: 01

## Objective

The book is read aloud from where I am; the spoken text is followed on the page; I can pause and
resume.

## In scope

- Read aloud with the browser's speech (Web Speech API `speechSynthesis`, on the device, free)
- Start from the place at the top of the window; go on page after page to the end
- Mark the sentence being spoken on the page and keep it in view
- Pause, resume, stop, speed

## Non-goals

- Choosing voices (the browser's default for the page's language is used)
- Downloadable audio, cloud voices

## Plan (2026-10-20)

Approved by: agent under the user's standing instruction of 2026-10-20. Stacked on phase 15's
branch. Sentence splitting in src/core (unit tests first); viewer marks the spoken sentence
(sharing the search marking code); speech wrapper and hook; Listen button and player bar; e2e with
a stand-in speech engine.

## Verification plan

- Focused command: `npm run test:e2e -- listen`
- Full command: `scripts/verify.sh`

## Stop condition

Stop when every contract item has observed evidence in harness/build-log.md.
