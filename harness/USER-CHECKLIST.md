# Checklist for Himanshu

Things only you can check (real devices, the Cloudflare dashboard, merging). Written by the agent
during the autonomous run that started on 2026-10-20 and kept current per phase. Tick a box when
done; tell the next agent anything that looked wrong (or open a GitHub issue).

How to get the builds: every phase is pushed to its own branch, and Cloudflare Pages makes a
preview of each push. Open the Cloudflare dashboard → Workers & Pages → book-reader →
Deployments, and pick the newest preview for the branch (the URL looks like
`https://<hash>.book-reader-….pages.dev`). Branches stack: each one contains the phases before
it, so the newest branch has everything.

Nothing is merged into `main` (that would deploy production). You merge after checking.

## Free-tier guard rails the agent follows

- Cloudflare Pages: about one push per phase plus fixes (each push is one preview build; the free
  plan allows 500 builds a month). No new Cloudflare services, no dashboard changes, no paid
  plans.
- R2 and D1: the existing 9 GB cap on book files stays; voice notes (phase 15) count toward it and
  are small. Tests use local emulation only (`wrangler pages dev`), never the live cloud.
- GitHub Actions (private repo, about 2,000 free minutes a month): branch pushes run only the
  quick checks (about 2 minutes). The full suite (about 16–20 minutes) runs once per phase, at
  the end.
- Reading aloud (phase 16) uses the browser's built-in speech (`speechSynthesis`), on the device
  and free. Voice notes (phase 15) use `MediaRecorder`, on the device. No paid speech APIs.

Worth a glance anyway: Cloudflare dashboard → Billing (should show nothing), and GitHub →
Settings → Billing → Actions minutes used this month.

## Phase 10: Reading comfort (branch `phase-10-reading-comfort-k8v7pk`)

- [ ] Mac (Safari and the installed app): choose Theme → Dark, then Sepia, then Light. The pages
      and the app change; the installed app's title bar colour follows. Reload: the theme stays,
      with no white flash at start.
- [ ] iPhone (installed app): same theme check, including the status bar colour. The toolbar
      fits on screen (it may wrap to two lines).
- [ ] iPad: zoom with − and +, try Fit page and Fit width, and 200% (scroll sideways to both
      edges). Highlights stay on their text at every zoom.
- [ ] Real book: read somewhere in the middle, go back to the Library, reopen: same place and
      zoom. Close the app completely, reopen it, open the book: same place.
- [ ] Decide: is the default "Fit width" (a 900 px reading column on a wide Mac) right, or should
      it fill the window? Pinch-to-zoom is left for phase 14.

## Phase 11: Library view (branch `phase-11-library-view`)

- [ ] Mac, iPad, iPhone: the Library shows a shelf of covers (page 1 of each book) with the title
      and "Page N of M · P%" under it. Books you haven't opened since this update get their cover
      a moment after the Library appears (one at a time).
- [ ] Sort by Recent, Title and Progress; the choice is kept after a reload. Type in Filter to
      find a book by part of its title.
- [ ] A book that is only on another device shows a grey card with its title instead of a cover.
- [ ] With all your real books, the shelf feels quick to open and to filter.

## Phase 12: Export highlights and notes (branch `phase-12-export-annotations`)

- [ ] Mac: open a real book with highlights and notes → Notes → "Export highlights and notes".
      A file "<title> - highlights and notes.md" downloads. Open it: is this the layout you want?
      (Sample and choices: harness/context/phase-12-export-annotations-context.md.)
- [ ] iPhone (installed app): the same button; Safari should show the file with Save to Files /
      Share. Tell the agent if nothing happens (standalone apps on iOS can be picky here).

## Phase 13: Search inside a book (branch `phase-13-search-in-book`)

- [ ] Mac: open a real book, press Cmd+F (or the Search button), type a word you know is in it.
      Results list pages with the words around each match; clicking one jumps there with the
      word marked in orange. Next/Previous step through them.
- [ ] iPhone: the same with the Search button (the panel closes after choosing a result).
- [ ] Decide a speed budget for searching a whole book (`searchMs`). The benchmark book (600
      pages) takes about 2.7 s in the cloud machine; run `npm run test:perf` on the Mac to see
      yours, then tell the agent a number to put in e2e/perf/budgets.json.

## Phase 14: UI and UX design pass (branch `phase-14-ui-ux-design`)

- [ ] Mac: the reader has one quiet bar with icons (hover for names; at 1400 px and wider the
      names show). Does it feel calm and clear? Anything you miss from the old two-row layout?
- [ ] Mac trackpad: pinch in and out on the pages; the zoom steps (125%, 150%…) and the place
      stays. Try in Safari and in the installed app.
- [ ] iPad and iPhone: pinch with two fingers on the pages; it should zoom the book (not the whole
      app). All buttons are easy to tap. The Aa (Display) button holds theme and zoom on iPhone.
