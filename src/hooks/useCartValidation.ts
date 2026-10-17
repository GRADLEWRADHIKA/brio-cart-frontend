import { useEffect, useRef, useState } from 'react';
import { catalogApi } from '@/api/endpoints';
import { useCart } from '@/store/cart';
import type { CartValidation } from '@/types';

/**
 * Re-checks the cart against current server prices and availability whenever its contents
 * change. Lines that can no longer be bought are flagged instead of silently dropped.
 */
export function useCartValidation() {
  const lines = useCart((s) => s.lines);
  const applyValidation = useCart((s) => s.applyValidation);
  const [state, setState] = useState<{ loading: boolean; priceChanged: boolean; result: CartValidation | null; error: string | null }>({
    loading: false,
    priceChanged: false,
    result: null,
    error: null,
  });
  const signature = lines.map((l) => `${l.variantId}:${l.quantity}`).join('|');
  const seq = useRef(0);

  useEffect(() => {
    if (!signature) {
      setState({ loading: false, priceChanged: false, result: null, error: null });
      return;
    }
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true }));
    const t = setTimeout(async () => {
      try {
        const items = useCart.getState().lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity }));
        const result = await catalogApi.validateCart(items);
        if (id !== seq.current) return;
        const { priceChanged } = applyValidation(result);
        setState((s) => ({ loading: false, priceChanged: s.priceChanged || priceChanged, result, error: null }));
      } catch (e) {
        if (id === seq.current) setState((s) => ({ ...s, loading: false, error: (e as Error).message }));
      }
    }, 250);
    return () => clearTimeout(t);
  }, [signature, applyValidation]);

  return state;
}
