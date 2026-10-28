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
      const key = await notificationsApi.pushKey();
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }));
      await notificationsApi.subscribePush(sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } });
      setState('on');
      return true;
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, enable };
}
