import { isNative } from '@/config/env';

/**
 * Session token handling.
 *
 * - Web: the server sets an httpOnly cookie. The token is never readable from JavaScript and is
 *   not stored anywhere by this app.
 * - Android: cookies across the WebView/API origins are unreliable, so the bearer token is kept
 *   in the Android Keystore-backed secure storage plugin (not localStorage), and cached in memory.
 */
const KEY = 'session';
let memory: string | null = null;
let loaded = false;

async function secure() {
  const { SecureStorage } = await import('@aparajita/capacitor-secure-storage');
  return SecureStorage;
}

export const tokenStore = {
  async get(): Promise<string | null> {
    if (!isNative) return null;
    if (!loaded) {
      try {
        const value = await (await secure()).get(KEY);
        memory = typeof value === 'string' ? value : null;
      } catch {
        memory = null;
      }
      loaded = true;
    }
    return memory;
  },
  async set(token: string | null | undefined) {
    if (!isNative) return;
    memory = token ?? null;
    loaded = true;
    try {
      const s = await secure();
      if (token) await s.set(KEY, token);
      else await s.remove(KEY);
    } catch {
      /* keep in-memory session for this run */
    }
  },
};
