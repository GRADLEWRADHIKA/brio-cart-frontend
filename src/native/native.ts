import { isNative } from '@/config/env';
import { useUi } from '@/store/ui';

/**
 * Native (Capacitor/Android) integration. Every plugin is imported lazily so the web bundle
 * never ships native code paths it doesn't use.
 */
export async function initNative(navigate: (delta: number) => void) {
  if (!isNative) return;

  const [{ StatusBar, Style }, { SplashScreen }, { App }, { Keyboard }] = await Promise.all([
    import('@capacitor/status-bar'),
    import('@capacitor/splash-screen'),
    import('@capacitor/app'),
    import('@capacitor/keyboard'),
  ]);

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0c2a1b' });
  } catch {
    /* status bar styling is cosmetic */
  }

  // Android back: close drawers/sheets first, then go back in history, then leave the app.
  await App.addListener('backButton', ({ canGoBack }) => {
    if (useUi.getState().closeTopOverlay()) return;
    if (canGoBack && window.location.hash !== '#/' && window.history.length > 1) navigate(-1);
    else void App.minimizeApp();
  });

  // Keep focused form fields visible above the keyboard on checkout/login.
  await Keyboard.addListener('keyboardDidShow', () => {
    const el = document.activeElement as HTMLElement | null;
    if (el && /INPUT|TEXTAREA|SELECT/.test(el.tagName)) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });

  // Refresh data when the app returns to the foreground.
  await App.addListener('resume', () => window.dispatchEvent(new Event('brio:resume')));

  await SplashScreen.hide({ fadeOutDuration: 250 });
}

/** Online/offline status from @capacitor/network on Android, navigator.onLine on the web. */
export async function watchConnectivity(cb: (online: boolean) => void): Promise<() => void> {
  if (isNative) {
    const { Network } = await import('@capacitor/network');
    const status = await Network.getStatus();
    cb(status.connected);
    const handle = await Network.addListener('networkStatusChange', (s) => cb(s.connected));
    return () => void handle.remove();
  }
  const on = () => cb(true);
  const off = () => cb(false);
  cb(navigator.onLine);
  window.addEventListener('online', on);
  window.addEventListener('offline', off);
  return () => {
    window.removeEventListener('online', on);
    window.removeEventListener('offline', off);
  };
}
