import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Star } from 'lucide-react';
import type { Product } from '@/types';
import { useCart } from '@/store/cart';
import { useAddToCart } from '@/hooks/useAddToCart';
import { Price, ProductImage, QuantityStepper } from '@/components/ui/misc';
import { cn, discountPercent } from '@/utils';
import { WishlistButton } from './WishlistButton';
import { ProductRating } from './ProductRating';
import { tintFor } from './tints';

/** Products the store has put in the Bestsellers collection. */
export const isBestSeller = (p: Pick<Product, 'collections'>) => p.collections.includes('bestsellers');

/** The "Best Seller" label shown at the top of a product's image. */
export function BestSellerBadge({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-turmeric-400 font-extrabold uppercase tracking-wide text-forest-900 shadow-sm',
        size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-[0.68rem]',
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
  const tint = tintFor(product.category.slug);
  const off = discountPercent(variant.price, variant.mrp);
  const href = `/product/${product.slug}`;

  return (
    <article
      className={cn(
        'group relative flex flex-col rounded-[1.6rem] border border-line/80 bg-white p-2 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-transparent hover:shadow-lift',
        !product.inStock && 'opacity-80',
        className,
      )}
      data-testid="product-card"
    >
      <Link to={href} className="relative block rounded-[1.25rem]" aria-label={`${product.name}, view details`}>
        <div className={cn('relative aspect-square overflow-hidden rounded-[1.25rem]', tint.plate)}>
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            eager={eager}
            className="size-full"
            imgClassName={cn('transition-transform duration-700 ease-out group-hover:scale-[1.08]', !product.inStock && 'grayscale')}
          />
        </div>
        <div className="pointer-events-none absolute left-2 top-2 flex flex-col items-start gap-1">
          {isBestSeller(product) && <BestSellerBadge />}
          {off > 0 && <span className="rounded-full bg-tomato-500 px-2 py-0.5 text-[0.68rem] font-extrabold text-white shadow-sm">{off}% OFF</span>}
          {!product.inStock && (
            <span className="rounded-full bg-charcoal-900/85 px-2 py-0.5 text-[0.68rem] font-bold text-white">{product.shop && !product.shop.isOpen ? 'Shop closed' : 'Out of stock'}</span>
          )}
          {variant.lowStock !== null && product.inStock && (
            <span className="rounded-full bg-turmeric-400 px-2 py-0.5 text-[0.68rem] font-extrabold text-forest-900">Only {variant.lowStock} left</span>
          )}
        </div>
      </Link>
      <WishlistButton product={product} className="absolute right-4 top-4" />

      <div className="flex flex-1 flex-col px-1.5 pb-1 pt-3">
        {product.nameHi && (
          <p lang="hi" className="truncate text-[0.78rem] leading-tight text-charcoal-500">
            {product.nameHi}
          </p>
        )}
        <h3 className="mt-0.5 line-clamp-2 min-h-[2.5rem] font-sans text-[0.95rem] font-bold leading-tight tracking-normal text-charcoal-900">
          <Link to={href} className="hover:text-forest-700">
            {product.name}
          </Link>
        </h3>
        {product.shop && (
          <Link to={`/shops/${product.shop.slug}`} className="truncate text-xs text-charcoal-500 hover:text-forest-700" data-testid="sold-by">
            Sold by <span className="font-bold">{product.shop.name}</span>
          </Link>
        )}
        {product.highlight && <p className={cn('mt-1 truncate text-[0.72rem] font-semibold', tint.text)}>{product.highlight}</p>}
        <ProductRating product={product} className="mt-1" />

        <div className="mt-2.5 min-h-8">
          {product.variants.length > 1 ? (
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto" role="radiogroup" aria-label={`Pack size for ${product.name}`}>
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={v.id === variant.id}
                  disabled={!v.inStock}
                  onClick={() => setVariantId(v.id)}
                  className={cn(
                    'shrink-0 rounded-full border px-2.5 py-1 text-[0.72rem] font-bold transition',
                    v.id === variant.id ? 'border-forest-800 bg-forest-800 text-ivory-50' : 'border-line bg-ivory-50 text-charcoal-700 hover:border-forest-700/40',
                    !v.inStock && 'line-through opacity-50',
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>
          ) : (
            <span className="inline-block rounded-full bg-ivory-100 px-2.5 py-1 text-[0.72rem] font-bold text-charcoal-700">{variant.label}</span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <Price price={variant.price} mrp={variant.mrp} size="sm" className="[&>span:first-child]:text-[1.05rem]" />
          {qty > 0 ? (
            <QuantityStepper size="sm" value={qty} max={variant.maxQty} label={`${product.name} ${variant.label}`} onChange={(n) => setQuantity(variant.id, n)} />
          ) : (
            <button
              type="button"
              disabled={!variant.inStock}
              onClick={() => addToCart(product, variant)}
              className="inline-flex h-9 items-center gap-1 rounded-full bg-lime-300 pl-3 pr-3.5 text-sm font-extrabold text-forest-900 shadow-[0_6px_16px_-6px_rgb(120_160_40/0.7)] transition hover:bg-lime-200 active:scale-95 disabled:bg-ivory-200 disabled:text-charcoal-400 disabled:shadow-none"
              aria-label={variant.inStock ? `Add ${product.name} ${variant.label} to cart` : `${product.name} is out of stock`}
            >
              {variant.inStock ? (
                <>
                  <Plus className="size-4" strokeWidth={3} /> Add
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
    <div className="rounded-[1.6rem] border border-line/70 bg-white p-2" aria-hidden>
      <div className="skeleton aspect-square rounded-[1.25rem]" />
      <div className="space-y-2 px-1.5 pb-2 pt-3">
        <div className="skeleton h-3 w-1/3" />
        <div className="skeleton h-4 w-4/5" />
        <div className="skeleton h-6 w-16 rounded-full" />
        <div className="flex justify-between pt-2">
          <div className="skeleton h-5 w-14" />
          <div className="skeleton h-9 w-20 rounded-full" />
        </div>
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
