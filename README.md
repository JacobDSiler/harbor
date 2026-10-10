# Harbor

The Siler family school hub. One home screen with big buttons into Math Adventure, Words Adventure and every other homeschool app, plus a PIN-protected Parent area with per-child progress.

Live at: https://harbor.jacobsiler.com (GitHub Pages, repo JacobDSiler/harbor; the CNAME file sets the custom domain). Plain HTML/JS, no build step, so it wraps cleanly for native (Capacitor) later.

## Files
- `index.html`  the whole app (launcher, app viewer, PIN gate, parent area)
- `apps.js`     **the app registry**. Add or edit one entry to add a new app tile. Also holds grade labels, Words topic keys and the shared Firebase web config.
- `sw.js`, `manifest.json`, icons   PWA shell (works offline)
- `push.cmd` + `scripts/hs-push.ps1`   commit and push to GitHub (same flow as Words Adventure)

## How it works
- **Launcher**: tiles open each app inside Harbor in a full-screen viewer with an anchor Back button (also the Android back button). The up-right arrow opens the app in a normal browser tab.
- **Children**: read from Firestore `families/{code}` (the same document Math and Words use). Harbor only ever reads it.
- **Parent area**: PIN accepts the Harbor PIN set on this device or the parent PIN stored in the family doc. Unlocks for 10 minutes.
- **Per-child view**: accuracy per subject, "Focus this week" (topics under 70% with 5+ answers), "Going well" (85%+), recent quizzes, and local teaching notes.

## Handoff contract (apps -> Harbor), not yet implemented inside Math/Words
Harbor opens each app as `<url>/?from=harbor&family=MA-XXXX&child=<profileId>` and, for the parent view, adds `&view=parent`.
Each app should, when `from=harbor`:
1. Auto-join the family code (skip the join screen) and select the child.
2. Open its own parent/teacher view when `view=parent`.
Until then the params are harmlessly ignored.

## Adding an app
Edit `apps.js`, add an entry (set `status: "live"` and a `url`), run `push.cmd`.

## Native wrap checklist (later)
Capacitor pointing at this folder; app id e.g. `com.silertech.harbor`; the viewer iframe needs the apps' sites reachable (they are public). Consider `allowNavigation` for *.jacobsiler.com.

## DNS
Cloudflare: CNAME `harbor` -> `<github-user>.github.io` (DNS only, like math and words). Change `CNAME` here if you pick a different subdomain.
