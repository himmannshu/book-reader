# Phase 17 context: share excerpts

Built under the user's standing instruction of 2026-10-20; every judgment call below was made by
the agent and can be revisited.

## Judgment calls

- **Text, not pictures.** The Web Share API with `{ title, text }` reaches Messages, Mail, Notes
  and social apps on iPhone, iPad and Mac Safari. A picture card of the passage (as some readers
  make) would need image rendering and file sharing; left for later if wanted.
- **The text:** “the passage” (white space tidied, cut at a word with … over 1,000 characters),
  then "— Title, page N". The title is the book's name in the library. Page numbers are the PDF's
  physical pages, as everywhere in the app.
- **Fallback:** where there is no share sheet (Chrome and Firefox on desktop), the passage is
  copied to the clipboard and a short confirmation shows. Closing the share sheet is silent.
- **Where:** a Share button among a highlight's actions. Sharing a selection without highlighting
  it first is not offered (the plan says "a highlighted passage").
