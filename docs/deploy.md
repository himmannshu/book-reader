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

1. In the dashboard open **Zero Trust**. The first time, pick a team name and the **Free** plan.
2. Under **Settings → Authentication → Login methods**, make sure **One-time PIN** is enabled.
3. Under **Access → Applications → Add an application → Self-hosted**:
   - **Application name:** Book Reader
   - **Session duration:** a long one, for example 1 month. When it runs out, you'll need to log
     in again before the app can fetch updates. Reading offline keeps working meanwhile.
   - **Application domains:** add two:
     - `<project>.pages.dev` (production)
     - `*.<project>.pages.dev` (every preview deployment)
   - **Identity providers:** One-time PIN.
4. Add a **policy**: action **Allow**, include **Emails** → `vghimanshu2@gmail.com`.
5. Save.

**Check it:** open `https://<project>.pages.dev` in a private window. You should see the Cloudflare
Access page asking for your email. Enter it, type the code from your inbox, and the reader opens.

Optional extra: in the Pages project under **Settings → General**, you can also enable the
built-in access policy for preview deployments. The Zero Trust application above already covers
them.

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
