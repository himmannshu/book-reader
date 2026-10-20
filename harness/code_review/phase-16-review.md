# Phase 16 review: Listen to a book

- Reviewer: Claude Code (Opus 5.5, evaluator subagent, fresh context), 2026-10-20
- Branch: phase-16-listen-to-book at 1adb7b7. Reviewed in /home/user/book-reader-p17 (8d7718b, which
  contains it). The phase diff is `git diff 55f70ea 1adb7b7`.
- Inputs: harness/contracts/phase-16-contract.md, harness/build/phase-16-listen-to-book.md,
  harness/context/phase-16-listen-to-book-context.md, harness/EVALUATOR.md.

## Verdict: FAIL

The feature behaves well in Chromium with a stand-in speech engine:
- it reads from the right place and follows across pages
- pause, resume, stop and speed work
- it is silent when the reader closes or the book changes
- it coexists with search marks

But this phase's own e2e test failed on WebKit in the only full CI run (39392502232), on both
attempts. That makes item 7 red, and it kept sync and perf from running in CI.

## Environment

The same as phase 14's review:
- Chromium only, stand-in verify green apart from the environment test; full CI red
- Stand-in speech: speechSynthesis and SpeechSynthesisUtterance replaced by a recorder. Each
  piece "lasts" 150–1500 ms, it can fail on demand, and `cancel()` fires `interrupted`.
- Sentence splitting: src/core/read-aloud.ts bundled with esbuild into the scratchpad and run on
  prose samples.

## Contract items

| # | Result | Evidence |
|---|---|---|
| 1 | PASS | On text-4-pages, all 10 pieces are spoken in order across 4 pages, then the bar goes away by itself. Start position: with half of page 2 above the window, the first piece was "Echo five: page two starts its own paragraph here." and the bar read "Reading page 2". The e2e "starts from where I am" passes. |
| 2 | PASS | With realistic 1.5 s pieces, samples every 40 ms show the mark (`.spoken-hit`) on the right page and inside the window for every piece on pages 1–4. At 150 ms per piece the mark is sometimes missing on pages 3–4, because the text layer is not ready yet. Real speech is slower. |
| 3 | PASS | Paused: "Paused on page 1", nothing spoken for 500 ms, the mark kept. Resume repeats the paused sentence. Stop and pressing Listen again both clear the bar and the marks. Focus stays on the swapped Pause/Resume button. |
| 4 | PASS | A speed change while reading restarts the current sentence at the new rate (e2e: 1.5). A change to 2× while paused speaks nothing, and Resume then speaks at rate 2. |
| 5 | PASS | e2e: "Listening isn't available in this browser." Also, a speech-engine error (`synthesis-failed`) gives the alert "The book couldn't be read aloud. Try again." and the bar closes. |
| 6 | PASS | Unit tests pass. The probe split the listed cases sensibly: Mr./Dr./initials "J. R. R.", 3.30 and $4.50, i.e./p.m./approx./Ph.D., lines wrapped inside a sentence, a blank line after a heading, a 700-character run with no spaces cut at 280/280/140, and a Dickens sentence cut at commas (256/216/137). Every piece is ≤ 280. Weaker cases are listed under N1. |
| 7 | **FAIL** | No overflow at 320 px with the new button. Every bar control is 44 × 44 and the player bar fits (screenshot). Chromium perf is unchanged (p17 firstPage 439/417/401 against p13 414/433/418; p95 33.3 for both). **Full CI 39392502232 failed on `[webkit] e2e/listen.spec.ts:96` "pause keeps the place…"** on both attempts. The click on "Stop reading" timed out: the element was "not stable", then "detached". |
| 8 | PENDING (user) | Real voices, iPhone screen lock. |

## Rubric

