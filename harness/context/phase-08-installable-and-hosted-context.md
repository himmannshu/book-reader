# Phase 08 context: installable and hosted

Material decisions only.

## User decisions (planning)

- **Deploys:** Cloudflare Pages Git integration. Pushing `main` deploys production; any other
  branch gets a preview. No Cloudflare keys in the repo or with agents. Pages builds don't wait
  for GitHub Actions, so `main` is pushed only after a local verify PASS (and only with the user's
  OK).
- **Login:** Cloudflare Access (Zero Trust Free) with an emailed one-time PIN, allowing only the
  user's address. It covers `<project>.pages.dev` and `*.<project>.pages.dev`.
- **Updates:** prompt mode. "A new version is ready." with Reload or Later; never an automatic
  reload.

## Service worker

- vite-plugin-pwa 2.0.0 (generateSW, Workbox 7). It precaches `**/*.{js,mjs,css,html,png,svg,webmanifest}`
  with a 5 MB per-file limit. The PDF.js worker (`.mjs`, about 1.2 MB) must be cached, or stored
  books can't open offline; the mutation check proved it.
- Off in `npm run dev` (`devOptions.enabled: false`), so development never serves stale files.
- `injectRegister: false`: registration happens in `UpdateNotice` through
  `virtual:pwa-register/react`, so React shows the prompt.
- In prompt mode a new service worker doesn't take over the page that installed it. It controls
  the app from the next load. Tests reload once (`loadControlled` in e2e/pwa.spec.ts).

## Testing installability

- Playwright's default headless Chromium (the "headless shell") reports no installability errors
  even for a page without a manifest, and normal test contexts are incognito ("in-incognito").
  The installability test launches full Chromium (`channel: 'chromium'`) with a persistent
  profile, and first checks that a manifest-less page reports `no-manifest`.

## Headers (public/_headers, Cloudflare Pages)

- `no-cache` for `/sw.js`, `/registerSW.js`, `/index.html`, `/` and `/manifest.webmanifest`;
  `/assets/*` immutable for a year. tests/config/headers.test.ts checks the file. Cloudflare
  applies it only in production; `vite preview` ignores it.

## Known limits

- iOS keeps installed-app storage separate from Safari, so books must be imported inside the
  installed app (docs/deploy.md).
- When the Access session expires, update checks are redirected to the login page. The cached
  app still opens offline, and logging in again restores updates.
- PDFs that need PDF.js CMaps or standard font data files may not render offline. We don't load
  those today.
