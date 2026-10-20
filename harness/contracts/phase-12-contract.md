# Contract: Phase 12 Export highlights and notes

Agreed definition of done, written before any code. The author drafts it. The user or the
reviewing agent approves it. After approval, only append clearly marked amendments.

- Approved by: agent under the user's standing instruction of 2026-10-20 (Claude Code, cloud
  session). The plan's open question ("confirm the Markdown layout from a sample") is answered
  by the agent with the sample in harness/context/phase-12-export-annotations-context.md; the
  user confirms it later (harness/USER-CHECKLIST.md).

## Checkable items

| # | Behavior | How to verify | Result (filled in at review) |
|---|---|---|---|
| 1 | Export produces Markdown with the book title, each highlight's text and page, its attached note, and page notes | unit (exact output for fixture annotations) + e2e | |
| 2 | Output follows book order: by page, then by position on the page, page notes first; grouped under the chapter from the table of contents when the book has one | unit | |
| 3 | Highlighted text is escaped so it reads as written; notes are kept as typed | unit | |
| 4 | "Export highlights and notes" in the Notes panel downloads "<title> - highlights and notes.md" in a browser test | e2e (download event, file contents) | |
| 5 | Export is disabled with a visible reason while the book is not saved or annotations are loading | e2e + unit | |
| 6 | Speed budgets unchanged; `scripts/verify.sh` (cloud stand-in) passes; full CI on the branch is green | perf, local run, GitHub run URL | |
| 7 | User-checked: export from a real book on Mac and iPhone; the layout is what you want | User report | |

## Out of scope for this contract

- Other formats, importing annotations back, exporting all books at once.

## Amendments

(none)
