# Contract: Phase 17 Share excerpts

- Approved by: agent under the user's standing instruction of 2026-10-20 (Claude Code, cloud
  session). Judgment calls: harness/context/phase-17-share-excerpts-context.md.

## Checkable items

| # | Behavior | How to verify | Result (filled in at review) |
|---|---|---|---|
| 1 | Share on a highlight hands “the passage” and “— Title, page N” to the system share sheet | e2e (stand-in share) + unit | |
| 2 | Without a share sheet, the passage is copied to the clipboard and a confirmation shows | e2e | |
| 3 | Closing the share sheet is not treated as an error; a real failure shows a readable message | e2e + code | |
| 4 | Long passages are cut at a word with an ellipsis; white space is tidied | unit | |
| 5 | Speed budgets unchanged; verify (cloud stand-in) passes; full CI green | perf, local run, GitHub run URL | |
| 6 | User-checked: share a passage to Messages, Notes or a social app from iPhone and Mac | User report | |

## Amendments

(none)
