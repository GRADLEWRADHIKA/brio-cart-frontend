import { useCallback } from 'react';
import { availabilityAt, unavailableMessage, type Section } from '@shared/core';
import { useCart } from '@/store/cart';
import { useShopperLocation } from '@/hooks/useShopper';
import { useUi } from '@/store/ui';
import type { Product, Variant } from '@/types';

export function useAddToCart() {
  const add = useCart((s) => s.add);
  const toast = useUi((s) => s.toast);
  const { location, place } = useShopperLocation();
  return useCallback(
    (product: Product, variant: Variant, quantity = 1) => {
      // Fresh outside Lucknow, or a product not sold where the shopper is: blocked here for every button.
      const reach = product.delivery ? availabilityAt(product.delivery, location) : { ok: true as const };
      if (!reach.ok) {
        toast({ title: 'Not available at your location', description: unavailableMessage(reach.reason, (product.section ?? 'GROCERY') as Section, place), tone: 'info' });
        return 'unavailable' as const;
      }
      const result = add(product, variant, quantity);
      if (result === 'added') {
        toast({
          title: 'Added to cart',
          description: `${product.name} · ${variant.label}`,
          imageUrl: product.imageUrl,
          tone: 'success',
          action: { label: 'View cart', to: '/cart' },
        });
      } else if (result === 'limit') {
        toast({ title: 'Quantity limit reached', description: `You can order up to ${variant.maxQty} of ${product.name} (${variant.label}).`, tone: 'info' });
      } else {
        toast({ title: 'Currently unavailable', description: `${product.name} (${variant.label}) is out of stock right now.`, tone: 'error' });
      }
      return result;
    },
    [add, toast, location, place],
  );
}
