# Test-suite trim (2026-10-20)

Asked by the user ("review the test suite, and see if there are unnecessary bloated tests"), then
approved as proposed: trim, and change how the tests run, on a separate branch (`test-suite-trim`,
stacked on phase 18). Two read-only audits (browser tests; unit and sync tests) found the suite
fairly lean; the cost was mostly in how CI ran it (one worker on a 2-core runner, WebKit on Linux
about 10 of 16 minutes, jsdom built for 44 files).

## What changed

- **CI:** the full run is two parallel jobs, `verify (chromium)` and `verify (webkit)`, each running
  `scripts/verify.sh` with `VERIFY_BROWSER` set. Lint, format, types and unit tests run once, in the
  chromium job. The wait is about the WebKit half; Actions minutes stay about the same (each job has
  ~1.5 min of setup). Artifacts are named per engine. Locally, `scripts/verify.sh` without the
  variable still runs everything, as before.
- **Unit tests:** Node is the default environment; jsdom (and the React Testing Library setup) only
  for `src/ui/**/*.test.tsx`, `src/viewer/viewer.test.ts` and `src/ui/recorder.test.ts`. Local unit run
  14 s → 7.5 s.
- **Removed browser tests** (each fully covered by another browser test, checked by reading both):
  - `app-shell.spec.ts` (the offline shell test checks the same heading)
  - pwa "after the first load a service worker controls the app" (both offline tests do it)
  - bookmarks: "marks it and lists it with its chapter", "the toggle follows the page in view",
    "choosing a bookmark brings its page to the top", "a book without an outline names bookmarks by
    page alone" (covered by "listed in page order", `bookmarkPage()`'s own checks and the thin-pages
    jump test), and the narrow-window panel test (the same panel code is tested in contents.spec)
  - notes: "page notes save multiline text and survive reopening" (covered by the one-note-per-target
    test) and "an existing highlight accepts a passage note" (covered by the different-highlights test)
  - highlights "removing a book deletes its highlights" (the notes cascade test checks highlights too)
  - library "importing the same file twice keeps one entry" (store unit test; the same hash path runs
    in comfort.spec)
- **Moved to unit tests:** notes "save/delete failures…" (save half was in useNotes.test; a new test
  covers the failed delete and its retry), "a failed notes load… Retry" (new useNotes test; a
  mutation that breaks Retry fails it), "an unsaved book cannot create notes" (useNotes and App tests).
- **Toasts:** the leave-after-4 s and failure-stays checks read the CSS animation (name, delay, fill)
  instead of waiting 4.5 s and 6 s.
- **Tags:** `@any-engine` (Chromium only): contrast ×3, ctrl+wheel, the manifest, timing marks, three
  contents tests, shelf sort and filter, three read-aloud tests with a stand-in engine, export's
  disabled reason, the notes navigation guards, Highlight's disabled reason; in the sync suite,
  "reading never waits for sync", the interrupted upload and the full cloud. `@touch-device`
  (WebKit only): the iPhone and iPad describes in design, highlights and notes.
- **Kept on purpose:** every test that guards a review finding; the share tests (Safari's clipboard
  differs); the small unit "duplicates" (milliseconds each, and each checks one thing the other
  doesn't); the one weak line in handler.test.ts was removed (it accepted 401 or 500).

## Effect

- Browser runs per full pass: 304 → 252; sync 30 → 27; two fixed waits gone.
- CI full run (39483921300): wall 23.5 → 12.0 min; chromium job 7.5 min, webkit job 12.0 min (incl. a one-time
  browser download); Actions minutes ≈ 23.5 → 19.5.
- Found on the way: WebKit can hang on `serviceWorker.ready`; offline tests share `loadControlled` in
  e2e/helpers.ts, which polls for an activated worker.
- Not done: two Playwright workers in CI (timing tests such as the 100-book shelf may flake on two
  cores; try later if wanted), merging the overlapping two-device sync tests.
