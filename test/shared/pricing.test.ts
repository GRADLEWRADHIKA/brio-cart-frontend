import { describe, expect, it } from 'vitest';
import { computeSplitTotals, computeTotals, lineTotal } from '@shared/pricing';
import { formatINR, rupeesToPaise } from '@shared/money';

const rules = { deliveryFee: 3000, freeDeliveryThreshold: 14900, minOrderAmount: 0 };

describe('pricing', () => {
  it('computes line totals in paise', () => {
    expect(lineTotal({ unitPrice: 2100, quantity: 3 })).toBe(6300);
  });

  it('charges delivery below the free-delivery threshold', () => {
    const t = computeTotals([{ unitPrice: 2100, quantity: 2 }, { unitPrice: 3900, quantity: 1 }], rules);
    expect(t.subtotal).toBe(8100);
    expect(t.deliveryFee).toBe(3000);
    expect(t.total).toBe(11100);
    expect(t.itemCount).toBe(3);
    expect(t.amountToFreeDelivery).toBe(6800);
  });

  it('makes delivery free exactly at the threshold', () => {
    const t = computeTotals([{ unitPrice: 14900, quantity: 1 }], rules);
    expect(t.deliveryFee).toBe(0);
    expect(t.total).toBe(14900);
    expect(t.amountToFreeDelivery).toBe(0);
  });

  it('returns zeroes for an empty cart and does not charge delivery', () => {
    const t = computeTotals([], rules);
    expect(t).toMatchObject({ subtotal: 0, deliveryFee: 0, total: 0, meetsMinimum: false });
  });

  it('enforces a configured minimum order amount', () => {
    const r = { ...rules, minOrderAmount: 10000 };
    expect(computeTotals([{ unitPrice: 9999, quantity: 1 }], r).meetsMinimum).toBe(false);
    expect(computeTotals([{ unitPrice: 10000, quantity: 1 }], r).meetsMinimum).toBe(true);
  });

  it('applies only configured discounts and never below zero', () => {
    const t = computeTotals([{ unitPrice: 5000, quantity: 1 }], rules, { amount: 9000, label: 'Promo' });
    expect(t.discount).toBe(5000);
    expect(t.total).toBe(0 + 3000);
    expect(computeTotals([{ unitPrice: 5000, quantity: 1 }], rules).discount).toBe(0);
  });

  it('treats a zero threshold as "free delivery not offered"', () => {
    const t = computeTotals([{ unitPrice: 100000, quantity: 1 }], { ...rules, freeDeliveryThreshold: 0 });
    expect(t.deliveryFee).toBe(3000);
    expect(t.amountToFreeDelivery).toBe(0);
  });

  it('rejects invalid quantities and prices', () => {
    expect(() => lineTotal({ unitPrice: 100, quantity: 0 })).toThrow(RangeError);
    expect(() => lineTotal({ unitPrice: 10.5, quantity: 1 })).toThrow(RangeError);
  });

  it('formats rupees', () => {
    expect(rupeesToPaise(21)).toBe(2100);
    expect(formatINR(124900)).toBe('₹1,249');
  });
});

import { evaluateCoupon } from '@shared/pricing';

describe('coupons', () => {
  const flat = { code: 'FRESH50', type: 'FLAT' as const, value: 5000, minOrderAmount: 29900, maxDiscount: null };
  const pct = { code: 'SAVE10', type: 'PERCENT' as const, value: 10, minOrderAmount: 0, maxDiscount: 4000 };

  it('applies a flat coupon above its minimum order', () => {
    expect(evaluateCoupon(flat, 30000)).toEqual({ ok: true, discount: { amount: 5000, label: 'Coupon FRESH50' } });
  });
  it('explains how much more is needed below the minimum', () => {
    const r = evaluateCoupon(flat, 20000);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('₹99 more');
  });
  it('caps percentage coupons at the configured maximum', () => {
    expect(evaluateCoupon(pct, 20000)).toMatchObject({ ok: true, discount: { amount: 2000 } });
    expect(evaluateCoupon(pct, 90000)).toMatchObject({ ok: true, discount: { amount: 4000 } });
  });
  it('never discounts more than the subtotal', () => {
    expect(evaluateCoupon({ ...flat, minOrderAmount: 0 }, 3000)).toMatchObject({ ok: true, discount: { amount: 3000 } });
  });
});

describe('computeSplitTotals (one order per seller)', () => {
  const rules = { deliveryFee: 3000, freeDeliveryThreshold: 14900, minOrderAmount: 10000 };

  it('charges each seller its own delivery fee and adds the orders up', () => {
    const { groups, totals } = computeSplitTotals([[{ unitPrice: 2100, quantity: 2 }], [{ unitPrice: 12000, quantity: 1 }]], rules);
    expect(groups.map((g) => g.deliveryFee)).toEqual([3000, 3000]);
    expect(totals).toMatchObject({ subtotal: 16200, deliveryFee: 6000, total: 22200, itemCount: 3, amountToFreeDelivery: 0 });
  });

  it('applies the minimum to the whole checkout, not each seller', () => {
    const { groups, totals } = computeSplitTotals([[{ unitPrice: 6000, quantity: 1 }], [{ unitPrice: 5000, quantity: 1 }]], rules);
    expect(groups.every((g) => !g.meetsMinimum)).toBe(true);
    expect(totals.meetsMinimum).toBe(true);
  });

  it('shares a discount in proportion to each seller, to the paisa', () => {
    const { groups, totals } = computeSplitTotals([[{ unitPrice: 1000, quantity: 1 }], [{ unitPrice: 2000, quantity: 1 }]], rules, { amount: 1001, label: 'Coupon X' });
    expect(groups.map((g) => g.discount)).toEqual([333, 668]);
    expect(totals).toMatchObject({ discount: 1001, discountLabel: 'Coupon X' });
  });

  it('matches computeTotals for a single seller', () => {
    const lines = [{ unitPrice: 4500, quantity: 2 }];
    expect(computeSplitTotals([lines], rules).totals).toEqual(computeTotals(lines, rules));
  });
});
