# Phase 07 context: notes

## Associations and storage

- A note has a typed page/highlight target and a deterministic id derived from the book and target.
  One target therefore has one editable note, including during repeated save activations.
- Highlight notes reference the existing highlight; quote and PDF-point rectangles remain in that
  record. Page notes require only a page index, so image-only pages work without OCR. No screen pixels.
- Schema v4 adds notes without rewriting books, bytes, bookmarks or highlights. Book removal deletes
  its notes; highlight removal deletes its note in the same transaction. Writes validate the parent
  book/highlight in that transaction to avoid orphan records after another tab removes an annotation.
- Save/delete cascades explicitly abort if any request fails, preserving existing data atomically.

## Drafts and navigation

- Save is explicit; plain text preserves line breaks and Unicode. Blank text is invalid rather than
  an implicit delete. Save failures keep the editor text; deletion is a separate confirmed action.
- A reader navigation guard handles panel/note changes and is exposed to App for Library/file-open
  transitions. It asks before dropping changed text; loading or failed writes never silently discard it.
- A note jump resolves the highlight's first PDF rectangle through the viewer, rather than assuming
  its page top is close enough to the passage. No new work is added to idle scrolling.

No cloud, platform or rendering changes. The approved contract and D7–D9 govern scope.
