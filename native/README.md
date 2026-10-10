# Harbor - native Android app

This folder wraps the Harbor web app (`../index.html`) as a real Android app with
[Capacitor](https://capacitorjs.com). Nothing needs installing on your PC: GitHub Actions builds it
in the cloud whenever you push.

```
harbor/
├── index.html, apps.js     the app (single source of truth, same workflow as the website)
├── .github/workflows/build-android.yml   (source copy: native/ci/build-android.yml)
└── native/
    ├── src/bridge.js       window.HarborNative: opens apps in Chrome Custom Tabs, Android Back button
    ├── scripts/build-www.mjs   copies the web files into www/ and bundles bridge.js -> native.js
    ├── capacitor.config.json   app id com.silertech.harbor, splash + status bar colours
    ├── resources/          icon + splash sources (regenerate with: npx @capacitor/assets generate --android)
    └── android/            Android Studio project (committed)
```

## Get the app on a phone or tablet
1. Push the repo (the tray watcher does it when the canary is ticked).
2. GitHub -> Actions -> *Build Android* -> open the latest run -> Artifacts -> `Harbor-android`.
3. Download `Harbor-debug.apk` on the device (or copy it over), allow "install from unknown sources", tap it.
Publishing a GitHub Release also attaches the APK to the release page, an easy link for family.

## How apps open
Setting in the Parent area -> Settings -> "Opening apps":
- **Automatic** (default): in the app, Math/Words/Kitchen open in a Chrome Custom Tab. It shares storage with
  the phone's browser, so saved family logins carry over, and the system Back button returns to Harbor.
  On the website they open full-screen inside Harbor.
- **Inside Harbor**: the framed viewer with the anchor Back button.
- **In a browser window**: always a separate window.
Try both on the real device: if a framed app forgets its family code, use the browser option.

## Signed release (Google Play) - when you are ready
Add repo secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
`ANDROID_KEY_PASSWORD` (same recipe as Our Kitchen). The workflow then also builds `Harbor-release.aab`.
Bump `versionCode` / `versionName` in `native/android/app/build.gradle` for every Play upload.
Do not publish for other families until the security and privacy items in the plan are done
(Firestore rules, delete-my-data, privacy policy).

## Local development (optional)
```bash
cd native
npm ci
npm run build:www
npx cap sync android
npx cap open android      # needs Android Studio
```
