# Architecture decisions

Decisions made with the user in the planning session on 2026-10-18, before any code existed.
Each entry records the options considered and why one was chosen, so a later agent can tell
whether a new fact should reopen it. To change a decision, append a new dated entry that
supersedes the old one. Do not rewrite history here.

## Inputs from the user

- Reads on: Mac, plus iPad and iPhone.
- Audience: "me first, maybe others later". Sharing later should not need a rewrite.
- Can read: TypeScript/JavaScript and Python. Cannot read Swift.
- Sync between devices: not needed now, but the design must not block it.
- Wants free cloud-provider storage to start, and will pay later if needed.
- Works with two agents (Claude Code and Codex), switching on usage limits. Every choice must
  be buildable and testable by both from the terminal.

---

## D1. Platform: installable web app (PWA)

**Options considered**
- A. Installable web app (PWA): TypeScript, runs in the browser, installs to the Dock or Home Screen.
- B. Native Apple app: Swift + SwiftUI + PDFKit.
- C. Web code inside a native shell from day one (Tauri or Capacitor).

**Decision:** A.

**Reasoning**
- One codebase covers Mac, iPad, iPhone, and any other browser.
- It uses a language the user can read, so they can review agent work.
- Builds and tests run headless from the terminal, including in Codex's Linux cloud sandbox.
  Option B needs Xcode on a Mac, and its UI tests are slow and flaky.
- Sharing later means sending a URL. Option B would mean TestFlight or the App Store.
- The user accepted that it won't feel exactly native. Profiling and build tooling can close the gap.

**Consequences**
- The reader lives with browser limits: Safari's canvas memory cap on iOS, Safari clearing
  stored data for sites that aren't installed, and no real file system on iOS. D2 designs
  around these.

**Revisit if:** profiling shows a browser limit that D2's mitigations cannot fix. The planned
escape hatch is option C (wrap the same TypeScript in Tauri or Capacitor), not a rewrite.

---

## D2. Performance principles

The user asked whether a browser is fast enough for a book reader. It mostly is. Firefox's
PDF viewer, Zotero's reader, and Hypothesis all run on PDF.js, and Kindle Cloud Reader and
Google Play Books are web apps. The real limits, and how we handle each:

| Limit | Mitigation |
|---|---|
| Turning a page into pixels is CPU-heavy | Render in a Web Worker, pre-render neighbor pages, cache bitmaps |
| iOS Safari caps total canvas memory | Virtualized rendering (only near-visible pages); memory-capped bitmap cache; render at device resolution, no higher |
| Safari may clear storage for sites not used recently | Install to Home Screen/Dock (exempt); cloud copy (D5); export (phase 12) |
| No real file system or background sync on iOS | Books are imported into the app and copied to the cloud |

**Decision (adopted by the user):**
1. The PDF engine sits behind a small interface (open, page count, outline, render page,
   page text). The rest of the app never calls PDF.js directly, so the engine can be swapped.
2. Annotations are anchored in PDF coordinates: page index, rectangles in PDF points, and the
   quoted text. They never use screen pixels. They survive zoom, layout changes, and an
   engine swap.
3. Storage sits behind an interface. Local adapters come first, and cloud or sync adapters
   plug in later.
4. Core logic (annotations, library model, reading position) is plain TypeScript with no
   DOM. It is unit-testable and reusable inside a native wrapper.
5. Speed is checked automatically. Playwright benchmarks on a large fixture PDF run inside
   `scripts/verify.sh` and fail on regression (phase 02).

**Revisit if:** a budget can't be met with PDF.js (see D3), or the iOS memory cap is still
hit with virtualization in place.

---

## D3. PDF engine: PDF.js

**Options considered**
- A. PDF.js (`pdfjs-dist`, Mozilla, Apache-2.0).
- B. PDFium compiled to WebAssembly, for example via EmbedPDF (permissive licenses).
- C. MuPDF.js (Artifex, AGPL or commercial license).

**Decision:** A, behind the D2 engine interface.

