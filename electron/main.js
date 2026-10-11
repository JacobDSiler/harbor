// Harbor desktop shell (Electron).
// Thin on purpose: it opens the live site (https://harbor.jacobsiler.com) so the app always matches the website,
// has the same origin (Firestore, saved family code and the offline service worker all behave as on the web), and
// never needs rebuilding for a normal Harbor update. If the site can't be reached on a first run, it falls back to
// the copy bundled in app/ (copied from the repo root by scripts/prepare-app.mjs).
const { app, BrowserWindow, shell, session, Menu } = require("electron");
const path = require("path");

const LIVE = "https://harbor.jacobsiler.com/";
const FALLBACK = path.join(__dirname, "app", "index.html");
const TRUSTED = /^https:\/\/([a-z0-9-]+\.)*(jacobsiler\.com|web\.app|firebaseapp\.com)(\/|$)/i;

if (!app.requestSingleInstanceLock()) { app.quit(); }

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1180, height: 820, minWidth: 380, minHeight: 560,
    backgroundColor: "#0B2545",
    title: "Harbor",
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  Menu.setApplicationMenu(null);

  // Offline or the site is down: use the bundled copy.
  let usedFallback = false;
  win.webContents.on("did-fail-load", (_e, code, _desc, url, isMainFrame) => {
    if (!isMainFrame || usedFallback || code === -3) return;   // -3 = aborted (normal during redirects)
    if (url && url.startsWith("file:")) return;
    usedFallback = true;
    win.loadFile(FALLBACK).catch(() => {});
  });
  win.loadURL(LIVE);

  // Links that open a new window (Harbor's "browser window" mode, app links): hand them to the real browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  // Keep the main window on Harbor; anything else goes to the browser.
  win.webContents.on("will-navigate", (e, url) => {
    if (url.startsWith(LIVE) || url.startsWith("file:")) return;
    e.preventDefault();
    if (/^https?:/i.test(url)) shell.openExternal(url);
  });
  win.on("closed", () => { win = null; });
}

app.whenReady().then(() => {
  // Framed apps (Sight Singing uses the microphone) may ask for media, fullscreen, clipboard. Only our own domains.
  const allow = new Set(["media", "fullscreen", "clipboard-sanitized-write", "clipboard-read", "notifications"]);
  session.defaultSession.setPermissionRequestHandler((wc, permission, cb, details) => {
    const origin = (details && details.requestingUrl) || wc.getURL() || "";
    cb(allow.has(permission) && TRUSTED.test(origin));
  });
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
