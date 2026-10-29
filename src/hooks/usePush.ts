import { useCallback, useEffect, useState } from 'react';
import { notificationsApi } from '@/api/endpoints';
import { isNative } from '@/config/env';
import { useAuth } from '@/hooks/useAuth';

/** Browser push needs a service worker, the Push API and HTTPS (or localhost). The Android app is separate. */
export const pushSupported = () =>
  !isNative && typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && window.isSecureContext;

/** Registers the service worker once per page load. */
let registration: Promise<ServiceWorkerRegistration> | null = null;
export function registerServiceWorker() {
  if (!pushSupported()) return null;
  registration ??= navigator.serviceWorker.register('/sw.js', { scope: '/' });
  return registration;
}

function keyBytes(base64url: string) {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function sameKey(a: ArrayBuffer | null, b: Uint8Array) {
  if (!a) return false;
  const x = new Uint8Array(a);
  return x.length === b.length && x.every((v, i) => v === b[i]);
}

/** Browser push errors in words a customer or rider can act on. */
export function pushErrorMessage(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  if (/push service (error|not available)/i.test(msg)) {
    const brave = (navigator as Navigator & { brave?: unknown }).brave !== undefined;
    return brave
      ? 'Brave blocks phone alerts by default. Open brave://settings/privacy, turn on “Use Google services for push messaging”, restart Brave and try again.'
      : 'This browser couldn’t reach its notification service. Check that a VPN, firewall or antivirus isn’t blocking it, or use Google Chrome, then try again. Alerts inside the site still work.';
  }
  if (/permission denied/i.test(msg)) return 'Notifications are blocked for this site. Allow them in your browser’s site settings, then try again.';
  return msg;
}

/** On sign-out: stop this device getting the account's alerts. */
export async function forgetPushDevice() {
  if (!pushSupported() || !registration) return;
  try {
    const sub = await (await registration).pushManager.getSubscription();
    if (!sub) return;
    await notificationsApi.unsubscribePush(sub.endpoint).catch(() => undefined);
    await sub.unsubscribe();
  } catch {
    /* best effort */
  }
}

export type PushState = 'unsupported' | 'off' | 'on' | 'blocked';

/**
 * Lock-screen alerts for the signed-in user on this device. `enable()` asks the browser for
 * permission (it must run from a tap) and saves the subscription on the server.
 */
export function usePush() {
  const { user } = useAuth();
  const [state, setState] = useState<PushState>(() => (!pushSupported() ? 'unsupported' : Notification.permission === 'denied' ? 'blocked' : 'off'));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pushSupported() || !user) return;
    let gone = false;
    void (async () => {
      const reg = await registerServiceWorker()!;
      const sub = await reg.pushManager.getSubscription();
      if (gone) return;
      if (sub && Notification.permission === 'granted') {
        setState('on');
        // Re-save on every visit: links the device to whoever is signed in now.
        void notificationsApi.subscribePush(sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }).catch(() => undefined);
      } else setState(Notification.permission === 'denied' ? 'blocked' : 'off');
    })().catch(() => undefined);
    return () => {
      gone = true;
    };
  }, [user]);

  const enable = useCallback(async () => {
    if (!pushSupported()) return false;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'blocked' : 'off');
        return false;
      }
      const reg = await registerServiceWorker()!;
      await navigator.serviceWorker.ready;
      const key = keyBytes(await notificationsApi.pushKey());
      let sub = await reg.pushManager.getSubscription();
      // A subscription made with another server key can't receive our pushes: replace it.
      if (sub && !sameKey(sub.options.applicationServerKey, key)) {
        await sub.unsubscribe().catch(() => undefined);
        sub = null;
      }
      if (!sub) {
        const subscribe = () => reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
        // The push service sometimes refuses the first attempt; one retry after a short pause.
        sub = await subscribe().catch(async () => {
          await new Promise((r) => setTimeout(r, 1500));
          return subscribe();
        });
      }
      await notificationsApi.subscribePush(sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } });
      setState('on');
      return true;
    } catch (e) {
      throw new Error(pushErrorMessage(e), { cause: e });
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, enable };
}
