import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();

/**
 * API origin. Empty means "same origin" (the web app is served next to the API, or proxied by
 * Vite in development). Native builds must set VITE_API_URL — see .env.native.
 */
export const API_ORIGIN = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
export const API_BASE = `${API_ORIGIN}/api`;

/** Server-relative upload paths (/uploads/...) must be absolutised for the native app. */
export function assetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return API_ORIGIN + url;
}

export const BRAND = {
  name: 'Brio Cart',
  tagline: 'Fresh • Safe • Responsible',
  city: 'Lucknow',
  /** Fallbacks used only until /api/store loads. */
  whatsapp: '8957032882',
  phoneDisplay: '+91 89570 32882',
  email: 'infobriocart@gmail.com',
} as const;
