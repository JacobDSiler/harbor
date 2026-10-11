// Copies the web app from the repo root into electron/app (offline fallback copy). Run by npm start / npm run dist.
import { cpSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const electronDir = resolve(here, "..");
const root = resolve(electronDir, "..");
const out = resolve(electronDir, "app");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const f of ["index.html", "apps.js", "manifest.json", "icon.svg", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"]) {
  const src = resolve(root, f);
  if (existsSync(src)) cpSync(src, resolve(out, f));
}
console.log("app/ ready ->", out);
