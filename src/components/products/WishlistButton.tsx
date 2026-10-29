import { Heart } from 'lucide-react';
import type { Product } from '@/types';
import { useWishlist } from '@/store/wishlist';
import { useUi } from '@/store/ui';
import { cn } from '@/utils';

/** Heart toggle that saves a product to the device's favourites. */
export function WishlistButton({ product, className, size = 'sm' }: { product: Pick<Product, 'id' | 'slug' | 'name' | 'imageUrl'>; className?: string; size?: 'sm' | 'lg' }) {
  const saved = useWishlist((s) => s.items.some((i) => i.productId === product.id));
  const toggle = useWishlist((s) => s.toggle);
  const toast = useUi((s) => s.toast);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${product.name} from saved items` : `Save ${product.name}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const now = toggle(product);
        toast(now ? { title: 'Saved', description: product.name, imageUrl: product.imageUrl, tone: 'success', action: { label: 'View saved', to: '/saved' } } : { title: 'Removed from saved', description: product.name, tone: 'info' });
      }}
      className={cn(
        'grid place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-110 active:scale-95',
        size === 'lg' ? 'size-12 border border-line' : 'size-9',
        className,
      )}
      data-testid="wishlist-button"
    >
      <Heart className={cn(size === 'lg' ? 'size-6' : 'size-[1.1rem]', saved ? 'fill-tomato-500 text-tomato-500' : 'text-charcoal-500')} />
    </button>
  );
}
