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

<!-- Later phases append their sections below. -->
