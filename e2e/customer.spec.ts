import { expect, test } from '@playwright/test';
import { captureWindowOpen, fillCheckout, orderCount } from './helpers';

test.describe('customer journey', () => {
  test('homepage shows the hero, categories, campaign and product rails @mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Your Everyday');
    await expect(page.getByRole('heading', { name: 'Fresh Vegetables' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Daily Essentials' })).toBeVisible();
    // The seeded Navratri campaign runs until 21 Oct 2026 (IST); after that the banner is correctly hidden.
    if (Date.now() <= new Date('2026-10-21T23:59:59+05:30').getTime()) {
      await expect(page.getByText('इस नवरात्रि, ताज़गी और अच्छी गुणवत्ता के साथ करें शुभ शुरुआत!')).toBeVisible();
    }
    await expect(page.getByRole('heading', { name: 'Bestsellers' })).toBeVisible();
    await expect(page.getByText('Fresh groceries. Fair prices. Delivered with care.')).toBeVisible();
    for (const area of ['Aliganj', 'Vikas Nagar', 'Mahanagar', 'Nirala Nagar', 'Kalyanpur']) {
      await expect(page.locator('#areas-title').locator('xpath=ancestor::section').getByRole('listitem').filter({ hasText: area })).toBeVisible();
    }
  });

  test('browse a category, search, and open product details', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Fresh Fruits.*items/ }).click();
    await expect(page).toHaveURL(/category=fresh-fruits/);
    await expect(page.getByRole('heading', { level: 1, name: 'Fresh Fruits' })).toBeVisible();
    await expect(page.getByTestId('product-card').first()).toBeVisible();

    // Hinglish search from the header
    const search = page.getByRole('combobox', { name: 'Search groceries' });
    await search.fill('paneer');
    await search.press('Enter');
    await expect(page).toHaveURL(/q=paneer/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('paneer');
    await page.getByRole('link', { name: 'Paneer', exact: true }).first().click();
    await expect(page.getByRole('heading', { level: 1, name: 'Paneer' })).toBeVisible();
    await expect(page.getByText('Pack size')).toBeVisible();
  });

  test('cart: add, change quantity and variant, totals, persistence, empty state @mobile', async ({ page }) => {
    await page.goto('/product/amul-gold-full-cream-milk');
    await page.locator('fieldset').getByText('1 litre').click();
    await page.getByRole('button', { name: /Add to cart/ }).click();
    await expect(page.getByTestId('cart-count').first()).toHaveText('1');

    await page.goto('/cart');
    // Scope to the cart page (the closed cart drawer renders the same lines).
    const cartPage = page.getByRole('region', { name: 'Cart items' });
    const line = cartPage.getByTestId('cart-line');
    await expect(line).toHaveCount(1);
    await line.getByRole('button', { name: /Increase/ }).click();
    await expect(line.getByText('₹144')).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Order summary' }).getByText('Items (2)')).toBeVisible();
    // ₹144 is below the ₹149 free-delivery threshold → ₹30 delivery.
    await expect(page.getByRole('complementary', { name: 'Order summary' }).getByText('Add ₹5 more for free delivery')).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Order summary' }).getByText('₹174')).toBeVisible();

    // Switch pack size from the cart
    await line.getByRole('combobox').selectOption({ label: '500 ml · ₹36' });
    await expect(line.getByText('₹72', { exact: true })).toBeVisible();

    // Persisted across a reload
    await page.reload();
    await expect(cartPage.getByTestId('cart-line')).toHaveCount(1);
    await expect(cartPage.getByTestId('cart-line').getByText('₹72', { exact: true })).toBeVisible();

    // Remove → empty state with Continue Shopping
    await cartPage.getByRole('button', { name: /Remove .* from cart/ }).click();
    await expect(page.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Continue shopping/ })).toBeVisible();
  });

  test('out-of-stock products cannot be added', async ({ page }) => {
    await page.goto('/product/grapes');
    await expect(page.getByRole('button', { name: /Add to cart/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Ask when it’s back/ })).toBeVisible();
  });

  test('WhatsApp ordering composes an encoded wa.me link and does not create an order', async ({ page, request }) => {
    const opened = await captureWindowOpen(page);
    const before = await orderCount(request);
    await page.goto('/product/potato');
    await page.getByRole('button', { name: /Add to cart/ }).click();
    await page.goto('/cart');
    await page.getByRole('button', { name: /Send list on WhatsApp instead/ }).click();
    await expect.poll(opened).toHaveLength(1);
    const url = new URL((await opened())[0]!);
    expect(url.origin + url.pathname).toBe('https://wa.me/918957032882');
    const text = url.searchParams.get('text')!;
    expect(text).toContain('Please confirm availability');
    expect(text).toContain('1. Potato (1 kg) x 1 @ Rs. 21 = Rs. 21');
    expect(text).toContain('Estimated total: Rs. 51');
    expect(await orderCount(request)).toBe(before);
  });

  test('checkout validates input, places a real order once, and shows the confirmation @mobile', async ({ page, request }) => {
    await page.goto('/product/onion');
    await page.getByRole('button', { name: /Add to cart/ }).click();
    await page.goto('/checkout');

    // Invalid submission
    await page.getByLabel('Mobile number').fill('12345');
    await page.getByRole('button', { name: /Place order/ }).click();
    await expect(page.getByText('Name must be at least 2 characters')).toBeVisible();
    await expect(page.getByText('Enter a valid 10-digit mobile number')).toBeVisible();
    await expect(page.getByText('Choose a delivery area')).toBeVisible();
    await expect(page.getByText('Please confirm your order details')).toBeVisible();
    await expect(page).toHaveURL(/\/checkout$/);

    // Online payment is visibly unavailable
    await expect(page.getByRole('radio', { name: /Pay Online/ })).toBeDisabled();

    const before = await orderCount(request);
    await fillCheckout(page);
    await page.getByRole('checkbox', { name: /I confirm my order of/ }).check();
    // A rapid double-tap (two clicks in the same tick) must not create two orders.
    await page.getByRole('button', { name: /Place order/ }).evaluate((b: HTMLButtonElement) => {
      b.click();
      b.click();
    });

    await expect(page.getByRole('heading', { name: 'Order placed, thank you!' })).toBeVisible();
    const orderNumber = (await page.getByTestId('order-number').innerText()).trim();
    expect(orderNumber).toMatch(/^BC-\d{6}-[A-Z2-9]{5}/);
    await expect(page.getByText('Cash on Delivery').first()).toBeVisible();
    await expect(page.getByText('Pending').first()).toBeVisible();
    expect(await orderCount(request)).toBe(before + 1);

    // Cart cleared after the backend confirmed the order
    await expect(page.getByTestId('cart-count').first()).toHaveText('0');
  });
});
