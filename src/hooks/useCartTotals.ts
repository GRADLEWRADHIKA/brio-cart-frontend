import { useMemo } from 'react';
import { computeTotals } from '@shared/core';
import { useCart } from '@/store/cart';
import { useDeliveryRules } from './useStoreInfo';

/** Client-side estimate using the same pricing utility as the server. The server recomputes on order. */
export function useCartTotals() {
  const lines = useCart((s) => s.lines);
  const rules = useDeliveryRules();
  return useMemo(() => {
    const orderable = lines.filter((l) => !l.issue);
    return { totals: computeTotals(orderable.map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity })), rules), rules, orderable, lines };
  }, [lines, rules]);
}
