import { expect, test } from '@playwright/test';

test('API is healthy', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.ok()).toBeTruthy();
  expect(await res.json()).toMatchObject({ ok: true, db: 'up' });
});

test('storefront, product and cart work without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const apiCalls: string[] = [];
  page.on('request', (r) => { if (r.url().includes('/api/')) apiCalls.push(r.url()); });

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByTestId('product-card').first()).toBeVisible();
  await page.goto('/shop');
  const card = page.getByTestId('product-card').first();
  await expect(card).toBeVisible();
  await card.getByRole('link').first().click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const add = page.getByRole('button', { name: /Add to cart/ });
  if (await add.count()) {
    await add.first().click();
    await expect(page.getByTestId('cart-count').first()).toHaveText('1');
    await page.goto('/checkout');
    await expect(page.getByRole('button', { name: /Place order|Continue to payment/ })).toBeVisible();
  }
  expect(errors).toEqual([]);
  // Every API call goes to the live site itself, never localhost.
  expect(apiCalls.length).toBeGreaterThan(0);
  for (const u of apiCalls) expect(new URL(u).hostname).not.toMatch(/localhost|127\.0\.0\.1/);
});

for (const [path, text] of [
  ['/login', 'Welcome back'],
  ['/rider/register', 'Deliver with Brio Cart'],
  ['/seller/register', 'Create my shop'],
  ['/shops', ''],
  ['/track', ''],
] as const) {
  test(`page ${path} loads`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    if (text) await expect(page.getByText(text).first()).toBeVisible();
    else await expect(page.locator('main, #root').first()).not.toBeEmpty();
    expect(errors).toEqual([]);
  });
}

test('protected portals send signed-out visitors to sign in', async ({ page }) => {
  for (const path of ['/admin', '/seller', '/rider']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/(login|rider\/register|seller\/register)/);
  }
  const res = await page.request.get('/api/admin/summary');
  expect(res.status()).toBe(401);
});
