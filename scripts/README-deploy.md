# Harbor - push + auto-push watcher

Live site: https://harbor.jacobsiler.com (GitHub repo JacobDSiler/harbor, branch `main`; Netlify deploys on every push).

## One-off push
Double-click `push.cmd` in the repo root. It refuses to commit secret-looking files, adopts GitHub's history on
the very first run if the repo isn't empty, rebases if GitHub is ahead (never force-pushes), commits everything
(message from `.pending-commit.txt` if present), and pushes.

## Auto-push (tray watcher)
1. Double-click `scripts\hs-start-watcher.cmd` once. It starts the watcher and adds it to Windows startup.
2. A green "H" appears in the system tray. Right-click: Push now, Pause, logs, open site, Quit.
3. The canary is `deploy-tick.txt` (gitignored). Whenever its modified-time changes, the watcher waits
   ~8 s and runs the push. Tick it by hand with:  `echo %date% %time% > deploy-tick.txt`
   Claude ticks it after finishing changes made together in a session.
Colours: green idle, yellow change detected, blue pushing, red failed, gray paused.
Stop it with `scripts\hs-stop-watcher.cmd`. Logs: `logs\push.log`, `logs\watcher.log`.

## Notes
- The watcher never pushes on startup, only on a NEW tick.
- Netlify takes about a minute after a push to go live.
