import { useMutation } from '@tanstack/react-query';
import { catalogApi } from '@/api/endpoints';
import { useCart } from '@/store/cart';
import { useUi } from '@/store/ui';
import type { Order } from '@/types';

/** Adds a past order's items back to the cart at today's prices, skipping anything no longer sold. */
export function useReorder() {
  const addLines = useCart((s) => s.addLines);
  const setCartOpen = useUi((s) => s.setCartOpen);
  const toast = useUi((s) => s.toast);
  return useMutation({
    mutationFn: async (order: Pick<Order, 'items'>) => {
      const items = order.items.filter((i) => i.variantId).map((i) => ({ variantId: i.variantId!, quantity: i.quantity }));
      return catalogApi.validateCart(items);
    },
    onSuccess: (v) => {
      addLines(
        v.lines.map((l) => ({
          variantId: l.variantId,
          productId: l.productId,
          slug: l.productSlug,
          name: l.productName,
          nameHi: null,
          variantLabel: l.variantLabel,
          unitPrice: l.unitPrice,
          mrp: l.mrp,
          imageUrl: l.imageUrl,
          quantity: l.quantity,
          maxQty: l.maxQty,
          issue: null,
        })),
      );
      if (v.issues.length) toast({ title: `${v.issues.length} item${v.issues.length > 1 ? 's are' : ' is'} unavailable now`, description: 'Everything else was added to your cart.', tone: 'info' });
      setCartOpen(true);
    },
  });
}
