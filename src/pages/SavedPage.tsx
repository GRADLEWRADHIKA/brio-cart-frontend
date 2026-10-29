import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { catalogApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import type { Product } from '@/types';
import { useWishlist } from '@/store/wishlist';
import { useCart } from '@/store/cart';
import { useUi } from '@/store/ui';
import { ProductCard, ProductCardSkeleton } from '@/components/products/ProductCard';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState, ProductImage } from '@/components/ui/misc';

/** The pack size "Add all" puts in the cart: the first one in stock. */
const packFor = (p: Product) => (p.inStock ? (p.variants.find((v) => v.inStock) ?? null) : null);

export default function SavedPage() {
  const items = useWishlist((s) => s.items);
  const remove = useWishlist((s) => s.remove);
  const add = useCart((s) => s.add);
  const lines = useCart((s) => s.lines);
  const toast = useUi((s) => s.toast);
  const setCartOpen = useUi((s) => s.setCartOpen);
  useEffect(() => {
    document.title = 'Saved items — Brio Cart';
  }, []);

  // Fresh prices and stock for every saved product (shared with the product pages' cache).
  const results = useQueries({
    queries: items.map((i) => ({ queryKey: ['product', i.slug], queryFn: () => catalogApi.product(i.slug), staleTime: 60_000, retry: (n: number, e: Error) => !(e instanceof ApiError && e.status === 404) && n < 2 })),
  });
  const rows = items.map((saved, i) => {
    const r = results[i]!;
    return { saved, product: r.data?.product ?? null, loading: r.isLoading, gone: r.error instanceof ApiError && r.error.status === 404 };
  });
  const ready = useMemo(
    () => rows.filter((r) => r.product && packFor(r.product) && !lines.some((l) => l.productId === r.product!.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [results.map((r) => r.dataUpdatedAt).join(), lines, items],
  );
  const available = rows.filter((r) => r.product && packFor(r.product)).length;

  const addAll = () => {
    let added = 0;
    for (const r of ready) if (add(r.product!, packFor(r.product!)!, 1) === 'added') added++;
    const skipped = rows.length - available;
    toast({
      title: added ? `Added ${added} item${added === 1 ? '' : 's'} to your cart` : 'Already in your cart',
      description: skipped ? `${skipped} saved item${skipped === 1 ? ' is' : 's are'} out of stock right now.` : undefined,
      tone: 'success',
      action: { label: 'View cart', to: '/cart' },
    });
    if (added) setCartOpen(true);
  };

  return (
    <div className="container-page py-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-leaf-600">Your favourites</p>
          <h1 className="mt-2 font-display text-4xl font-semibold text-forest-900 sm:text-5xl">Saved items</h1>
          {items.length > 0 && (
            <p className="mt-2 text-charcoal-500">
              {items.length} saved · {available} in stock now
            </p>
          )}
        </div>
        {items.length > 0 && (
          <Button size="lg" icon={<ShoppingBag className="size-5" />} disabled={ready.length === 0} onClick={addAll} data-testid="add-all-saved">
            {ready.length ? `Add all to cart (${ready.length})` : available ? 'All in your cart' : 'Nothing in stock'}
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState icon={<Heart className="size-10" />} title="Nothing saved yet" action={<ButtonLink to="/shop">Browse groceries</ButtonLink>} className="mt-6">
          Tap the heart on anything you buy often. It stays here, ready to add to your cart in one tap.
        </EmptyState>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {rows.map(({ saved, product, loading, gone }, i) =>
            product ? (
              <ProductCard key={saved.productId} product={product} eager={i < 4} />
            ) : loading ? (
              <ProductCardSkeleton key={saved.productId} />
            ) : (
              <div key={saved.productId} className="flex flex-col rounded-[1.6rem] border border-line/80 bg-white p-2 opacity-80">
                <ProductImage src={saved.imageUrl} alt={saved.name} className="aspect-square rounded-[1.25rem] bg-ivory-100 grayscale" />
                <p className="mt-3 line-clamp-2 px-1.5 font-bold">{saved.name}</p>
                <p className="px-1.5 text-sm text-charcoal-500">{gone ? 'No longer sold' : 'Couldn’t load right now'}</p>
                <div className="mt-auto flex gap-2 px-1.5 pb-1 pt-3">
                  {!gone && (
                    <Link to={`/product/${saved.slug}`} className="text-sm font-bold text-forest-700 underline underline-offset-2">
                      Open
                    </Link>
                  )}
                  <button type="button" onClick={() => remove(saved.productId)} className="ml-auto inline-flex items-center gap-1 text-sm font-bold text-tomato-500">
                    <Trash2 className="size-4" /> Remove
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
