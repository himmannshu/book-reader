# GOALS.md

What the project is trying to achieve. Outcomes only. No implementation steps, no progress.

## Purpose

Build my own book reader in the spirit of Kindle, for reading PDF books. It should feel fast
and pleasant to read in, and be something I can keep improving over time.

## Desired outcomes

- I can open a PDF book and read it natively, with no conversion step.
- I can bookmark places in a book and come back to them.
- I can highlight passages.
- I can attach notes to what I am reading.
- I can navigate a book through its table of contents.
- Reading feels fast: opening a book, turning pages, scrolling and jumping around all feel
  immediate, including in long books.
- The reader can grow. New features can be added later without rewriting what already exists.

## Success conditions

Things I could check by actually using it.

- I can read a real PDF book start to finish without the app getting in the way.
- My bookmarks, highlights and notes are still there when I close and reopen the book.
- I can find a chapter through the table of contents and jump straight to it.
- It never feels sluggish on the long books I actually read.

## Scope

- Reading PDF books.
- Bookmarks, highlights, notes and a table of contents as the core features.
- Platform: an installable web app that I use on my Mac, iPad and iPhone.
- My books and annotations reach my other devices through a cloud copy.
- After the core, in priority order: reading comfort (themes, zoom, resume where I left off),
  a library view, export of highlights and notes, then search inside a book.
- Built incrementally, one small working piece at a time.

## Non-goals

For now. Any of these can be revisited later.

- Formats other than PDF (EPUB may come later).
- A paginated, page-turning mode in the core. Continuous scroll comes first.
- Sign-up and accounts for other people. It is personal first.
- Real-time collaborative sync or complex merge logic.
- OCR for scanned books.
- Writing annotations back into the PDF file itself.
- A native Mac or iOS app.

## Constraints

- Developed incrementally with AI coding agents (Claude Code and Codex), switching between
  them depending on usage limits. Work must be resumable by either agent.
- Free cloud tiers to start. Pay only when and if needed.
- Technical stack and architecture: decided on 2026-10-18. See
  harness/context/architecture-decisions.md.

## Open questions

Resolved in the planning session on 2026-10-18. Answers and reasoning are in
harness/context/architecture-decisions.md.

- Platform: an installable web app (D1).
- Language, framework, PDF rendering: TypeScript, React and Vite, with PDF.js (D3, D4).
- Where data lives: on the device first, with Cloudflare as the cloud. Sync is added after
  the core (D5).
- Audience: me first, maybe others later (D5, D6).
- Formats: PDF only for now, EPUB maybe later (D6).
- Features after the core: see Scope above (D6).