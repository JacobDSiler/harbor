// Builds native/www from the repo root:
//   - copies index.html, apps.js, manifest and icons (the web app is the single source of truth)
//   - bundles src/bridge.js -> www/native.js (Capacitor plugins behind window.HarborNative)
// Run: npm run build:www   (then npx cap sync android)
import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const nativeDir = resolve(here, '..');
const root = resolve(nativeDir, '..');
const www = resolve(nativeDir, 'www');

rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });

// sw.js is deliberately not copied: the native shell serves files locally and never registers it.
for (const f of ['index.html', 'apps.js', 'manifest.json', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png']) {
  const src = resolve(root, f);
  if (existsSync(src)) cpSync(src, resolve(www, f));
}

await build({
  entryPoints: [resolve(nativeDir, 'src/bridge.js')],
  bundle: true,
  format: 'iife',
  target: ['es2020', 'chrome90', 'safari15'],
  minify: true,
  sourcemap: false,
  outfile: resolve(www, 'native.js'),
  logLevel: 'info',
  define: { 'process.env.NODE_ENV': '"production"' },
});
console.log('www built ->', www);
