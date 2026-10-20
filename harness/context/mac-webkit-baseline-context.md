# Mac WebKit baseline (2026-10-20)

The first local session after the cloud run (phases 10–18) ran `scripts/verify.sh` on main
(fea67a5) on the user's Mac (macOS 26.6, 8 cores, Playwright 1.64.1). Lint, format, types, unit and
every Chromium browser test passed; 9 WebKit browser tests failed, so sync and perf never ran. The
cloud container could not run WebKit, and CI runs WebKit on Linux, so this was the first WebKit run
on macOS. The user asked to fix them on a branch (`mac-webkit-baseline`, from main) before phase 19.

Each cause was found by a probe (a temporary spec, deleted afterwards) before anything changed.

## Causes and fixes

- **Voice notes (4 tests): a test stand-in, not the app.** The fake microphone was set as a property
  on `navigator.mediaDevices`. macOS WebKit can garbage-collect that wrapper object when nothing holds
  it, and a fresh wrapper without the property comes back, so the app called the real
  `getUserMedia` and got "denied". Probe: with no reference kept, the native function was back after
  an allocation burst in 3 of 3 runs; with a reference kept, the fake stayed in 3 of 3. Fix: the
  stand-ins go on `MediaDevices.prototype`. No other spec patches a browser object this way.
- **Export file name (1 test): a test expectation.** The test expected Playwright WebKit to turn
  spaces in download names into underscores. That is the Linux build; on macOS it keeps the spaces,
  as Safari does. Fix: WebKit accepts either form; Chromium still needs the exact name. The app's
  name itself is covered by `src/core/export.test.ts`.
- **Fonts offline (1 test): a test that loaded the page twice.** The spec's `beforeEach` loads `/`,
  then `loadControlled` loaded `/` again while the service worker was still installing. In WebKit
  that can leave the install stuck for good (never activates). Probe: loading twice failed 2 of 25
  runs in parallel and every time when run after other tests on one worker; loading once failed 0 of
  25. A first attempt (a browser of its own per test) still failed once in a full WebKit run and was
  reverted. Fix: `loadControlled` only loads the app when the page is blank, so it never navigates
  before activation. Serial font group then 27 of 27; three full WebKit runs clean for it.
  Not checked on a device: whether a real Safari reload during the first install leaves the worker
  stuck the same way. A later launch registers again, so the worst case is no offline use until then.
- **44 px targets on iPhone and iPad (2 tests): a real Mac Safari bug.** The Theme, Zoom and Sort
  pickers are native selects. macOS WebKit draws them as a fixed 27 px popup button and overrides
  `min-height` (computed 18 px) for `appearance: auto` and `menulist-button`; with
  `appearance: none` it honours the size. Chromium honours it in every mode, as does Linux WebKit.
  Playwright's iPhone and iPad emulation on a Mac draws Mac controls, so only this machine failed.
  On a real Mac the pickers were 27 px against the 40 px buttons beside them. Fix: `.picker` is
  drawn by the app (`appearance: none`, a chevron of two gradient triangles in `ink-muted`, extra
  right padding). Checked in Light and Dark; the reader's toolbar height is unchanged (57 px at
  1280 × 360) and the Theme picker is 6 px wider. Phases 19, 22 and 23 replace these pickers.
- **Highlight menu near the bottom (Chromium, found by the second verify): a test race, also on
  main.** "Note actions remain fully reachable for a highlight near the reader bottom" failed in
  both full verifies on the branch and in 3 of 3 serial runs of notes.spec.ts on main (it passed
  in main's first verify by chance). The test set `scrollTop`, its geometry poll passed at once,
  and it clicked the highlight before the `scroll` event arrived a frame later. The highlight hook
  closes "Remove highlight" on scroll, by design, so the menu opened and closed again (a probe saw
  the click land with the selection collapsed and the page drawn, then no menu). A warm worker is
  fast enough to beat the frame; a cold one is not. Fix: the test waits for the scroll event
  before clicking. Serial runs then 6 of 6 (Chromium) and the file passes in WebKit. The other
  programmatic scrolls in e2e have a whole highlight step between scrolling and clicking.
- **Library reopen (1 test): load, not reproduced.** "The list shows the most recently opened book
  first" passed 12 of 12 alone and in five full WebKit runs. It timed out once (page 1 not shown
  within 5 s) in the first verify, which ran Chromium and WebKit together with the four stuck tests
  above. Left unchanged.

## Timing checks that are sensitive to load here (not changed; budgets need the user)

- `library-view.spec.ts` "with 100 books ... filtering keeps up with typing" checks the filter
  updates within 100 ms. Alone: 14–25 ms (6 runs). In two of three full WebKit runs (4 workers on
  8 cores) it measured 126 and 156 ms. Not a slowdown in the app; the threshold competes for the CPU.