- [ ] iPhone: after a search, choose a result; a small bar at the bottom steps through matches.
- [ ] Any of the three themes: anything hard to read?

## Phase 15: Voice notes (branch `phase-15-voice-notes`)

- [ ] Mac, iPad, iPhone: Notes → "Record voice note on this page". Allow the microphone once.
      Speak, Stop and save; play it back in the Notes panel. Reload: still there.
- [ ] Tap a highlight → "Voice note": the note lists with the highlighted words.
- [ ] Decide: should voice notes reach your other devices? (They stay on the device that recorded
      them for now. Syncing would store the audio in R2, a few MB per note, within the 9 GB cap.)

## Phase 16: Listen to a book (branch `phase-16-listen-to-book`)

- [ ] Mac, iPad, iPhone: open a real book in the middle, press Listen (speaker icon). It reads from
      the top of the window, the sentence is marked in blue, and the view follows to later pages.
- [ ] Pause and Resume (it repeats the sentence it was on), Stop, and the speed menu.
- [ ] iPhone: does it keep reading with the screen locked? (Safari may stop; tell the agent.)
- [ ] Is the default voice fine, or would you like to choose one?

## Phase 17: Share excerpts (branch `phase-17-share-excerpts`)

- [ ] iPhone and Mac Safari: tap a highlight → Share. The share sheet opens with “the passage”
      and "— Title, page N". Send it to Messages or Notes.
- [ ] Chrome on the Mac: Share copies the passage instead and says so.
- [ ] Would you like a picture card of the passage (for Instagram-style sharing)? Not built yet.

## Phase 18: Design foundations (branch `phase-18-design-foundations`)

The look changes; the layout does not (the new toolbar, panels and library come in 19–23).

- [ ] Open the branch preview on the Mac, iPad and iPhone. In Light, Sepia and Dark, compare the
      library, the reader and a panel with your Claude Design system: colours, the two fonts
      (Literata for titles, Source Sans 3 for the interface), the icons, the round toolbar buttons.