**Reasoning**
- It is the most mature option. Outline, text layer, and worker support are built in.
- Both agents know it extremely well, so they make fewer mistakes.
- B can render faster but has younger wrappers and needs more custom work, such as the
  text-selection layer.
- C is fast, but the AGPL would force the whole app's source open (or a paid license) once
  others use it. That conflicts with "maybe others later".

**Revisit if:** a phase 02 budget fails on a real book the user reads. Then implement a
PDFium adapter behind the same interface and compare the numbers.

---

## D4. Language, framework and tooling

**Options considered**
- A. React + Vite.
- B. Svelte 5 or SolidJS + Vite.
- C. No framework (plain TypeScript).

**Decision:** A. TypeScript in strict mode, React + Vite, npm, Vitest for unit tests,
Playwright for browser tests and benchmarks, ESLint + Prettier.

**Reasoning**
- React has the most examples, so both agents are most fluent in it.
- B is leaner, but its examples are fewer and Svelte 5's syntax change trips agents up.
- C would mean hand-building the library, panels, and settings as the app grows.
- React's re-render cost is kept off the hot path: the page viewer (canvases, scrolling,
  virtualization) is a plain TypeScript module, and React only renders the chrome around it.
- Every tool runs headless from the terminal, the same for both agents.

**Revisit if:** profiling shows React re-renders on the reading hot path that can't be moved
out of React.

---

## D5. Storage: local-first, with Cloudflare as the cloud

**Principle:** local-first. PDF files live in the Origin Private File System (OPFS), and
annotations and metadata live in IndexedDB. Opening and reading never wait on the network.
The cloud is for backup and for moving books between devices, behind the D2 storage interface.

**Options considered (cloud side)**
- A. Local only for now, and choose a cloud provider later.
- B. Local-first + Cloudflare: R2 for files, D1 for data, Workers for the API, Pages for hosting.
- C. Local-first + Supabase: Postgres, Auth, Storage.

**Decision:** B. The cloud adapter is added right after the core features (phases 08–09).

**Reasoning**
- R2's free tier is about 10 GB of storage per month, with free egress. That is room for a
  real PDF library.
- Pages gives free HTTPS hosting, which installing the PWA on an iPhone requires.
- `wrangler` emulates Workers, R2 and D1 locally without Docker, so tests never touch the
  live cloud and both agents can run them.
- While the app is personal, Cloudflare Access puts a no-code login wall in front of it.
  A real sign-up flow becomes its own phase if the app opens to others.
- Supabase has built-in auth, but its free storage is small. Sources disagree between
  500 MB and 1 GB, roughly 20–50 PDF books. Free projects also pause after a week idle, and
  local emulation needs Docker.
- Option A would leave iPad and iPhone without books until a later decision.

**Rules that follow**
- The user creates the Cloudflare account and keys. Agents never read or write credentials.
- Deploys and other writes to the live cloud need the user's explicit go-ahead each time
  (AGENTS.md Boundaries).
- `scripts/verify.sh` never touches the live cloud.

**Revisit if:** the library outgrows the free tier (pay for R2, about $0.015/GB-month), or
when the app opens to others (real auth).

**Sources (free-tier figures, checked 2026-10-18; confirm on official pricing pages before relying on them)**
- Cloudflare R2 free tier: https://blog.cloudflare.com/author/greg/rss ,
  https://filebase.com/blog/cloudflare-r2-pricing-costs-savings-and-alternatives-in-2026/
- Supabase free tier: https://automationatlas.io/answers/supabase-free-tier-limits-2026/ ,
  https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/

---

## D6. Product scope choices

- **Reading mode:** continuous vertical scroll first. A paginated (Kindle-style) mode comes later.
- **Formats:** PDF only. EPUB may come later. The engine interface should not assume PDF in
  ways that would block it, but no work is done for EPUB now.
- **Order after the core** (TOC, bookmarks, highlights, notes, cloud), in the user's stated priority:
  1. Reading comfort (themes, zoom and fit, resume position)
  2. Library view
  3. Export of highlights and notes
  4. In-book search. It comes last because it is the most complex.
