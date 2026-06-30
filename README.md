# Run Plan — GitHub Pages deployment

This folder is a ready-to-deploy static site: two HTML files, no build step,
no server required.

- `index.html` — the Plan Library (browse/upload/duplicate training plans)
- `calendar.html` — the calendar/dashboard view (drag-to-swap, inline edit)

They link to each other via the small nav in the top bar.

## One-time setup (do this once, on either Mac — git is all you need)

1. **Create the repo on GitHub.com**
   Go to github.com → New repository. Name it whatever you like (e.g.
   `run-plan`). Keep it **Public** for now — GitHub Pages on a free personal
   account only serves sites publicly; we'll lock it down with Cloudflare
   Access later without needing to change this.

2. **Push this folder to it**, from Terminal, in this folder:
   ```bash
   git init
   git add .
   git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```

3. **Turn on Pages**
   In the repo on GitHub.com: Settings → Pages → under "Build and
   deployment," set Source to **Deploy from a branch**, branch `main`,
   folder `/ (root)`. Save.

4. **Wait ~1 minute**, then refresh that same Settings → Pages screen — it'll
   show you the live URL, something like:
   `https://<your-username>.github.io/<repo-name>/`

That's it — no Xcode, no admin rights, no App Store needed on either Mac.

## Updating the site later

Any time you (or I) change these files:
```bash
git add .
git commit -m "describe what changed"
git push
```
GitHub rebuilds the live site automatically within about a minute.

## Using it from your iPhone/iPad

Open the GitHub Pages URL in Safari, tap the Share icon → **Add to Home
Screen**. It'll behave like a standalone app icon (no browser chrome) even
though it's just a web page under the hood.

## Known limitations of this snapshot

- **No persistence yet.** Edits you make in the calendar (drag-and-drop,
  inline editing) live only in that browser tab's memory and vanish on
  reload. Same for plan-library uploads/duplicates/deletes/reordering.
  This is the next thing to build — likely a small JSON file synced via
  your iCloud Drive, read/written from the page.
- **"Use plan" navigates but doesn't hand off data yet.** Clicking it in the
  Library takes you to the calendar page with `?plan=<id>` in the URL, but
  the calendar page doesn't read that yet — it still shows its own sample
  plan selector. Wiring that up is a quick follow-on once persistence is in
  place (no reason to build it twice).
- **Public URL.** Anyone with the link can currently view and use the site.
  Per our plan, add Cloudflare Access in front of it when you're ready to
  lock it down to just you — no changes needed here, that happens at the
  DNS/Cloudflare layer.
