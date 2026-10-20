# Contract: Phase 08 Installable and hosted

Agreed definition of done, written before any code. The author drafts it. The user or the
reviewing agent approves it. After approval, only append clearly marked amendments.

- Approved by: Himanshu (user), 2026-10-19

User decisions during planning:
- Deploys use Cloudflare Pages Git integration (pushing main deploys production; branches get preview URLs).
- Login is Cloudflare Access with an emailed one-time code, allowing only the user's address.
- Updates ask before reloading.

## Checkable items

| # | Behavior | How to verify | Result (filled in at review) |
|---|---|---|---|
| 1 | The manifest is linked and valid: name, short name, start URL, scope, standalone display, colours; 192/512 PNG icons and a maskable 512 load; an apple-touch-icon is linked | e2e, both browsers | |
| 2 | Chromium reports the built app as installable (no installability errors) | e2e via CDP | |
| 3 | After the first load, a service worker controls the app | e2e, both browsers | |
| 4 | With the network off, reloading shows the app shell (heading, Open PDF, Your books) | e2e, both browsers | |
| 5 | With the network off, a book saved earlier opens from Your books and page 1 draws | e2e, both browsers | |
| 6 | When a new version is waiting, "A new version is ready." with Reload appears; Reload switches to it; nothing reloads on its own | Unit tests; after a second deploy, the user sees the notice | |
| 7 | `npm run dev` registers no service worker | Checked in the browser pane | |
| 8 | `_headers` keeps `sw.js` and `index.html` uncached and hashed assets immutable | Unit test on the file; optionally `curl -I` through the login after deploy | |
| 9 | Speed budgets still pass unchanged with the service worker installing on first visit | `npm run test:perf` | |
| 10 | `scripts/verify.sh` passes locally, and CI is green | Local run; GitHub run URL | |
| 11 | The hosted URL (production and previews) requires the personal login: a logged-out request is redirected to Cloudflare Access | `curl -sI <url>` (no credentials) after deploy, plus the user logs in with the email code | |
| 12 | User-checked: installed from the hosted URL on iPhone or iPad (Home Screen) and on the Mac (Dock); a book imported in the installed app opens with the network off | User report | |
| 13 | The deploy guide lets the user set up Pages and Access without agent help, and AGENTS.md says pushing main deploys | User follows it (items 11 and 12 prove it worked) | |

## Out of scope for this contract

- Cloud copies of books (phase 09)
- Sign-up for other people
- A custom domain
- Push notifications and background sync

## Amendments

(none)
