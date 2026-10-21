# Phase 22 context: Library shelf redesign

Judgment calls made under the user's standing instruction of 2026-10-21 (no approval round).

1. **Where the author comes from.** The PDF's Info dictionary Author, else the XMP `dc:creator`, read on
   the device when the cover is drawn and kept in the cover record. Covers are already local and never
   synced, so neither the server, D1 nor the sync rules change. A book only in the cloud shows no author
   until it is downloaded (it has no cover either). Rejected: adding `author` to the synced book record
   (a server and sync change for a display detail).
2. **Old covers.** A cover record without an `author` field was drawn before this phase; the background
   cover worker draws it again once, reading the author. `author: null` means "read, none found".
3. **The open button keeps the title as its name.** The design's cover button is named "Open <title>";
   here the button holds the cover and the title and is named by the title, as before. Dozens of specs
   open books by title, and a button named by what it opens reads well.
4. **Confirmations stay in the card.** Remove from this device and Delete everywhere are More menu items;
   choosing one asks in the card ("Remove from this device?" with that button and Cancel) before acting.
5. **Empty state has no action button.** A second "Open PDF" file input would duplicate the header's (and
   its label); the sentence points at Open PDF instead. The design allows "at most one action".
6. **Rows only in List view.** The design mentions rows for narrow phones too; at 320 px the grid still
   fits three covers, so the view is the reader's choice at every width.
7. **New means not started.** A book still on page 1 (opening saves its place) counts as not started, as
   the shelf already did ("Not started"); Finished means the last page was reached.
8. **Kept from phase 11:** the title filter field (styled as the design's search field) and the sort.
