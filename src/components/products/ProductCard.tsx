import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPinOff, Minus, Plus, Star } from 'lucide-react';
import { formatINR } from '@shared/core';
import type { Product } from '@/types';
import { useCart } from '@/store/cart';
import { useAddToCart } from '@/hooks/useAddToCart';
import { useProductReach } from '@/hooks/useShopper';
import { ProductImage } from '@/components/ui/misc';
import { cn, discountPercent } from '@/utils';
import { WishlistButton } from './WishlistButton';
import { ProductRating } from './ProductRating';

/** Products the store has put in the Bestsellers collection. */
export const isBestSeller = (p: Pick<Product, 'collections'>) => p.collections.includes('bestsellers');

/** The "Best Seller" label shown at the top of a product's image. */
export function BestSellerBadge({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-[#fdf3c4] font-bold text-[#7a5a00]',
        size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-[0.66rem]',
      )}
    >
      <Star className={size === 'lg' ? 'size-4' : 'size-3'} fill="currentColor" strokeWidth={0} /> Best Seller
    </span>
  );
}

/** The one product card used across the homepage rails, catalogue grid and related items. */
export const ProductCard = memo(function ProductCard({ product, eager, className }: { product: Product; eager?: boolean; className?: string }) {
  const firstInStock = product.variants.find((v) => v.inStock) ?? product.variants[0]!;
  const [variantId, setVariantId] = useState(firstInStock.id);
  const variant = product.variants.find((v) => v.id === variantId) ?? firstInStock;
  const qty = useCart((s) => s.lines.find((l) => l.variantId === variant.id)?.quantity ?? 0);
  const setQuantity = useCart((s) => s.setQuantity);
  const addToCart = useAddToCart();
  const off = discountPercent(variant.price, variant.mrp);
  const href = `/product/${product.slug}`;
  const label = `${product.name} ${variant.label}`;
  // Can't be delivered to the shopper's location (e.g. Fresh outside Lucknow): shown greyed out.
  const reach = useProductReach(product);
  const away = !reach.ok;

  return (
    <article
      className={cn(
        'group relative flex flex-col rounded-2xl border border-line bg-white p-3 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-mint-200 hover:shadow-lift',
        (!product.inStock || away) && 'opacity-80',
        className,
      )}
      data-testid="product-card"
    >
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col items-start gap-1">
        {isBestSeller(product) ? <BestSellerBadge /> : off > 0 ? <span className="rounded-full bg-tomato-100 px-2 py-0.5 text-[0.66rem] font-extrabold text-tomato-500">{off}% OFF</span> : null}
        {away ? (
          <span className="rounded-full bg-charcoal-900/85 px-2 py-0.5 text-[0.66rem] font-bold text-white">{product.section === 'FRESH' ? 'Coming soon to your city' : 'Not delivered here'}</span>
        ) : (
          !product.inStock && (
            <span className="rounded-full bg-charcoal-900/85 px-2 py-0.5 text-[0.66rem] font-bold text-white">{product.shop && !product.shop.isOpen ? 'Shop closed' : 'Out of stock'}</span>
          )
        )}
        {variant.lowStock !== null && product.inStock && <span className="rounded-full bg-turmeric-100 px-2 py-0.5 text-[0.66rem] font-extrabold text-[#8a5a00]">Only {variant.lowStock} left</span>}
      </div>
      <WishlistButton product={product} className="absolute right-2 top-2 z-10 bg-transparent shadow-none backdrop-blur-0" />

      <Link to={href} className="mt-5 block" aria-label={`${product.name}, view details`}>
        <div className="relative mx-auto aspect-[4/3] w-full overflow-hidden rounded-xl bg-white">
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            eager={eager}
            className="size-full"
            imgClassName={cn('object-contain! produce-blend transition-transform duration-700 ease-out group-hover:scale-[1.06]', (!product.inStock || away) && 'grayscale')}
          />
        </div>
      </Link>

      <div className="flex flex-1 flex-col items-center px-1 pt-3 text-center">
        <h3 className="line-clamp-2 font-sans text-[0.95rem] font-semibold leading-tight tracking-normal text-charcoal-900">
          <Link to={href} className="hover:text-forest-700">
            {product.name}
          </Link>
        </h3>
        {product.nameHi && (
          <p lang="hi" className="mt-0.5 truncate text-[0.72rem] leading-tight text-charcoal-400">
            {product.nameHi}
          </p>
        )}
        <p className="mt-1 text-sm tabular-nums">
          <span className="font-extrabold text-charcoal-900">{formatINR(variant.price)}</span>
          {off > 0 && (
            <s className="ml-1 text-xs text-charcoal-400" aria-label={`was ${formatINR(variant.mrp!)}`}>
              {formatINR(variant.mrp!)}
            </s>
          )}
          <span className="text-xs text-charcoal-500"> / {variant.label}</span>
        </p>
        {product.shop && (
          <Link to={`/shops/${product.shop.slug}`} className="mt-0.5 max-w-full truncate text-[0.7rem] text-charcoal-500 hover:text-forest-700" data-testid="sold-by">
            Sold by <span className="font-bold">{product.shop.name}</span>
          </Link>
        )}
        <ProductRating product={product} className="mt-1 justify-center" />

        {product.variants.length > 1 && (
          <div className="no-scrollbar mt-2 flex max-w-full gap-1 overflow-x-auto" role="radiogroup" aria-label={`Pack size for ${product.name}`}>
            {product.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={v.id === variant.id}
                disabled={!v.inStock}
                onClick={() => setVariantId(v.id)}
                className={cn(
                  'shrink-0 rounded-full border px-2 py-0.5 text-[0.68rem] font-bold transition',
                  v.id === variant.id ? 'border-forest-800 bg-mint-50 text-forest-800' : 'border-line text-charcoal-700 hover:border-forest-700/40',
                  !v.inStock && 'line-through opacity-50',
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-auto w-full pt-3">
          {away ? (
            <p className="flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-ivory-100 px-2 text-[0.72rem] font-semibold leading-tight text-charcoal-500" title={reach.message ?? undefined}>
              <MapPinOff className="size-3.5 shrink-0" /> <span className="line-clamp-2">{product.section === 'FRESH' ? 'Lucknow only' : 'Not available here'}</span>
            </p>
          ) : qty > 0 ? (
            <div className="flex h-9 w-full items-center justify-between rounded-full bg-forest-800 px-1 text-white" role="group" aria-label={`Quantity for ${label}`}>
              <button type="button" className="grid size-8 place-items-center rounded-full transition hover:bg-white/15 active:scale-90" onClick={() => setQuantity(variant.id, qty - 1)} aria-label={qty === 1 ? `Remove ${label}` : `Decrease ${label}`}>
                <Minus className="size-4" strokeWidth={2.6} />
              </button>
              <span key={qty} className="animate-pop text-sm font-extrabold tabular-nums" aria-live="polite">
                {qty}
              </span>
              <button
                type="button"
                className="grid size-8 place-items-center rounded-full transition hover:bg-white/15 active:scale-90 disabled:opacity-40"
                onClick={() => setQuantity(variant.id, qty + 1)}
                disabled={qty >= variant.maxQty}
                aria-label={`Increase ${label}`}
              >
                <Plus className="size-4" strokeWidth={2.6} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!variant.inStock}
              onClick={() => addToCart(product, variant)}
              className="btn-outline h-9 w-full border-line text-[0.82rem] text-charcoal-900 hover:border-forest-800 hover:text-forest-800"
              aria-label={variant.inStock ? `Add ${label} to cart` : `${product.name} is out of stock`}
            >
              {variant.inStock ? (
                <>
                  <Plus className="size-3.5" strokeWidth={2.6} /> Add to Cart
                </>
              ) : (
                'Sold out'
              )}
            </button>
          )}
        </div>
      </div>
    </article>
  );
});

export function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-white p-3" aria-hidden>
      <div className="skeleton mt-5 aspect-[4/3] rounded-xl" />
      <div className="flex flex-col items-center space-y-2 px-1.5 pb-1 pt-3">
        <div className="skeleton h-4 w-3/5" />
        <div className="skeleton h-3 w-2/5" />
        <div className="skeleton mt-2 h-9 w-full rounded-full" />
      </div>
    </div>
  );
}

export function ProductGrid({ products, loading, skeletons = 8, className }: { products?: Product[]; loading?: boolean; skeletons?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5', className)}>
      {loading
        ? Array.from({ length: skeletons }, (_, i) => <ProductCardSkeleton key={i} />)
        : products?.map((p, i) => <ProductCard key={p.id} product={p} eager={i < 4} />)}
    </div>
  );
}
