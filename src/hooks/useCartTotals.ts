import { useMemo } from 'react';
import { computeSplitTotals } from '@shared/core';
import { useCart, type CartLine } from '@/store/cart';
import { useDeliveryRules } from './useStoreInfo';

export interface SellerGroup {
  shop: { id: string; name: string } | null;
  lines: CartLine[];
}

/** Brio Cart's own items first, then each shop in the order it first appears, like the server. */
export function groupBySeller(lines: CartLine[]): SellerGroup[] {
  const map = new Map<string, SellerGroup>();
  for (const l of [...lines].sort((a, b) => Number(!!a.shop) - Number(!!b.shop))) {
    const key = l.shop?.id ?? '';
    const g = map.get(key) ?? { shop: l.shop ?? null, lines: [] };
    g.lines.push(l);
    map.set(key, g);
  }
  return [...map.values()];
}

/**
 * Client-side estimate using the same pricing utility as the server. A cart with items from several
 * sellers becomes one order per seller, each with its own delivery fee. The server recomputes on order.
 */
export function useCartTotals() {
  const lines = useCart((s) => s.lines);
  const rules = useDeliveryRules();
  return useMemo(() => {
    const orderable = lines.filter((l) => !l.issue);
    const sellers = groupBySeller(orderable);
    const split = computeSplitTotals(sellers.map((g) => g.lines.map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity }))), rules);
    const groups = sellers.map((g, i) => ({ ...g, totals: split.groups[i]! }));
    return { totals: split.totals, groups, rules, orderable, lines };
  }, [lines, rules]);
}