- [ ] Sepia pages are lighter than before (the design's tint is softer). Is that what you want?
- [ ] Turn on airplane mode, reopen the installed app: titles are still in Literata.
- [ ] Messages now show at the bottom ("Saved on this device." and the like) and leave after
      about 4 s. Errors (try opening a file that isn't a PDF) stay until you tap the close button.
- [ ] Keyboard on the Mac: press Tab through the toolbar; each control shows a blue ring.
- [ ] With Reduce motion on (System Settings → Accessibility → Display), nothing slides or pulses.

## Phase 19: Reader chrome (branch `phase-19-reader-chrome`)

The reader gets the designed toolbar, Reading settings (Aa) and a page pill.

Checked by the user on 2026-10-20: "Did the manual verification, looks good to me". No changes asked for
on the two questions below (Open PDF in the library only; the icon-only sync badge on iPhone).

- [x] Mac, iPad and iPhone: open a book. The toolbar reads Library, Contents, Bookmarks, Notes | title and
      chapter | Search, Listen, Aa, Bookmark. On iPhone, Contents, Bookmarks, Notes and Search are under More (…).
- [x] Scroll with a finger or the trackpad: the toolbar fades. Tap the page or where the bar was: it comes back.
      It stays while a panel, Reading settings or the highlight menu is open.
- [x] Aa: switch Light, Sepia and Dark (pages and chrome change together); zoom in and out; Fit Width, Page and
      Custom. On iPhone it rises from the bottom; check it clears the home indicator.
- [x] The page pill ("Page 12 of 300 · 4%") shows while scrolling or jumping and fades a second later. A book with
      roman-numbered front pages shows "Page iv".
- [x] Open PDF is now only in the library. Is that fine while reading?
- [x] iPhone: when sync needs you (signed out, offline), the toolbar shows only an icon (no room for words; the
      library shows the full line with Retry). Should tapping it explain (phase 20 could add that)?

## Phase 20: Panels and sheets (branch `phase-20-panels-and-sheets`)

Contents, Bookmarks and Notes become tabs of one panel; Search has its own. On Mac and iPad the panel
sits on the right; on iPhone it rises from the bottom.

Checked by the user on 2026-10-21: "did the manual check, looks good". No change asked for on the two ×
buttons in the search sheet.

- [x] Mac and iPad: Contents (toolbar) opens the panel on the right; the tabs show Bookmarks and Notes
      with their counts; the page stays readable beside it; Close or Escape shuts it.
- [x] iPhone: More → Contents rises as a sheet over a dimmed page. Close it by dragging the grabber down,
      tapping the dimmed part, or Close. Check that its bottom clears Safari's bar and the home indicator.
- [x] Contents: chapters fold and unfold with the chevron; page numbers on the right (a book with roman
      front pages shows "iv"); the chapter you are in is highlighted when you open it.
- [x] Search (Cmd+F on the Mac): the count and up/down arrows sit in the field; results show "p. 12 ·
      chapter". On iPhone, are the field's clear × and the sheet's close × too close together?
- [x] Notes and Bookmarks rows show the page and the chapter; editing and deleting work, also on iPhone
      (the "Delete note?" question appears above the sheet).

## Phase 21: Highlight colours (branch `phase-21-highlight-colours`)

Highlights come in four colours (yellow, green, blue, pink), and the menu over a selection becomes the
design's highlight menu. The Notes tab now lists every highlight. Preview: the push of 2026-10-21
(full CI green, run 39664582126).

- [ ] Mac, iPad and iPhone: select a few words. The menu shows four colour dots, then Add note, Copy,
      Share and Listen from here. It sits above the words (below them near the top of the screen) and
      never covers them. Tap a colour: the words fill in that colour and the menu stays.
- [ ] iPhone and iPad, with a thumb: drag the selection handles while the menu shows; the menu follows
      and every button stays on screen and easy to hit. On iPhone the menu may fold into two rows.
- [ ] Tap an existing highlight: its colour is ringed; tap another colour to change it. Remove highlight
      takes it away. Reload: the colours are kept.
- [ ] Light, Sepia and Dark (Aa): each colour reads well on the page and the text stays legible.
- [ ] Copy pastes the passage elsewhere; Share opens the share sheet with the title and page; Listen from
      here starts reading at the start of that sentence (also for a passage that runs onto the next page).
- [ ] Notes tab: every highlight is listed with its colour behind the passage and its note if it has one,
      in book order with the page notes. Each row's More (…) has Edit note, Change colour, Share, Copy,
      Delete, and they work. On iPad portrait with the panel open, the highlight menu stays over the page.
- [ ] Two devices signed in: change a highlight's colour on one; after a sync it shows on the other.
- [ ] Export (Markdown) names each highlight's colour under its passage, for example "*Green highlight*".
- [ ] Questions: (a) Add note on a fresh selection, then Cancel, keeps a yellow highlight with no note. Fine,
      or should Cancel remove it? (b) A bookmark row's More (…) holds only Remove bookmark. Enough? (c)
      Rotating the device with the menu open over a highlight closes the menu (as scrolling does); tap the
      highlight to reopen it. Fine?

## Phase 22: Library shelf redesign (branch `phase-22-library-shelf`)

The library becomes the designed shelf: a big "Library" heading, filter chips with counts, Sort and
Grid/List controls, and a card per book with its author and one status badge. Pushed 2026-10-21: its
preview is in the Cloudflare dashboard.

- [ ] Mac, iPad and iPhone: the shelf shows covers at a book's shape (2:3) with the title under them, the
      author when the PDF has one, and either a progress bar or one badge (New, Finished, In cloud,
      Downloading). On iPhone, three covers a row.
- [ ] A book whose cover has not been drawn yet shows a plain cover with its title and an accent band.
- [ ] Chips: All, Reading, Unread, Finished (and In cloud when a book is only in the cloud) with counts;
      tapping one shows only those books. The title filter still works with them.
- [ ] Grid and List: switch to List, reload: it stays List. Rows show a small cover with the text beside it.
- [ ] A card's More (…) offers Remove from this device and Delete everywhere; each asks in the card first.
      On iPhone, the menu of a card on the left stays on screen.
- [ ] Remove every book: the empty library says how to add one.
- [ ] Your real books: does the author look right? (It comes from the PDF's own metadata, which some PDFs
      fill badly; the title still comes from the file name.)

## Phase 23: Listen bar and voice notes (branch `phase-23-listen-bar-voice-notes`)

Reading aloud gets the designed floating bar; voice notes get the designed strip with a waveform. Pushed
2026-10-21: its preview is in the Cloudflare dashboard.

- [ ] Listen (headphones in the toolbar): a bar floats at the bottom with "Reading aloud", the page and chapter,
      previous sentence, a big play/pause, next sentence, the speed (1×) and ×. On iPhone only the controls show.
- [ ] Next and previous sentence jump by one sentence, also onto the next or previous page; while paused they move
      the highlighted sentence, and play continues from there.
- [ ] The speed button steps 1× → 1.25× → 1.5× → 2× → 0.75× and the voice changes speed at once.
- [ ] Record a voice note (Notes panel, or Add note → Record voice note in the note editor, for a page or a
      highlight): a pink strip says Recording, where, and the time, with Stop and Cancel.
- [ ] A voice note row shows a play button, a waveform of what you said, and its length; playing fills the
      waveform as it goes and shows "0:02 / 0:05". Pause stops it.
- [ ] The menu over a selection no longer has Voice note. Is recording from the note editor easy enough?

<!-- Later phases append their sections below. -->
