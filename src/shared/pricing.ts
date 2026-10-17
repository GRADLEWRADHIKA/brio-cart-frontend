import type { Paise } from './money';

/**
 * Centralised pricing. The server is the source of truth: it calls this with prices
 * read from the database. The client calls it with cached prices purely to display an
 * estimate — client totals are never trusted when an order is created.
 */

export interface DeliveryRules {
  /** Fee charged when the subtotal is below `freeDeliveryThreshold`. */
  deliveryFee: Paise;
  /** Subtotal at or above which delivery is free. 0 disables free delivery. */
  freeDeliveryThreshold: Paise;
  /** Orders below this subtotal cannot be placed. 0 disables the minimum. */
  minOrderAmount: Paise;
}

export interface PricedLine {
  unitPrice: Paise;
  quantity: number;
}

export interface Discount {
  /** Flat amount off the subtotal. Only applied when explicitly configured. */
  amount: Paise;
  label: string;
}

export interface OrderTotals {
  itemCount: number;
  subtotal: Paise;
  discount: Paise;
  discountLabel: string | null;
  deliveryFee: Paise;
  total: Paise;
  meetsMinimum: boolean;
  /** How much more must be added for free delivery; 0 when already free or not offered. */
  amountToFreeDelivery: Paise;
}

function assertLine(line: PricedLine) {
  if (!Number.isInteger(line.unitPrice) || line.unitPrice < 0) {
    throw new RangeError(`Invalid unit price: ${line.unitPrice}`);
  }
  if (!Number.isInteger(line.quantity) || line.quantity < 1) {
    throw new RangeError(`Invalid quantity: ${line.quantity}`);
  }
}

export function lineTotal(line: PricedLine): Paise {
  assertLine(line);
  return line.unitPrice * line.quantity;
}

export function computeTotals(
  lines: readonly PricedLine[],
  rules: DeliveryRules,
  discount?: Discount | null,
): OrderTotals {
  const subtotal = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);

  const discountAmount = discount ? Math.min(Math.max(0, Math.round(discount.amount)), subtotal) : 0;
  const discounted = subtotal - discountAmount;

  const freeDeliveryOffered = rules.freeDeliveryThreshold > 0;
  const qualifiesForFree = freeDeliveryOffered && discounted >= rules.freeDeliveryThreshold;
  const deliveryFee = subtotal === 0 || qualifiesForFree ? 0 : Math.max(0, rules.deliveryFee);

  return {
    itemCount,
    subtotal,
    discount: discountAmount,
    discountLabel: discountAmount > 0 && discount ? discount.label : null,
    deliveryFee,
    total: discounted + deliveryFee,
    meetsMinimum: subtotal > 0 && discounted >= Math.max(0, rules.minOrderAmount),
    amountToFreeDelivery:
      freeDeliveryOffered && !qualifiesForFree && subtotal > 0 ? rules.freeDeliveryThreshold - discounted : 0,
  };
}

export interface CouponRule {
  code: string;
  type: 'FLAT' | 'PERCENT';
  /** Paise for FLAT, whole percent for PERCENT. */
  value: number;
  minOrderAmount: number;
  maxDiscount: number | null;
}

export type CouponResult = { ok: true; discount: Discount } | { ok: false; reason: string };

/** Evaluates a store-configured coupon against a subtotal. Dates/usage limits are checked by the server. */
export function evaluateCoupon(coupon: CouponRule, subtotal: Paise): CouponResult {
  if (subtotal <= 0) return { ok: false, reason: 'Add items to use a coupon' };
  if (subtotal < coupon.minOrderAmount) {
    return { ok: false, reason: `Add items worth ₹${Math.ceil((coupon.minOrderAmount - subtotal) / 100)} more to use ${coupon.code}` };
  }
  let amount = coupon.type === 'PERCENT' ? Math.floor((subtotal * coupon.value) / 100) : coupon.value;
  if (coupon.maxDiscount !== null && coupon.maxDiscount > 0) amount = Math.min(amount, coupon.maxDiscount);
  amount = Math.max(0, Math.min(amount, subtotal));
  if (amount === 0) return { ok: false, reason: 'This coupon does not apply to your cart' };
  return { ok: true, discount: { amount, label: `Coupon ${coupon.code}` } };
}