| Criterion | Score | Threshold | Notes |
|---|---|---|---|
| Contract fidelity | 4 | 5 | Item 7 is red on this phase's own test. Item 8 is pending. |
| Functionality | 4 | 4 | Solid. A book with no text gets no feedback (N3). |
| Robustness | 4 | 4 | Errors are reported. Runs are cancelled by an id, which handles close, book change and pause. |
| Code quality | 4 | 3 | The viewer's marking code is shared with search cleanly (`#textLayerMatches`, `#boxes`, `#layer`). |
| Test quality | 3 | 3 | It covers the main flows, but the pause test is racy on slow WebKit (B1). No test checks that speech stops when the reader closes: a mutation that removed `speaker.stop()` from the unmount effect left listen e2e green (reverted). |
| Product depth | 4 | 3 | It follows the page, has a speed menu and a resume point. |
| Design | 3 | 3 | Neat bottom player bar. Its buttons move when the status text changes, and the toast covers it (N4, N5). |

## Blockers

- **B1 (item 7) WebKit CI failure in e2e/listen.spec.ts:96.** After Resume the test waits for
  `atPause.length + 1` pieces and then clicks Stop. text-4-pages has only 10 pieces of 150 ms. On
  CI's slow WebKit the Stop button was "not stable", because the centred bar moves when its status
  text changes width ("Reading page 1" ↔ "Paused on page 1": buttons move 8 px; measured
  Pause@622 → Resume@630 at 1280). Before Playwright could click, the book had ended and the bar
  was detached. Make the test independent of the book ending (longer stand-in pieces, or a manual
  "end" in the fake), and give the status a fixed width so the buttons stay put. Then get a full CI
  run that reaches sync and perf.

## Non-blocking findings

- N1 Splitting weaknesses, all on realistic prose:
  - A sentence that runs over a page break becomes two utterances ("…foot of page one" | "and
    Juliet ten…"), with a pause and a sentence-final tone in between. In real books that happens on
    almost every page.
  - Dialogue `"Are you coming?" she asked.` becomes two pieces.
  - "The U.S. | Army was there."
  - "Fri. | the 5th."
  - Numbered lists split as "1." | "First item\n2.".
  - "hyphen-\nated" is spoken as two words.
  - CJK "。" is not a sentence end.
  - French « Bonjour ! » is split before the closing guillemet.
- N2 While listening, scrolling away is undone: I scrolled to page 4 while page 1 was being read,
  and 1.5 s later the view was back at the top (scrollTop 24). You cannot glance elsewhere while
  listening. That may be intended ("followed"), but it should be a user decision.
- N3 A book with no text (no-text-1-page): Listen does nothing visible. No bar, no message, nothing
  spoken. Say "This book has no text to read aloud."
- N4 The "Saved on this device." toast (and phase 17's "Copied…") sits at the same bottom centre and
  covers the player bar for about 4 s (shots listen-320/listen-1280).
- N5 The Pause/Resume and Stop buttons move when the status text changes (see B1). A double tap
  can hit Stop or Speed.
- N6 iOS risk for the device check: `start()` awaits `pageText` (a worker round trip) before the
  first `speechSynthesis.speak`. iOS Safari may need the first utterance inside the user gesture.
- Process: harness/build-log.md has **no entry for phase 16**. features.json F-019 is correctly
  still failing.

## Appendix (author, 2026-10-20 13:10 UTC): findings addressed

- CI failure (pause/resume test racing the end of the short book): the stand-in speech engine takes a per-test
  length; that test uses 600 ms pieces. 15/15 over three repeats in Chromium; WebKit in the next phase 17 CI run.
- The player's status has a fixed width, so its buttons no longer move when it changes (the "unstable" Stop).
- The "Saved on this device." toast sits at the top now, clear of the player and search bars.
- A book (or the rest of a book) without text says "There is no text to read aloud from here." (e2e).
- Not changed: a sentence across a page break is read as two pieces; dialogue tags after "?" start a new piece;
  scrolling away while listening is pulled back to the spoken sentence (the view follows, by design).
