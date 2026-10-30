import { Star, Users } from 'lucide-react';
import type { Product } from '@/types';
import { cn } from '@/utils';

/** "100+" style rounding for how many people bought it; exact below 10. */
export function boughtLabel(n: number) {
  if (n < 10) return String(n);
  const step = n < 100 ? 10 : n < 1000 ? 50 : 500;
  return `${Math.floor(n / step) * step}+`;
}

/**
 * Real figures only: customers' quality rating after delivery, and how many people bought it.
 * Shows nothing until there is something to show.
 */
export function ProductRating({ product, size = 'sm', className }: { product: Pick<Product, 'rating' | 'boughtBy'>; size?: 'sm' | 'lg'; className?: string }) {
  const r = product.rating;
  const bought = product.boughtBy ?? 0;
  if (!r && bought === 0) return null;
  const lg = size === 'lg';
  return (
    <p className={cn('flex flex-wrap items-center gap-x-2 gap-y-1', lg ? 'text-sm' : 'text-[0.72rem]', className)} data-testid="product-rating">
      {r && (
        <span className={cn('inline-flex items-center gap-1 rounded-full font-extrabold', lg ? 'bg-leaf-600 px-2.5 py-1 text-white' : 'text-forest-800')} aria-label={`Quality rated ${r.average} out of 5 by ${r.count} customer${r.count === 1 ? '' : 's'}`}>
          <Star className={cn(lg ? 'size-4' : 'size-3 text-turmeric-400')} fill="currentColor" strokeWidth={0} />
          {r.average.toFixed(1)}
          <span className={cn('font-semibold', lg ? 'text-white/85' : 'text-charcoal-500')}>({r.count})</span>
        </span>
      )}
      {lg && r && <span className="font-semibold text-charcoal-600">Quality rating from customers</span>}
      {bought > 0 && (
        <span className="inline-flex items-center gap-1 font-semibold text-charcoal-500">
          <Users className={lg ? 'size-4' : 'size-3'} /> {lg ? `Bought by ${boughtLabel(bought)} ${bought === 1 ? 'person' : 'people'}` : `${boughtLabel(bought)} bought`}
        </span>
      )}
    </p>
  );
}
