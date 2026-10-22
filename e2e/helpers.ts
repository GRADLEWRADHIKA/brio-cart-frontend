import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const API = 'http://localhost:4710/api';
const here = path.dirname(fileURLToPath(import.meta.url));

export function adminCredentials(): { phone: string; password: string } {
  return JSON.parse(readFileSync(path.join(here, '.admin.json'), 'utf8'));
}

export async function adminToken(request: APIRequestContext) {
  const { phone, password } = adminCredentials();
  // The request context keeps the session cookie from earlier logins, so send the header the web app
  // sends to pass the API's CSRF check for cookie-carrying requests.
  const res = await request.post(`${API}/auth/login`, {
    data: { identifier: phone, password },
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  });
  expect(res.ok(), `admin login failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  return (await res.json()).token as string;
}

export async function orderCount(request: APIRequestContext) {
  const token = await adminToken(request);
  const res = await request.get(`${API}/admin/orders?pageSize=1`, { headers: { Authorization: `Bearer ${token}` } });
  return (await res.json()).total as number;
}

/** Captures URLs passed to window.open (used for WhatsApp) instead of opening them. */
export async function captureWindowOpen(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __opened: string[] }).__opened = [];
    window.open = ((url: string) => {
      (window as unknown as { __opened: string[] }).__opened.push(String(url));
      return null;
    }) as typeof window.open;
  });
  return () => page.evaluate(() => (window as unknown as { __opened: string[] }).__opened);
}

export async function fillCheckout(page: Page, opts: { area?: string } = {}) {
  await page.getByLabel('Full name').fill('Asha Verma');
  await page.getByLabel('Mobile number').fill('9876543210');
  await page.getByLabel('Delivery area').selectOption({ label: opts.area ?? 'Aliganj (226024)' });
  await page.getByLabel('House / flat / building').fill('B-12, Shanti Apartments');
  await page.getByLabel('Street / area details').fill('Sector C, near the park');
}
