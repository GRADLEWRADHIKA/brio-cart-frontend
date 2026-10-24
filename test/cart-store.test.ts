import { beforeEach, describe, expect, it } from 'vitest';
import { computeTotals } from '@shared';
import { useCart, selectCount } from '@/store/cart';
import { combo, grapes, milk } from './fixtures';

const rules = { deliveryFee: 3000, freeDeliveryThreshold: 14900, minOrderAmount: 0 };
const totals = () => computeTotals(useCart.getState().lines.map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity })), rules);

describe('cart store', () => {
  beforeEach(() => useCart.setState({ lines: [] }));

  it('adds items, merges repeats and counts quantities', () => {
    const { add } = useCart.getState();
    expect(add(milk, milk.variants[0]!)).toBe('added');
    expect(add(milk, milk.variants[0]!, 2)).toBe('added');
    expect(add(combo, combo.variants[0]!)).toBe('added');
    expect(useCart.getState().lines).toHaveLength(2);
    expect(selectCount(useCart.getState())).toBe(4);
  });

  it('calculates subtotals and delivery with the shared pricing utility', () => {
    const { add, setQuantity } = useCart.getState();
    add(milk, milk.variants[0]!, 2);
    expect(totals()).toMatchObject({ subtotal: 7200, deliveryFee: 3000, total: 10200 });
    setQuantity('v-500', 5);
    expect(totals()).toMatchObject({ subtotal: 18000, deliveryFee: 0, total: 18000 });
  });

  it('refuses unavailable items and enforces the per-order limit', () => {
    const { add, setQuantity } = useCart.getState();
    expect(add(grapes, grapes.variants[0]!)).toBe('unavailable');
    expect(useCart.getState().lines).toHaveLength(0);
    expect(add(milk, milk.variants[1]!, 5)).toBe('limit');
    expect(useCart.getState().lines[0]!.quantity).toBe(3);
    setQuantity('v-1l', 9);
    expect(useCart.getState().lines[0]!.quantity).toBe(3);
  });

  it('removes a line when quantity reaches zero', () => {
    const { add, setQuantity } = useCart.getState();
    add(milk, milk.variants[0]!);
    setQuantity('v-500', 0);
    expect(useCart.getState().lines).toHaveLength(0);
  });

  it('switches pack size and merges with an existing line', () => {
    const { add, changeVariant } = useCart.getState();
    add(milk, milk.variants[0]!, 1);
    add(milk, milk.variants[1]!, 1);
    changeVariant('v-500', 'v-1l');
    const lines = useCart.getState().lines;
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ variantId: 'v-1l', variantLabel: '1 litre', unitPrice: 7200, quantity: 2 });
  });

  it('applies server validation: updates prices and flags unavailable items', () => {
    const { add, applyValidation } = useCart.getState();
    add(milk, milk.variants[0]!, 1);
    add(combo, combo.variants[0]!, 1);
    const { priceChanged } = applyValidation({
      lines: [
        { variantId: 'v-500', productId: 'p-milk', productSlug: milk.slug, productName: milk.name, variantLabel: '500 ml', imageUrl: null, unitPrice: 3800, mrp: null, quantity: 1, lineTotal: 3800, maxQty: 10, shop: null },
      ],
      issues: [{ variantId: 'v-combo', code: 'UNAVAILABLE', message: 'Navratri Combo is currently out of stock' }],
    });
    expect(priceChanged).toBe(true);
    const [m, c] = useCart.getState().lines;
    expect(m!.unitPrice).toBe(3800);
    expect(c!.issue?.code).toBe('UNAVAILABLE');
  });

  it('persists to localStorage so the cart survives a refresh', () => {
    useCart.getState().add(milk, milk.variants[0]!, 2);
    const saved = JSON.parse(localStorage.getItem('briocart.cart.v1')!);
    expect(saved.state.lines[0]).toMatchObject({ variantId: 'v-500', quantity: 2 });
  });
});
