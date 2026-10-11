# Harbor - Windows desktop app (Electron)

A thin desktop shell around Harbor. It opens the live site (harbor.jacobsiler.com), so it always matches the
website and never needs rebuilding for a normal Harbor update. If the site can't be reached on a first run it
falls back to the copy in `app/` (copied from the repo root by `scripts/prepare-app.mjs`).

## Run it on your PC
Double-click `run-desktop.cmd` (installs packages the first time).

## Get the installer
Push as usual (the tray watcher does it when the canary is ticked). Any push that touches `electron/` runs
GitHub -> Actions -> *Build Desktop* -> latest run -> Artifacts -> `Harbor-desktop-windows`:
- `Harbor-<version>-win-setup.exe`  installer
- `Harbor-<version>-portable.exe`   no-install version (USB stick)
Publishing a GitHub Release attaches both to the release page.
Or build locally with `build-desktop.cmd` (output in `electron\dist`).
The build is unsigned, so Windows SmartScreen shows "unknown publisher" once: More info -> Run anyway.

## How apps open
Harbor's default on the web applies: apps open inside Harbor's framed viewer (microphone allowed for Sight Singing).
Parent area -> Settings -> "Opening apps" can switch to a separate browser window; links to other sites open in your default browser.

## Push / watcher
Same as the rest of Harbor: `push.cmd` and the tray watcher at the repo root (`scripts\hs-start-watcher.cmd`).
Nothing separate is needed for the desktop app; it lives in the same repo.
