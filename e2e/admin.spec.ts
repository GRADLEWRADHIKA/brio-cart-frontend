import { expect, test, type Page } from '@playwright/test';
import { adminCredentials, fillCheckout } from './helpers';

async function signIn(page: Page, identifier: string, password: string, next = '/admin') {
  await page.goto(`/login?next=${next}`);
  await page.getByLabel('Mobile number or email').fill(identifier);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test.describe('admin', () => {
  test('customers cannot use the store dashboard', async ({ page }) => {
    const phone = `98${Date.now().toString().slice(-8)}`;
    await page.goto('/register');
    await page.getByLabel('Full name').fill('Regular Customer');
    await page.getByLabel('Mobile number').fill(phone);
    await page.getByLabel('Password').fill('customer-password');
    await page.getByRole('button', { name: 'Create account' }).click();
    // Customers land on the storefront after signing up.
    await expect(page).toHaveURL(/\/$/);

    // Opening the dashboard sends a customer back to the storefront.
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/$/);
    // The API refuses too — the UI gate is not the security boundary.
    const status = await page.evaluate(async () => (await fetch('/api/admin/summary', { credentials: 'include' })).status);
    expect(status).toBe(403);
  });

  test('admin creates and edits a product, and it appears in the store', async ({ page }) => {
    const { phone, password } = adminCredentials();
    await signIn(page, phone, password);
    await expect(page.getByRole('heading', { name: 'Good to see you' })).toBeVisible();

    await page.getByRole('link', { name: 'Products' }).click();
    await page.getByRole('link', { name: 'New product' }).click();
    await page.getByLabel('Name', { exact: true }).fill('E2E Sweet Lime');
    await page.getByLabel('Category').selectOption({ label: 'Fresh Fruits' });
    await page.getByLabel('Search keywords').fill('mosambi');
    await page.getByLabel('Pack size').fill('1 kg');
    await page.getByLabel('Price (₹)', { exact: true }).fill('89');
    await page.getByRole('button', { name: 'Create product' }).click();
    await expect(page).toHaveURL(/\/admin\/products\/[a-z0-9]+$/);
    // The edit form re-initialises from the saved product once the route switches; wait for it before typing.
    await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible();

    await page.getByLabel('Price (₹)', { exact: true }).fill('95');
    await page.getByLabel('Old price (₹)').fill('110');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();

    await page.goto('/shop?q=mosambi');
    const card = page.getByTestId('product-card').filter({ hasText: 'E2E Sweet Lime' });
    await expect(card).toBeVisible();
    await expect(card.getByText('₹95')).toBeVisible();
    await expect(card.getByText('14% OFF', { exact: true })).toBeVisible();
  });

  test('admin updates order status and the customer sees it', async ({ page, browser }) => {
    // Customer places an order as a guest in a separate browser context.
    const customer = await browser.newContext();
    const cp = await customer.newPage();
    await cp.goto('/product/carrot');
    await cp.getByRole('button', { name: /Add to cart/ }).click();
    await cp.goto('/checkout');
    await fillCheckout(cp, { area: 'Kalyanpur (226022)' });
    await cp.getByRole('checkbox', { name: /I confirm my order of/ }).check();
    await cp.getByRole('button', { name: /Place order/ }).click();
    await expect(cp.getByRole('heading', { name: 'Order placed, thank you!' })).toBeVisible();
    const orderNumber = (await cp.getByTestId('order-number').innerText()).trim();

    const { phone, password } = adminCredentials();
    await signIn(page, phone, password, '/admin/orders');
    await page.getByLabel('Search orders').fill(orderNumber);
    await page.getByLabel('Search orders').press('Enter');
    await page.getByRole('link', { name: orderNumber }).click();
    await page.getByRole('button', { name: 'Mark as Confirmed' }).click();
    await expect(page.getByRole('button', { name: 'Mark as Preparing' })).toBeVisible();
    await page.getByRole('button', { name: 'Mark as Preparing' }).click();
    await expect(page.getByRole('button', { name: 'Mark as Out for Delivery' })).toBeVisible();

    await cp.reload();
    await expect(cp.locator('[aria-current="step"]')).toContainText('Preparing');
    await customer.close();
  });

  test('dashboard shows store alerts and the daily summary reflects a new order', async ({ page, browser }) => {
    const customer = await browser.newContext();
    const cp = await customer.newPage();
    await cp.goto('/product/onion');
    await cp.getByRole('button', { name: /Add to cart/ }).click();
    await cp.goto('/checkout');
    await fillCheckout(cp);
    await cp.getByRole('checkbox', { name: /I confirm my order of/ }).check();
    await cp.getByRole('button', { name: /Place order/ }).click();
    await expect(cp.getByRole('heading', { name: 'Order placed, thank you!' })).toBeVisible();
    await customer.close();

    const { phone, password } = adminCredentials();
    await signIn(page, phone, password);
    // The seeded campaign has ended, so the dashboard says no campaign is running.
    const alerts = page.getByRole('region', { name: 'Store alerts' });
    await expect(alerts.getByText(/No campaign on the homepage|ends in/)).toBeVisible();

    await page.getByRole('link', { name: 'Daily summary' }).click();
    await expect(page.getByRole('heading', { name: 'Daily summary' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Top products' })).toBeVisible();
    await expect(page.getByText(/^Onion ×\d+$/)).toBeVisible();
    await page.getByRole('button', { name: 'Previous day' }).click();
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible();
  });

  test('delivery areas are enforced at checkout after an admin disables one', async ({ page, browser }) => {
    const { phone, password } = adminCredentials();
    await signIn(page, phone, password, '/admin/areas');
    await page.getByRole('switch', { name: 'Deliver to Mahanagar' }).click();
    await expect(page.getByRole('switch', { name: 'Deliver to Mahanagar' })).toHaveAttribute('aria-checked', 'false');

    const customer = await browser.newContext();
    const cp = await customer.newPage();
    await cp.goto('/product/potato');
    await cp.getByRole('button', { name: /Add to cart/ }).click();
    await cp.goto('/checkout');
    await expect(cp.getByLabel('Delivery area').locator('option', { hasText: 'Mahanagar' })).toHaveCount(0);
    await customer.close();

    await page.getByRole('switch', { name: 'Deliver to Mahanagar' }).click();
    await expect(page.getByRole('switch', { name: 'Deliver to Mahanagar' })).toHaveAttribute('aria-checked', 'true');
  });
});
