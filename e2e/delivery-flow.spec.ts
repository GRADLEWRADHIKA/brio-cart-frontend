import { expect, test, type Browser, type Page } from '@playwright/test';
import { adminCredentials, fillCheckout } from './helpers';

/**
 * Full order-to-doorstep journeys across every role: customer, super admin, shop owner and rider.
 * Each role runs in its own browser context, as on separate phones.
 */

const uniquePhone = (prefix: string) => `${prefix}${Date.now().toString().slice(-8)}`;

async function signIn(page: Page, identifier: string, password: string, next: string) {
  await page.goto(`/login?next=${next}`);
  await page.getByLabel('Mobile number or email').fill(identifier);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

async function asAdmin(browser: Browser, next = '/admin') {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const { phone, password } = adminCredentials();
  await signIn(page, phone, password, next);
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Orders' })).toBeVisible();
  return { ctx, page };
}

/** A rider signs up from the public form; returns their sign-in details and open rider app. */
async function riderSignsUp(browser: Browser, name: string) {
  // Riders use the app on their phones.
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const page = await ctx.newPage();
  const rider = { name, phone: uniquePhone('97'), password: 'rider-pass-123' };
  await page.goto('/rider/register');
  await page.getByLabel('Full name').fill(rider.name);
  await page.getByLabel('Mobile number').fill(rider.phone);
  await page.getByLabel('Vehicle number').fill('UP32 AB 1234');
  await page.getByLabel('Password').fill(rider.password);
  await page.getByRole('button', { name: 'Apply as rider' }).click();
  await expect(page).toHaveURL(/\/rider/);
  return { ctx, page, rider };
}

async function approveRider(admin: Page, name: string) {
  await admin.goto('/admin/rider-approvals');
  const card = admin.locator('article, li, div').filter({ hasText: name }).filter({ has: admin.getByRole('button', { name: 'Approve' }) }).last();
  await card.getByRole('button', { name: 'Approve' }).click();
  await expect(admin.getByText(name)).toHaveCount(0);
}

/** Guest customer orders one product (Cash on Delivery) and stays on the order page. */
async function customerOrders(browser: Browser, productPath: string, addButton = /Add to cart/) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(productPath);
  await page.getByRole('button', { name: addButton }).first().click();
  await expect(page.getByTestId('cart-count').first()).toHaveText('1');
  await page.goto('/checkout');
  await fillCheckout(page);
  await page.getByRole('checkbox', { name: /I confirm my order of/ }).check();
  await page.getByRole('button', { name: /Place order/ }).click();
  await expect(page.getByRole('heading', { name: 'Order placed, thank you!' })).toBeVisible();
  const orderNumber = (await page.getByTestId('order-number').innerText()).trim();
  return { ctx, page, orderNumber };
}

/** Reads the customer's 4-digit delivery code from their order page. */
async function deliveryCode(customer: Page) {
  await customer.reload();
  const code = customer.getByLabel(/^Delivery code \d \d \d \d$/);
  await expect(code).toBeVisible();
  return (await code.innerText()).trim();
}

async function typeCode(rider: Page, code: string) {
  for (const d of code) await rider.getByRole('button', { name: d, exact: true }).click();
}

function riderCard(rider: Page, orderNumber: string) {
  return rider.locator('article').filter({ hasText: orderNumber });
}

async function goOnline(rider: Page) {
  const toggle = rider.getByRole('switch');
  await expect(toggle).toBeEnabled();
  if ((await toggle.getAttribute('aria-checked')) !== 'true') await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
}

