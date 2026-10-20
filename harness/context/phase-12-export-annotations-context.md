# Phase 12 context: export highlights and notes

Built under the user's standing instruction of 2026-10-20; every judgment call below was made by
the agent and can be revisited.

## The Markdown layout (agent's answer to "confirm the layout from a sample")

```markdown
# The Book Title

Highlights and notes from Book Reader, exported 2026-10-20: 3 highlights, 3 notes.

## Part One

### Page 1

**Page note:** Before the first chapter.

## Chapter 1

### Page 2

**Page note:** About page two.

> First, near the top.

> Second, lower on the page.

**Note:** Why the second?
Two lines.
```

## Judgment calls

- Sections follow the table of contents (the same chapter rule as bookmark labels, now shared as
  `chapterAt`); a book without one is grouped by page only.
- Page numbers are the PDF's physical pages (as everywhere in the app), not printed numbers.
- Highlighted text is escaped (`*`, `_`, `#`, `[`, `<` and similar), because it is the book's
  words; notes are kept as typed, so a note written in Markdown stays Markdown.
- A note whose highlight no longer exists is exported as a note on its page, not dropped.
- The file downloads through a temporary link. On iPhone and iPad, Safari shows it with Save to
  Files and Share; sharing to other apps directly is phase 17.
- The button lives in the Notes panel; it is disabled with a reason until the book is saved and
  its highlights and notes are loaded.
