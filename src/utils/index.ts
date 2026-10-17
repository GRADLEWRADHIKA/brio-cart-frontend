import { clsx, type ClassValue } from 'clsx';
import { isNative } from '@/config/env';

export const cn = (...v: ClassValue[]) => clsx(v);

/**
 * Opens external destinations (WhatsApp, phone, maps) outside the app. In the Android app they
 * go to the system (WhatsApp / dialer / browser) and never load inside the WebView.
 */
export async function openExternal(url: string) {
  if (!/^(https:|tel:|mailto:|whatsapp:)/i.test(url)) throw new Error('Blocked external URL');
  if (isNative) {
    const { AppLauncher } = await import('@capacitor/app-launcher');
    await AppLauncher.openUrl({ url });
    return;
  }
  if (/^(tel:|mailto:)/i.test(url)) window.location.href = url;
  else window.open(url, '_blank', 'noopener,noreferrer');
}

/** Current wall-clock time in Lucknow (IST, UTC+05:30) regardless of device timezone. */
export function nowInIST(now = new Date()) {
  return new Date(now.getTime() + (now.getTimezoneOffset() + 330) * 60_000);
}

/**
 * Brio Cart delivers next morning for orders placed before midnight IST. Returns the time left
 * in today's ordering window.
 */
export function timeToCutoff(now = new Date()) {
  const ist = nowInIST(now);
  const midnight = new Date(ist);
  midnight.setHours(24, 0, 0, 0);
  const ms = midnight.getTime() - ist.getTime();
  return { hours: Math.floor(ms / 3_600_000), minutes: Math.floor((ms % 3_600_000) / 60_000) };
}

export function discountPercent(price: number, mrp: number | null) {
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

export function formatDate(iso: string, withTime = true) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit', hour12: true } : {}),
    timeZone: 'Asia/Kolkata',
  });
}

export function newIdempotencyKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}
