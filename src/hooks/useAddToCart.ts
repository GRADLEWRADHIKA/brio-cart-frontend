import { useCallback } from 'react';
import { useCart } from '@/store/cart';
import { useUi } from '@/store/ui';
import type { Product, Variant } from '@/types';

export function useAddToCart() {
  const add = useCart((s) => s.add);
  const toast = useUi((s) => s.toast);
  return useCallback(
    (product: Product, variant: Variant, quantity = 1) => {
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
    [add, toast],
  );
}
