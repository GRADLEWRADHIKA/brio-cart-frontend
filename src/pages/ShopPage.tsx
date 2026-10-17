import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { SearchX, SlidersHorizontal } from 'lucide-react';
import { COLLECTIONS } from '@shared/core';
import { catalogApi, type ProductFilters } from '@/api/endpoints';
import { ProductGrid } from '@/components/products/ProductCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/misc';
import { useCategories } from '@/hooks/useStoreInfo';
import { cn } from '@/utils';

const SORTS = [
  { value: 'relevance', label: 'Recommended' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'popular', label: 'Most popular' },
  { value: 'name', label: 'Name A–Z' },
] as const;

const PAGE_SIZE = 20;

export default function ShopPage() {
  const [params, setParams] = useSearchParams();
  const { data: categories } = useCategories();
  const filters: ProductFilters = {
    category: params.get('category') ?? undefined,
    collection: params.get('collection') ?? undefined,
    q: params.get('q') ?? undefined,
    sort: (params.get('sort') as ProductFilters['sort']) ?? undefined,
    inStock: params.get('inStock') === 'true',
  };

  const query = useInfiniteQuery({
    queryKey: ['products', filters],
    queryFn: ({ pageParam, signal }) => catalogApi.products({ ...filters, page: pageParam, pageSize: PAGE_SIZE }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });
  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  const first = query.data?.pages[0];

  const category = categories?.find((c) => c.slug === filters.category);
  const collection = COLLECTIONS.find((c) => c.key === filters.collection);
  const title = filters.q
    ? `Results for “${filters.q}”`
    : category?.name ?? (collection ? (collection.key === 'essentials' ? 'Daily Essentials' : collection.label) : 'All groceries');
  const subtitle = filters.q ? null : category?.description ?? (collection ? 'Hand-picked by the Brio Cart team.' : 'Fresh vegetables, fruits, dairy and daily essentials.');

  useEffect(() => {
    document.title = `${title} — Brio Cart`;
  }, [title]);

  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: false });
  };

  const chip = (active: boolean) =>
    cn(
      'shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition',
      active ? 'border-forest-800 bg-forest-800 text-ivory-50 shadow-md' : 'border-line bg-white text-charcoal-700 hover:border-forest-700/40',
    );

  const popularityNote = filters.sort === 'popular' && first && !first.hasPopularityData;

  return (
    <div className="pb-10">
      <section className="border-b border-line bg-ivory-100">
        <div className="container-page py-8 sm:py-12">
          <nav aria-label="Breadcrumb" className="text-sm text-charcoal-500">
            <Link to="/" className="hover:text-forest-700">Home</Link> <span aria-hidden>/</span> <span className="text-charcoal-700">Shop</span>
          </nav>
          <h1 className="mt-3 font-display text-4xl font-semibold text-forest-900 sm:text-5xl">{title}</h1>
          {subtitle && <p className="mt-2 max-w-xl text-charcoal-500">{subtitle}</p>}
        </div>
      </section>

      <div className="sticky top-[calc(4.5rem+env(safe-area-inset-top))] z-30 border-b border-line bg-ivory-50/90 backdrop-blur-xl lg:top-[7.5rem]">
        <div className="container-page flex flex-col gap-3 py-3 lg:flex-row lg:items-center">
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-1 lg:px-0" role="group" aria-label="Filter by category">
            <button type="button" className={chip(!filters.category && !filters.collection)} onClick={() => update({ category: undefined, collection: undefined, page: undefined })}>
              All
            </button>
            {categories?.map((c) => (
              <button key={c.id} type="button" className={chip(filters.category === c.slug)} onClick={() => update({ category: c.slug, collection: undefined })} aria-pressed={filters.category === c.slug}>
                {c.name}
              </button>
            ))}
            <button type="button" className={chip(filters.collection === 'essentials')} onClick={() => update({ collection: 'essentials', category: undefined })} aria-pressed={filters.collection === 'essentials'}>
              Daily Essentials
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-full border border-line bg-white px-3.5 text-sm font-bold text-charcoal-700">
              <input type="checkbox" checked={!!filters.inStock} onChange={(e) => update({ inStock: e.target.checked ? 'true' : undefined })} className="size-4 accent-forest-700" />
              In stock only
            </label>
            <label className="relative flex h-10 items-center gap-2 rounded-full border border-line bg-white pl-3.5 pr-2 text-sm font-bold text-charcoal-700">
              <SlidersHorizontal className="size-4" aria-hidden />
              <span className="sr-only">Sort by</span>
              <select value={filters.sort ?? 'relevance'} onChange={(e) => update({ sort: e.target.value === 'relevance' ? undefined : e.target.value })} className="bg-transparent pr-1 font-bold outline-none">
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="container-page pt-6">
        <p className="mb-4 text-sm font-semibold text-charcoal-500" aria-live="polite">
          {query.isLoading ? 'Loading products…' : `${first?.total ?? 0} product${first?.total === 1 ? '' : 's'}`}
          {popularityNote && ' · Popularity ranking will appear once orders come in; showing our recommended order for now.'}
        </p>
        {query.isError ? (
          <EmptyState icon={<SearchX className="size-10" />} title="Couldn’t load products" action={<Button onClick={() => query.refetch()}>Try again</Button>}>
            {(query.error as Error).message}
          </EmptyState>
        ) : !query.isLoading && items.length === 0 ? (
          <EmptyState
            icon={<SearchX className="size-10" strokeWidth={1.5} />}
            title="No products found"
            action={
              <Button variant="secondary" onClick={() => setParams(new URLSearchParams())}>
                Clear filters
              </Button>
            }
          >
            {filters.q ? <>We couldn’t find “{filters.q}”. Try another spelling, a Hindi name, or ask us on WhatsApp.</> : 'Nothing matches these filters right now.'}
          </EmptyState>
        ) : (
          <>
            <ProductGrid products={items} loading={query.isLoading} skeletons={10} />
            {query.hasNextPage && (
              <div className="mt-10 flex flex-col items-center gap-2">
                <Button variant="outline" size="lg" loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
                  Load more products
                </Button>
                <p className="text-xs text-charcoal-500">
                  Showing {items.length} of {first?.total}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
