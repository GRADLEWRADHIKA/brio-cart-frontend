import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Brio Cart Android app.
 *
 * BRIO_NATIVE_ENV=production (used by `npm run android:release`) disables everything that is only
 * acceptable while developing against a local HTTP API: cleartext traffic, mixed content and
 * WebView debugging. Release builds must point VITE_API_URL at an HTTPS API.
 */
const isDev = process.env.BRIO_NATIVE_ENV !== 'production';

const config: CapacitorConfig = {
  appId: 'com.thegradlew.briocart',
  appName: 'Brio Cart',
  webDir: 'dist',
  // The app ships its own bundled web assets; it never loads a remote site into the WebView.
  server: {
    androidScheme: 'https',
    cleartext: isDev,
  },
  android: {
    // Dev builds talk to http://10.0.2.2:4847 (emulator → host) from the https://localhost origin.
    allowMixedContent: isDev,
    webContentsDebuggingEnabled: isDev,
    captureInput: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false, // hidden by the app once the UI is ready (src/native/native.ts)
      launchShowDuration: 3000,
      backgroundColor: '#0c2a1b',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: false,
      splashImmersive: false,
    },
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0c2a1b',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
