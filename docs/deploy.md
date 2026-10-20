# Deploying Book Reader (Cloudflare Pages + Access)

This guide is for the owner of the Cloudflare account. Agents never handle Cloudflare logins or
keys. You do these steps once in the Cloudflare dashboard. After that, deploys happen by pushing
to GitHub.

**How deploys work after setup**

- Pushing `main` deploys **production**: `https://<project>.pages.dev`.
- Pushing any other branch creates a **preview** at `https://<branch>.<project>.pages.dev`.
- Cloudflare builds on its own and does not wait for the GitHub Actions checks. So only push
  `main` after `scripts/verify.sh` passes locally. Agents ask before every push.

Dashboard menu names change from time to time. The settings below are what matters.

---

## 1. Create the Pages project

1. Sign in at https://dash.cloudflare.com and go to **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**.
2. Authorize GitHub for the `himmannshu/book-reader` repository only, then select it.
3. Use these build settings:

   | Setting | Value |
   |---|---|
   | Project name | your choice, for example `book-reader` (this becomes `<project>`) |
   | Production branch | `main` |
   | Framework preset | None (or Vite) |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | `/` |
   | Environment variable | `NODE_VERSION` = `24` |

4. Save and deploy. Wait for the first build to finish and note the URL `https://<project>.pages.dev`.

> Until step 2 is done, the site is public. Do step 2 right away, before importing anything
> private.

## 2. Put it behind your login (Cloudflare Access)

The login has two parts: production (`<project>.pages.dev`) and previews
(`*.<project>.pages.dev`). Both must end up behind the emailed code.

1. **Turn on the email code:** **Zero Trust** → **Integrations** → **Identity providers** →
   **Add new** → **One-time PIN** → Save. It needs no configuration. The first time you open Zero
   Trust, pick a team name and the **Free** plan.
2. **Protect previews:** **Workers & Pages** → your project → **Settings** → **Access policy** →
   **Enable**. Cloudflare creates an Access application for `*.<project>.pages.dev`.
3. **Protect production:** if production isn't protected yet, go to **Zero Trust** → **Access** →
   **Applications** → **Add an application** → **Self-hosted**, with the domain
   `<project>.pages.dev`.
4. **For each Book Reader application** (Zero Trust → Access → Applications):
   - **Login methods:** One-time PIN allowed. Either leave "Accept all available identity
     providers" on, or tick One-time PIN.
   - **Policy:** action **Allow**, include **Emails** → `vghimanshu2@gmail.com`. Replace any rule
     like "Cloudflare account members".
   - **Session duration:** a long one, for example 1 month. When it runs out, you'll need to log
     in again before the app can fetch updates. Reading offline keeps working meanwhile.

**Check it:** open the production URL and a preview URL in a private window. Both should show the
Cloudflare Access page with **"Get a login code emailed to you"**. Enter your email, type the
code from your inbox, and the reader opens.

If the login page only says "Sign in with: Cloudflare", the application still uses Cloudflare
account sign-in. Recheck its login methods in step 4.

## 2b. Turn on sync between devices (phase 09a)

Sync keeps your bookmarks, highlights and notes the same on every device. It also lists every
device's books, though the PDF files themselves come in a later phase. It needs a small database
(Cloudflare D1) and two settings. Production and previews get **separate** databases, so a
preview can never change your real data.

1. **Create two databases:** **Workers & Pages** → **D1 SQL Database** → **Create**. Name one
   `book-reader` and the other `book-reader-preview`. They start empty; the app creates its tables
   on first use.
2. **Bind them to the Pages project:** your Pages project → **Settings** → **Bindings** → **Add** →
   **D1 database**:
   - Variable name: `DB`
   - Production: `book-reader`
   - Preview: `book-reader-preview`
3. **Add two variables** (Pages project → **Settings** → **Variables and Secrets**, type *Text*),
   for **Production** and for **Preview**:
   - `ACCESS_TEAM_DOMAIN` = your team domain, e.g. `gentle-pond-af51.cloudflareaccess.com`
   - `ACCESS_AUD` = the **Application Audience (AUD) tag** of the Access application that
     protects that environment. Find it in Zero Trust → Access → Applications → the application
     → Overview (or Basic information). If one Access application covers both production and
     previews (as it does for this project), both environments use the same AUD value.
4. Bindings and variables apply to the **next** deployment. Ask the agent to push, or redeploy
   from the dashboard.

**Check it:** open the app, log in, and look at the top bar. It should say **Synced**, with a
**Sync now** button. On a second device, log in with the same email. Your books appear (as "On
your other devices" until you open their PDF there), and so do the bookmarks, highlights and
notes for books you've opened on both.

If the bar says **Sync failed**, the binding or a variable is missing or wrong. If it says
**Sign in again to sync**, your Access session has expired: reload the page and log in.

## 2c. Move book files between devices (phase 09b)

With this, a book you add on one device opens on your others without importing it again. Each
device uploads its books in the background (8 MB at a time, so big books and patchy connections
are fine), and another device downloads a book the first time you open it there. Files go to
Cloudflare R2. Its free tier is 10 GB, and the app stops uploading at **9 GB** so it never costs
money. Production and previews get **separate** buckets.

1. **Turn on R2:** in the dashboard, open **Storage & Databases** → **R2 Object Storage**
   (in some layouts under **R2**). Cloudflare may ask you to add a payment method before R2 can be
   used, even on the free tier. Nothing is charged under 10 GB.
2. **Create two buckets:** **Create bucket**, name `book-reader-files`, keep the defaults (automatic
   location, Standard storage). Then again for `book-reader-files-preview`. Keep them private:
   don't turn on public access or a custom domain. The app reaches them only through its own
   login-protected API.
3. **Bind them to the Pages project:** your Pages project → **Settings** → **Bindings** → **Add** →
   **R2 bucket**:
   - Variable name: `FILES`
   - Production: `book-reader-files`
   - Preview: `book-reader-files-preview`
4. As with D1, this applies to the **next** deployment.

No keys or tokens are needed: the app never talks to R2 directly.

**Check it:** add a book on the Mac. The top bar shows **Uploading 1 book (…%)** for a moment,
then nothing extra. On the iPhone, the book is listed as "On your other devices · 12.4 MB ·
downloads when you open it". Tap it: it shows **Downloading… N%**, then opens, with the Mac's
highlights and notes. After that it is on the iPhone like any other book.

If opening says "Downloading books isn't set up here yet", the `FILES` binding is missing for that
environment. "This book is still uploading from your other device" means the other device hasn't
finished: open the app there for a while (iPhones pause uploads when the app is closed).

## 3. Install the app

The installed app keeps its **own** storage, separate from the browser tab. Import your books
**inside the installed app**. Books imported in a normal Safari tab won't appear there.

- **iPhone / iPad:** open the URL in Safari, log in, tap **Share** → **Add to Home Screen**.
- **Mac (Safari 17 or later):** open the URL, log in, choose **File → Add to Dock**.
  In Chrome, use the install icon in the address bar.

## 4. Check offline reading

1. Open the installed app and import a book with **Open PDF**. Wait for "Saved on this device."
2. Turn on airplane mode, or turn Wi-Fi off.
3. Close the app completely, then open it again. The app opens, your book is under **Your books**,
   and it opens and scrolls.

## 5. Updates

After a new version is deployed, the next time the app checks it shows **"A new version is
ready."** Choose **Reload** to switch, or **Later** to keep reading. It never reloads on its own.

If an installed app ever seems stuck on an old version: log in again (an expired Access session
blocks update checks), then close and reopen the app.
