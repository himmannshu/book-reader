# Contract: Phase 07 Notes

Agreed definition of done, written before any application code. The author drafts it. The user or
the reviewing agent approves it. After approval, only append clearly marked amendments.

- Approved by: **Pending — draft for the user's review, 2026-10-19.**

## Proposed interaction defaults

- One editable plain-text note per highlight or page. Different highlights on a page may each
  have their own note, alongside that page's note.
- Click/tap an existing highlight and choose Add note (or Edit note). For a page note, open Notes
  and choose Add note to this page, using the same current-page definition as Bookmark page.
- The Notes panel contains the editor, with explicit Save and Cancel. Creating a highlight from
  a fresh selection continues to use the existing Highlight action.
- Deleting a note asks for confirmation. Removing a highlight with a note explicitly asks whether
  to remove both; cancelling keeps both. A successful note deletion by itself keeps its highlight.
- Navigation that would abandon changed text asks whether to discard it. Cancel is an explicit
  discard action. Recovering unsaved text after browser reload/termination is out of scope.

These defaults need approval with this contract; only the established architecture and support
for both highlight and page notes have already been confirmed by the user.

## Checkable items

Browser checks run in Chromium and WebKit against generated fixtures. Touch coverage additionally
uses iPhone and iPad profiles with actual tap events; a physical-device check is item 18.

| # | Behavior | How to verify | Result (filled in at review) |
|---|---|---|---|
| 1 | Clicking/tapping an existing highlight offers Add note; saving text attaches a note to that highlight, with its quote and page identified in Notes | e2e, including a multi-line highlight | |
| 2 | Add note to this page saves a page note without requiring a text selection; it attaches to the same current page that Bookmark page would use | e2e, including a page without selectable text | |
| 3 | There is at most one note per highlight and one page note per page; reopening the same target edits its note, and repeated Save activations during a pending write create no duplicates | e2e + unit with a pending write | |
| 4 | Saved notes preserve multiline text and Unicode. Whitespace-only text cannot be saved; saving empty text over an existing note neither deletes nor changes it | e2e + core unit | |
| 5 | Cancel on a new draft creates nothing; Cancel while editing keeps the saved text. Saving an edit updates the note shown in Notes | e2e | |
| 6 | Highlight notes, page notes and saved edits survive reload and reopening the book from Library; another book shows only its own notes | e2e, both target types and two books | |
| 7 | Notes lists the book's notes in page/passage order with page numbers and highlight quotes where applicable; empty, loading and failed states have readable text | e2e + unit | |
| 8 | Choosing a page note brings that page into view; choosing a highlight note brings its first passage box into view, including a passage near the foot of a page or spanning pages. A narrow Notes panel closes on the jump and the pages receive keyboard focus | e2e, wide/narrow layouts | |
| 9 | Confirming Delete note removes it permanently; cancelling removes nothing. Deleting a highlight note leaves its highlight. Removal stays effective after reopening | e2e | |
| 10 | Removing a highlight with an attached note asks explicitly to remove both. Confirm removes both, Cancel keeps both, and a storage failure leaves both intact. Other notes remain unchanged | e2e + storage transaction unit | |
| 11 | Removing a book from Library deletes all its notes of both target types along with its existing annotations; importing it again starts without notes | e2e + storage unit | |
| 12 | Closing/switching panels, choosing another note, returning to Library or opening another book cannot silently discard changed text: discard confirmation allows either continuing or keeping the editor and its text | e2e + UI unit | |
| 13 | For an unsaved book, note creation is disabled with a visible reason; notes cannot be changed while loading or after a load failure. Failed save/delete actions show readable errors, retain typed/saved content as appropriate, and allow retry | e2e + UI/storage unit with injected failures | |
| 14 | Adding note storage preserves existing version-3 books, PDF bytes, bookmarks and highlights. Notes store a page/highlight association rather than screen-pixel anchors; validation, ordering and deletion behavior have unit coverage | storage/core unit; browser reads stored records | |
| 15 | Keyboard users can open Notes, edit multiline text, Save/Cancel, confirm/cancel deletion and jump without losing focus. Enter in the textarea inserts a newline. iPhone/iPad touch flows can add, edit, delete and jump to both kinds of note | e2e keyboard and touch contexts | |
| 16 | Existing reading, bookmarks and highlights remain working; both browsers' local first-page, jump, scroll and canvas-memory budgets still pass unchanged | `scripts/verify.sh`, including existing browser/perf suites | |
| 17 | `scripts/verify.sh` passes locally and CI is green on the Phase 07 implementation | Local result; GitHub run URL (push separately authorized) | |
| 18 | User checks a real book: create both kinds of note, edit, reopen, jump and delete; check on an iPhone/iPad too if possible | User report | |

## Out of scope for this contract

- Platform/framework/renderer/storage-strategy changes
- Rich text, Markdown rendering, handwriting, tags or note search
- Multiple separate notes on the same individual highlight or whole-page target
- Autosave and recovering unsaved drafts after browser reload/termination
- A standalone highlights list, highlight colors or editing a highlight's selected extent
- Export (phase 12), cloud sync (phase 09), OCR or writing annotations into the PDF itself

## Amendments

(none)

### Amendment 01 — approval record (2026-10-19)

Approved by Himanshu (user): "Approved!" in response to the Phase 07 plan, interaction defaults
and this contract. This supersedes the draft/pending approval wording above. All behaviors and
scope are approved unchanged.