test.describe('customer → rider delivery', () => {
  test('store order: rider signs up, admin approves and assigns, rider delivers with the customer’s code and collects cash', async ({ browser }) => {
    // 1. Rider applies and waits for approval.
    const r = await riderSignsUp(browser, `E2E Rider ${Date.now() % 100000}`);
    await expect(r.page.getByText(/waiting|approval|pending/i).first()).toBeVisible();
    const blocked = await r.page.evaluate(async () => (await fetch('/api/rider/orders', { credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' } })).status);
    expect(blocked).toBe(403);

    // 2. Super admin approves the rider.
    const a = await asAdmin(browser);
    await approveRider(a.page, r.rider.name);

    // 3. Customer places a Cash on Delivery order as a guest.
    const c = await customerOrders(browser, '/product/onion');
    await expect(c.page.getByText('Cash on Delivery').first()).toBeVisible();

    // 4. Admin confirms the order and assigns the new rider.
    await a.page.goto('/admin/orders');
    await a.page.getByLabel('Search orders').fill(c.orderNumber);
    await a.page.getByLabel('Search orders').press('Enter');
    await a.page.getByRole('link', { name: c.orderNumber }).click();
    await a.page.getByRole('button', { name: 'Mark as Confirmed' }).click();
    await expect(a.page.getByRole('button', { name: 'Mark as Preparing' })).toBeVisible();
    const assign = a.page.getByLabel('Assign delivery partner');
    const option = assign.locator('option', { hasText: r.rider.name });
    await assign.selectOption(await option.getAttribute('value'));
    await expect(a.page.getByText('Waiting for the rider to accept')).toBeVisible();

    // 5. Rider reloads, sees the assignment and works through every step.
    await r.page.goto('/rider');
    const card = riderCard(r.page, c.orderNumber);
    await expect(card).toBeVisible();
    await expect(card.getByText(/^Collect ₹\d+/)).toBeVisible();
    await card.getByRole('button', { name: 'Accept' }).click();
    await card.getByRole('button', { name: 'Picked up from store' }).click();
    await card.getByRole('button', { name: /Start trip/ }).click();
    await expect(card.getByRole('button', { name: 'Deliver with code' })).toBeVisible();

    // 6. Customer sees Out for Delivery and their delivery code; admin never sees it.
    const code = await deliveryCode(c.page);
    expect(code).toMatch(/^\d{4}$/);
    await expect(c.page.locator('[aria-current="step"]')).toContainText('Out for Delivery');
    await a.page.reload();
    await expect(a.page.getByText(code, { exact: true })).toHaveCount(0);

    // 7. A wrong code is refused and counted.
    await card.getByRole('button', { name: 'Deliver with code' }).click();
    const wrong = code === '0000' ? '1111' : '0000';
    await typeCode(r.page, wrong);
    await r.page.getByRole('button', { name: 'Confirm delivery' }).click();
    await expect(r.page.getByText(/Wrong code\. 4 attempts left\./)).toBeVisible();

    // 8. Correct code + full cash completes the delivery.
    await r.page.getByRole('button', { name: 'Clear' }).click();
    await typeCode(r.page, code);
    await expect(r.page.getByLabel('Cash collected')).not.toHaveValue('');
    await r.page.getByRole('button', { name: 'Confirm delivery' }).click();
    await expect(card).toHaveCount(0);

    // 9. Everyone sees Delivered.
    await c.page.reload();
    await expect(c.page.getByText('Delivered').first()).toBeVisible();
    await expect(c.page.getByLabel(/^Delivery code/)).toHaveCount(0);

    await r.page.getByRole('navigation', { name: 'Rider navigation' }).getByRole('link', { name: /History/ }).click();
    await expect(r.page.getByText(c.orderNumber)).toBeVisible();
    await r.page.getByRole('navigation', { name: 'Rider navigation' }).getByRole('link', { name: /Earnings/ }).click();
    await expect(r.page.getByRole('heading', { name: 'Earnings' })).toBeVisible();
    await expect(r.page.getByText(c.orderNumber)).toBeVisible();

    await a.page.reload();
    await expect(a.page.getByText('Delivered').first()).toBeVisible();
    // No further status moves, and the cash collected at the door marked it paid.
    await expect(a.page.getByRole('button', { name: /^Mark as (Confirmed|Preparing|Out for Delivery|Delivered|Cancelled)$/ })).toHaveCount(0);
    await expect(a.page.getByText('Status: PAID')).toBeVisible();

    for (const ctx of [r.ctx, a.ctx, c.ctx]) await ctx.close();
  });

  test('shop order: seller lists a product, customer buys it, shop packs it, rider takes it with the pickup code and delivers', async ({ browser }) => {
    // 1. A shop owner signs up and lists a product.
    const sctx = await browser.newContext();
    const seller = await sctx.newPage();
    const shopName = `E2E Kirana ${Date.now() % 100000}`;
    await seller.goto('/seller/register');
    await seller.getByLabel('Shop name').fill(shopName);
    await seller.getByLabel('Shop phone').fill(uniquePhone('96'));
    await seller.getByLabel('Area').selectOption({ index: 1 });
    await seller.getByLabel('Shop address').fill('Shop no. 4, Kapoorthala Market');
    await seller.getByLabel('Your full name').fill('Ramesh Sharma');
    await seller.getByLabel('Mobile number').fill(uniquePhone('95'));
    await seller.getByLabel('Password').fill('seller-pass-123');
    await seller.getByRole('button', { name: 'Create my shop' }).click();
    await expect(seller).toHaveURL(/\/seller\/?$/);

    await seller.goto('/seller/products/new');
    const productName = `E2E Shop Ghee ${Date.now() % 100000}`;
    await seller.getByLabel('Name', { exact: true }).fill(productName);
    await seller.getByLabel('Category').selectOption({ index: 1 });
    await seller.getByLabel('Pack size').fill('500 ml');
    await seller.getByLabel('Price (₹)', { exact: true }).fill('320');
    await seller.getByRole('button', { name: 'Create product' }).click();
    await expect(seller.getByRole('button', { name: 'Save changes' })).toBeVisible();
    // The seller sidebar links to the shop's public page.
    const shopHref = await seller.locator('a[href^="/shops/"]').first().getAttribute('href');
    expect(shopHref).toMatch(/^\/shops\//);

    // 2. Rider is approved and goes online.
    const r = await riderSignsUp(browser, `E2E Shop Rider ${Date.now() % 100000}`);
    const a = await asAdmin(browser);
    await approveRider(a.page, r.rider.name);
    await r.page.goto('/rider');
    await goOnline(r.page);

    // 3. Customer buys the product from the shop's page.
    const cctx = await browser.newContext();
    const cp = await cctx.newPage();
    await cp.goto(shopHref!);
    await expect(cp.getByText(productName)).toBeVisible();
    const product = cp.getByTestId('product-card').filter({ hasText: productName });
    await product.getByRole('button', { name: /Add/ }).first().click();
    await expect(cp.getByTestId('cart-count').first()).toHaveText('1');
    await cp.goto('/checkout');
    await fillCheckout(cp);
    await cp.getByRole('checkbox', { name: /I confirm my order of/ }).check();
    await cp.getByRole('button', { name: /Place order/ }).click();
    await expect(cp.getByRole('heading', { name: /Order placed/ })).toBeVisible();
    const orderNumber = (await cp.getByTestId('order-number').first().innerText()).trim();

    // A new shop order is not offered to riders until the shop accepts it.
    await r.page.reload();
    await expect(r.page.getByText(orderNumber)).toHaveCount(0);

    // 4. Shop accepts, prepares and marks it ready; a pickup code appears.
    await seller.goto('/seller/orders');
    await seller.getByRole('link', { name: new RegExp(orderNumber) }).first().click();
    await seller.getByRole('button', { name: 'Accept order' }).click();
    await seller.getByRole('button', { name: 'Start preparing' }).click();
    await seller.getByRole('button', { name: 'Packed: ready for pickup' }).click();
    const pickupCode = (await seller.getByTestId('pickup-code').innerText()).trim();
    expect(pickupCode).toMatch(/^\d{4}$/);

    // 5. Rider takes it from the open pool and collects it with the pickup code.
    await r.page.reload();
    const pool = r.page.locator('article').filter({ hasText: orderNumber });
    await expect(pool.getByText(/packed and ready/)).toBeVisible();
    await pool.getByRole('button', { name: 'Take order' }).click();
    const card = riderCard(r.page, orderNumber);
    await expect(card.getByTestId('pickup-shop')).toContainText(shopName);
    const wrong = pickupCode === '0000' ? '1111' : '0000';
    await card.getByLabel('Pickup code from the shop').fill(wrong);
    await card.getByRole('button', { name: 'Collected from shop' }).click();
    await expect(card.getByText(/Wrong pickup code\. \d attempts left\./)).toBeVisible();
    await card.getByLabel('Pickup code from the shop').fill(pickupCode);
    await card.getByRole('button', { name: 'Collected from shop' }).click();
    await card.getByRole('button', { name: /Start trip/ }).click();

    // 6. Delivery with the customer's code.
    const code = await deliveryCode(cp);
    await card.getByRole('button', { name: 'Deliver with code' }).click();
    await typeCode(r.page, code);
    await r.page.getByRole('button', { name: 'Confirm delivery' }).click();
    await expect(card).toHaveCount(0);

    // 7. Customer, shop and admin see it delivered.
    await cp.reload();
    await expect(cp.getByText('Delivered').first()).toBeVisible();
    await seller.reload();
    await expect(seller.getByText('Delivered').first()).toBeVisible();
    await expect(seller.getByTestId('pickup-code')).toHaveCount(0);
    await a.page.goto('/admin/orders');
    await a.page.getByLabel('Search orders').fill(orderNumber);
    await a.page.getByLabel('Search orders').press('Enter');
    await expect(a.page.getByRole('row').filter({ hasText: orderNumber }).getByText('Delivered')).toBeVisible();

    for (const ctx of [sctx, r.ctx, a.ctx, cctx]) await ctx.close();
  });

  test('rider rejects an assignment and it returns to the admin; customers and riders cannot open other portals', async ({ browser }) => {
    const r = await riderSignsUp(browser, `E2E Reject Rider ${Date.now() % 100000}`);
    const a = await asAdmin(browser);
    await approveRider(a.page, r.rider.name);
    const c = await customerOrders(browser, '/product/potato');

    await a.page.goto('/admin/orders');
    await a.page.getByLabel('Search orders').fill(c.orderNumber);
    await a.page.getByLabel('Search orders').press('Enter');
    await a.page.getByRole('link', { name: c.orderNumber }).click();
    const assign = a.page.getByLabel('Assign delivery partner');
    await assign.selectOption(await assign.locator('option', { hasText: r.rider.name }).getAttribute('value'));
    await expect(a.page.getByText('Waiting for the rider to accept')).toBeVisible();

    await r.page.goto('/rider');
    const card = riderCard(r.page, c.orderNumber);
    await card.getByRole('button', { name: 'Reject' }).click();
    await r.page.getByRole('radio', { name: 'Too far away' }).check();
    await r.page.getByRole('button', { name: 'Reject order' }).click();
    await expect(card).toHaveCount(0);

    await a.page.reload();
    await expect(a.page.getByLabel('Assign delivery partner')).toHaveValue('');

    // The rider cannot use the admin area or the seller portal.
    const adminStatus = await r.page.evaluate(async () => (await fetch('/api/admin/summary', { credentials: 'include' })).status);
    expect(adminStatus).toBe(403);
    const shopStatus = await r.page.evaluate(async () => (await fetch('/api/shop/orders', { credentials: 'include' })).status);
    expect(shopStatus).toBe(403);

    for (const ctx of [r.ctx, a.ctx, c.ctx]) await ctx.close();
  });
});
