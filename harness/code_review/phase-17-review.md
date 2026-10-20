# Phase 17 review: Share excerpts

- Reviewer: Claude Code (Opus 5.5, evaluator subagent, fresh context), 2026-10-20
- Branch: phase-17-share-excerpts at 8d7718b, worktree /home/user/book-reader-p17. The phase diff is
  `git diff 1adb7b7 8d7718b`.
- Inputs: harness/contracts/phase-17-contract.md, harness/build/phase-17-share-excerpts.md,
  harness/context/phase-17-share-excerpts-context.md, harness/EVALUATOR.md.

## Verdict: FAIL

Sharing works and handles failure well. The only blocker is item 5: the full CI run on this very
branch (39392502232) is red. The failure is in phase 16's WebKit listen test, which this branch
contains, and because of it CI sync and perf never ran.

## Environment

The same as phase 14's review:
- stand-in verify in this tree: lint, format, types OK; unit 354/354; e2e chromium 138 passed + 1
  environment failure (installability); sync 15/15
- perf alternated with p13 and p14
- `navigator.share` and `navigator.clipboard` replaced by recording stand-ins in the probes
- `excerptText` bundled with esbuild and run in Node

## Contract items

| # | Result | Evidence |
|---|---|---|
| 1 | PASS | e2e. Probe of a 5-line highlight: `{title: "text-4-pages", text: "“Alpha one: … foot of page one”\n— text-4-pages, page 1"}`, with line breaks turned into single spaces. Sharing from the keyboard (focus Share, Enter) also works. The actions close, and focus goes back to the pages. |
| 2 | PASS | e2e. Probe: the clipboard got the text, and the status read "Copied the passage to the clipboard.". It fades after 4 s (visibility hidden, out of the accessibility tree). A second share shows a fresh toast. |
| 3 | PASS | AbortError: no alert, no toast (e2e; a mutation that removes the AbortError check fails this test, reverted). NotAllowedError or TypeError from share falls back to the clipboard and copies. Share and clipboard both failing gives the alert "This passage couldn't be shared or copied here.". With neither available, you get the same alert. Each failure is logged with console.error. |
| 4 | PASS | Unit tests pass. Probe: 300 words become 1,017 characters in total, cut at a word and ending "word…”". 1,500 characters with no space are cut at 1,000 + "…". Exactly 1,000 characters: no ellipsis. Tabs, newlines, NBSP and U+2028 all fold into single spaces. An empty title gives "— page 5". |
| 5 | **FAIL** | Chromium perf unchanged (firstPageMs p17 439/417/401 against p13 414/433/418; p95 33.3 for all; maxCanvasMB 67.1). The stand-in verify is green. **Full CI 39392502232 at 8d7718b (https://github.com/himmannshu/book-reader/actions/runs/39392502232): failure**: 274 passed, 3 skipped, 1 failed (`[webkit] e2e/listen.spec.ts:96`). Sync and perf were not reached. |
| 6 | PENDING (user) | Messages and Notes from iPhone and Mac. |

## Rubric

| Criterion | Score | Threshold | Notes |
|---|---|---|---|
| Contract fidelity | 4 | 5 | Item 5 is red. Item 6 is pending. |
| Functionality | 4 | 4 | Every path works. |
| Robustness | 4 | 4 | Cancel is silent, real failures are readable and logged, and the fallback is sensible. |
| Code quality | 4 | 3 | Small pure core (src/core/share.ts) and a thin UI helper. |
| Test quality | 3 | 3 | Share, copy and cancel are covered, and the cancel test catches its mutation. The failure paths (share falls back, both fail) have no test. |
| Product depth | 3 | 3 | Text sharing only, as planned. |
| Design | 3 | 3 | Share sits among the highlight actions. The confirmation toast overlaps other bottom UI (N2). |

## Blockers

- **B1 (item 5) Full CI red** on this branch (phase 16's WebKit listen test; see
  /home/user/book-reader-p16/harness/code_review/phase-16-review.md B1). Perf and sync in CI never
  ran, so there is no WebKit perf evidence for any of phases 14–17.

## Non-blocking findings

- N1 Text with no spaces and astral characters can be cut in the middle of a surrogate pair:
  `'a' + '😀'×600` ends with a lone `\ud83d` before "…" (src/core/share.ts:16). Cut by code point.
- N2 The reader's "Copied…" toast and the app's "Saved on this device." toast use the same fixed
  bottom spot, so they stack on top of each other and cover phase 16's player bar and the phone
  search bar while they show.
- N3 The reader bar's Open PDF icon is the iOS share glyph (an arrow out of a tray), and now there
  is a real Share action. Users may tap Open PDF expecting Share.
- N4 The `role="status"` paragraph is inserted already holding its text. Some screen readers do
  not announce live regions added that way. A persistent, empty live region that gets its text
  would be more reliable. The same pattern is in App's notice.
- N5 The highlight action stack now has four buttons (see phase 14 N4).
- Process: harness/build-log.md has **no entry for phase 17** (nor for 15 and 16). features.json
  F-020 is correctly still failing.

## Appendix (author, 2026-10-20 13:20 UTC): findings addressed

- A long passage without spaces is cut by whole characters, never inside an emoji (unit test red first).
- CI: the red run (39392502232) failed on phase 16's listen test, fixed there and merged here; full CI rerun on
  this branch (see build log).
