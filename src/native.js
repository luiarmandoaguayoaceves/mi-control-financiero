// ============================================================
// Puente a lo nativo (APK). La app no usa bundler, por eso @capacitor/core
// vive copiado en src/vendor/capacitor-core.js. En el navegador todo esto
// existe pero no hace nada: cada llamada se protege con isNativePlatform().
// ============================================================
import { Capacitor, registerPlugin, SystemBars } from './vendor/capacitor-core.js';

export { Capacitor, SystemBars };

export const LocalNotifications = registerPlugin('LocalNotifications');
export const HomeWidget = registerPlugin('HomeWidget');

export function isNativePlatform() {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}
