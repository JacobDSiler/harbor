// window.HarborNative: the one place Harbor touches native features.
// index.html loads native.js only when running inside the Capacitor shell.
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

const isNative = Capacitor.isNativePlatform();

window.HarborNative = {
  isNative,
  platform: Capacitor.getPlatform(),
  // Opens another site in Chrome Custom Tabs (Android). It shares storage with the phone's
  // browser, so Math/Words keep their saved family login; the system Back button returns to Harbor.
  async openUrl(url) {
    if (!isNative) { window.open(url, '_blank', 'noopener'); return; }
    await Browser.open({ url, presentationStyle: 'fullscreen', toolbarColor: '#1A2E4A' });
  },
};

if (isNative) {
  // Android Back: step back through Harbor's screens; leave the app only from the home screen.
  App.addListener('backButton', () => {
    const h = location.hash.replace(/^#\/?/, '');
    if (h) history.back(); else App.exitApp();
  });
}
