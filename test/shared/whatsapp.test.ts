import { describe, expect, it } from 'vitest';
import { buildWhatsAppUrl, composeWhatsAppOrderMessage, toWhatsAppNumber } from '@shared/whatsapp';
import { checkoutSchema, indianMobile } from '@shared/schemas';

describe('whatsapp', () => {
  it('normalises Indian numbers to international format', () => {
    expect(toWhatsAppNumber('8957032882')).toBe('918957032882');
    expect(toWhatsAppNumber('+91 89570 32882')).toBe('918957032882');
    expect(toWhatsAppNumber('08957032882')).toBe('918957032882');
    expect(() => toWhatsAppNumber('12345')).toThrow();
  });

  it('builds a wa.me link with a safely encoded message', () => {
    const url = buildWhatsAppUrl('8957032882', 'Aloo & Pyaz #1 ?\nदूध');
    expect(url.startsWith('https://wa.me/918957032882?text=')).toBe(true);
    const text = new URL(url).searchParams.get('text');
    expect(text).toBe('Aloo & Pyaz #1 ?\nदूध');
    expect(buildWhatsAppUrl('8957032882')).toBe('https://wa.me/918957032882');
  });

  it('frames a cart without an order number as a confirmation request', () => {
    const msg = composeWhatsAppOrderMessage({
      customerName: 'Asha',
      area: 'Aliganj',
      lines: [{ name: 'Potato', variantLabel: '1 kg', quantity: 2, unitPrice: 2100 }],
      subtotal: 4200,
      deliveryFee: 3000,
      total: 7200,
    });
    expect(msg).toContain('Please confirm availability');
    expect(msg).toContain('1. Potato (1 kg) x 2 @ Rs. 21 = Rs. 42');
    expect(msg).toContain('Delivery: Rs. 30');
    expect(msg).toContain('Estimated total: Rs. 72');
    expect(msg).toContain('Delivery area: Aliganj, Lucknow');
    expect(msg).not.toContain('Address:');
  });

  it('references the real order number when one exists', () => {
    const msg = composeWhatsAppOrderMessage({
      orderNumber: 'BC-2610-ABCD',
      lines: [{ name: 'Milk', variantLabel: '1 litre', quantity: 1, unitPrice: 7200 }],
      subtotal: 7200,
      deliveryFee: 0,
      total: 7200,
    });
    expect(msg).toContain('placed order BC-2610-ABCD');
    expect(msg).toContain('Delivery: Free');
    expect(msg).toContain('Order total: Rs. 72');
  });
});

describe('validation schemas', () => {
  it('normalises mobile numbers', () => {
    expect(indianMobile.parse('+91 89570 32882')).toBe('8957032882');
    expect(indianMobile.safeParse('5957032882').success).toBe(false);
  });

  it('requires explicit confirmation for checkout', () => {
    const base = {
      idempotencyKey: 'x'.repeat(20),
      customer: { name: 'Asha', phone: '9876543210', areaId: 'a', house: '12B', street: 'Sector C' },
      paymentMethod: 'COD',
      items: [{ variantId: 'v', quantity: 1 }],
    };
    expect(checkoutSchema.safeParse(base).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, confirmed: true }).success).toBe(true);
  });
});
