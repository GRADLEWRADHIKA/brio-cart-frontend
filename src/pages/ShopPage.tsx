import { useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { MapPinOff, PackageOpen, SearchX } from 'lucide-react';
import { COLLECTIONS } from '@shared/core';
import { catalogApi, type ProductFilters } from '@/api/endpoints';
import { ProductGrid } from '@/components/products/ProductCard';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState, ProductImage } from '@/components/ui/misc';
import { TrustStrip } from '@/components/home/Redesign';
import { useCategories } from '@/hooks/useStoreInfo';
import { usePreferenceParams, useShopperLocation } from '@/hooks/useShopper';
import { usePrefs } from '@/store/prefs';
import { LocationPicker } from '@/components/layout/LocationPicker';
import { cn } from '@/utils';
import { mainCategories, pathOf, subCategories } from '@/utils/categories';
import { BannerCarousel } from '@/components/home/BannerCarousel';

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
  const shopper = useShopperLocation();
  const prefParams = usePreferenceParams();
  const courier = usePrefs((s) => s.courier);
  const filters: ProductFilters = {
    category: params.get('category') ?? undefined,
    collection: params.get('collection') ?? undefined,
    q: params.get('q') ?? undefined,
    sort: (params.get('sort') as ProductFilters['sort']) ?? undefined,
    inStock: params.get('inStock') === 'true',
    // Products that can't reach the shopper come last (greyed out); their answers break ties.
    ...shopper.params,
    ...prefParams,
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
  // Fresh › Vegetables › Exotic: the main category drives the top row, sub-categories get rows below.
  const path = pathOf(categories, category?.id);
  const collection = COLLECTIONS.find((c) => c.key === filters.collection);
  const title = filters.q
    ? `Results for “${filters.q}”`
    : category?.name ?? (collection ? (collection.key === 'essentials' ? 'Daily Essentials' : collection.label) : 'All groceries');
  const subtitle = filters.q
    ? null
    : category
      ? // A category without its own description gets a line about itself, not the store-wide one.
        category.description || `Shop ${category.name} at Brio Cart, delivered to your door.`
      : collection
        ? 'Hand-picked by the Brio Cart team.'
        : 'Fresh vegetables, fruits, dairy and daily essentials.';

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
      'shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition lg:px-3.5',
      active ? 'border-forest-800 bg-forest-800 text-ivory-50 shadow-md' : 'border-line bg-white text-charcoal-700 hover:border-forest-700/40',
    );

  // Phones show the chips in one swipeable row: bring the selected one into view.
  const chipRow = useRef<HTMLDivElement>(null);
  const active = `${filters.category ?? ''}|${filters.collection ?? ''}|${categories?.length ?? 0}`;
  useEffect(() => {
    const row = chipRow.current;
    const chip = row?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!row || !chip || row.scrollWidth <= row.clientWidth) return;
    const offset = chip.getBoundingClientRect().left - row.getBoundingClientRect().left;
    row.scrollTo({ left: row.scrollLeft + offset - (row.clientWidth - chip.offsetWidth) / 2, behavior: 'smooth' });
  }, [active]);

  const subChip = (active: boolean) =>
    cn(
      'shrink-0 rounded-full border px-3.5 py-1.5 text-[0.8rem] font-bold transition',
      active ? 'border-forest-700 bg-mint-100 text-forest-800' : 'border-dashed border-line bg-white/70 text-charcoal-600 hover:border-forest-700/40',
    );

  /** A category the store is still stocking (no products yet, nothing filtered). */
  const comingSoon = !query.isLoading && !query.isError && items.length === 0 && !!category && !filters.q && !filters.inStock;

  const popularityNote = filters.sort === 'popular' && first && !first.hasPopularityData;

  const main = mainCategories(categories);
  const heroCat = path[0] ?? category;
  const heroImage = category?.coverUrl ?? category?.imageUrl ?? heroCat?.coverUrl ?? heroCat?.imageUrl ?? main.find((c) => /fresh/.test(c.slug))?.coverUrl ?? null;
  const crumbs = [
    { label: 'Home', to: '/' },
    { label: 'All Categories', to: '/shop' },
    ...path.map((c) => ({ label: c.name, to: `/shop?category=${c.slug}` })),
    ...(collection && !category ? [{ label: collection.key === 'essentials' ? 'Daily Essentials' : collection.label, to: `/shop?collection=${collection.key}` }] : []),
  ];
  const showTiles = !filters.category && !filters.collection && !filters.q;
  const total = first?.total ?? 0;

  return (
    <div className="pb-10">
      <section className="container-page pt-5 sm:pt-6">
        <div className="relative flex min-h-[11rem] overflow-hidden rounded-3xl bg-gradient-to-r from-[#e6f3e3] via-[#eef7ec] to-[#f6faf3] shadow-soft sm:min-h-[15rem]">
          <div aria-hidden className="absolute -left-16 -top-10 size-64 rounded-full bg-[#d6ecd3]/70" />
          <div className="relative z-10 flex max-w-[60%] flex-col justify-center p-6 sm:p-10 lg:pl-16">
            <nav aria-label="Breadcrumb" className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-charcoal-700 sm:text-xs">
              {crumbs.map((c, i) => (
                <span key={c.to + c.label}>
                  {i > 0 && <span aria-hidden> &gt; </span>}
                  {i === crumbs.length - 1 && !filters.q ? <span aria-current="page">{c.label}</span> : <Link to={c.to} className="hover:text-forest-700">{c.label}</Link>}
                </span>
              ))}
            </nav>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-forest-900 sm:text-5xl">{showTiles ? 'All Categories' : title}</h1>
            <p className="mt-2 line-clamp-2 text-sm text-charcoal-700 sm:text-base">{showTiles ? 'Explore complete range of groceries and daily essentials.' : subtitle ?? `${total} matching products`}</p>
          </div>
          {heroImage && (
            <div aria-hidden className="absolute inset-y-0 right-0 w-[48%] [mask-image:linear-gradient(to_right,transparent,black_35%)]">
              <ProductImage src={heroImage} alt="" eager className="size-full" imgClassName="object-cover" />
            </div>
          )}
        </div>
      </section>

      {showTiles ? (
        <section className="container-page pt-8" aria-label="Categories">
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {[
              // Each section, then its sub-categories (Fresh, Vegetables, Fruits, ... Grocery, Dairy & More, ...).
              ...main.flatMap((c) => [c, ...subCategories(categories, c.id)]).map((c) => ({ key: c.id, to: `/shop?category=${c.slug}`, name: c.name, image: c.coverUrl ?? c.imageUrl })),
              { key: 'essentials', to: '/shop?collection=essentials', name: 'Daily Essentials', image: '/uploads/products/onion.webp' },
            ].map((c, i) => (
              <li key={c.key}>
                <Link to={c.to} className={cn('group flex h-full flex-col items-center gap-2 rounded-2xl p-3 text-center transition hover:-translate-y-0.5 hover:shadow-lift', TILE_BG[i % TILE_BG.length])}>
                  <ProductImage src={c.image} alt="" className="aspect-[4/3] w-full rounded-xl" imgClassName="object-contain! produce-blend transition-transform duration-500 group-hover:scale-105" />
                  <span className="text-[0.8rem] font-semibold leading-tight text-charcoal-900 sm:text-sm">{c.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="container-page pt-6">
          <div className="no-scrollbar -mx-4 -my-1 flex gap-2 overflow-x-auto px-4 py-1 md:hidden" ref={chipRow} role="group" aria-label="Filter by category">
            <button type="button" className={chip(!filters.category && !filters.collection)} onClick={() => update({ category: undefined, collection: undefined, page: undefined })} aria-pressed={!filters.category && !filters.collection}>
              All
            </button>
            {main.map((c) => (
              <button key={c.id} type="button" className={chip(path[0]?.id === c.id)} onClick={() => update({ category: c.slug, collection: undefined })} aria-pressed={path[0]?.id === c.id}>
                {c.name}
              </button>
            ))}
            <button type="button" className={chip(filters.collection === 'essentials')} onClick={() => update({ collection: 'essentials', category: undefined })} aria-pressed={filters.collection === 'essentials'}>
              Daily Essentials
            </button>
            <span aria-hidden className="w-2 shrink-0" />
          </div>
          {path.slice(0, 2).map((parent, level) => {
            const kids = subCategories(categories, parent.id);
            if (!kids.length) return null;
            const current = path[level + 1];
            return (
              <div key={parent.id} className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label={`${parent.name}: sub-categories`} data-testid="subcategory-row">
                <button type="button" className={subChip(!current)} onClick={() => update({ category: parent.slug })} aria-pressed={!current}>
                  All {parent.name}
                </button>
                {kids.map((k) => (
                  <button key={k.id} type="button" className={subChip(current?.id === k.id)} onClick={() => update({ category: k.slug })} aria-pressed={current?.id === k.id}>
                    {k.name}
                  </button>
                ))}
                <span aria-hidden className="w-2 shrink-0 md:hidden" />
              </div>
            );
          })}
        </div>
      )}

      <div className="container-page pt-8">
        {path[0]?.slug === 'fresh' && courier && (
          <div className="mb-6 flex flex-col items-start gap-3 rounded-3xl border border-turmeric-400/60 bg-turmeric-100 p-5 text-[#6b4500] sm:flex-row sm:items-center sm:justify-between" role="note" data-testid="fresh-coming-soon">
            <p className="flex items-start gap-3">
              <MapPinOff className="mt-0.5 size-6 shrink-0" />
              <span>
                <b className="block text-base">Fresh is coming soon to {courier.city ?? 'your city'}</b>
                Fresh fruit and vegetables are delivered next morning only in our Lucknow localities for now. Grocery and Handmade ship to {courier.pincode}.
              </span>
            </p>
            <div className="flex shrink-0 gap-2">
              <Link to="/shop?category=grocery" className="btn-solid h-10 px-4 text-sm">
                Shop Grocery
              </Link>
              <LocationPicker variant="pill" />
            </div>
          </div>
        )}
        {filters.category && !filters.q && <BannerCarousel category={filters.category} className="mb-6" />}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className={cn('font-semibold text-charcoal-900', comingSoon && 'sr-only')} aria-live="polite">
            {query.isLoading ? 'Loading products…' : `Showing ${total} Product${total === 1 ? '' : 's'}`}
            {popularityNote && <span className="block text-xs font-normal text-charcoal-500">Popularity ranking will appear once orders come in; showing our recommended order for now.</span>}
          </p>
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-charcoal-900">
              <input type="checkbox" role="switch" checked={!!filters.inStock} onChange={(e) => update({ inStock: e.target.checked ? 'true' : undefined })} className="peer sr-only" />
              <span aria-hidden className="relative h-6 w-11 rounded-full bg-ivory-300 transition peer-checked:bg-forest-800 peer-focus-visible:ring-2 peer-focus-visible:ring-leaf-500 after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
              In Stock Only
            </label>
            <label className="relative flex h-10 items-center gap-1 rounded-xl border border-line bg-white pl-3 pr-2 text-sm font-semibold text-charcoal-900">
              <span className="sr-only">Sort by</span>
              <select value={filters.sort ?? 'relevance'} onChange={(e) => update({ sort: e.target.value === 'relevance' ? undefined : e.target.value })} className="cursor-pointer bg-transparent pr-1 outline-none">
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        {query.isError ? (
          <EmptyState icon={<SearchX className="size-10" />} title="Couldn’t load products" action={<Button onClick={() => query.refetch()}>Try again</Button>}>
            {(query.error as Error).message}
          </EmptyState>
        ) : comingSoon ? (
          // A category the store is still stocking: say so, rather than "no products found".
          <EmptyState
            icon={<PackageOpen className="size-10" strokeWidth={1.5} />}
            title={`${category.name}: coming soon`}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <ButtonLink to="/shop">Browse all groceries</ButtonLink>
                <ButtonLink to="/shop?collection=essentials" variant="secondary">Daily Essentials</ButtonLink>
              </div>
            }
            className="rounded-3xl bg-ivory-100"
          >
            We’re adding products to {category.name} right now. Check back soon, or shop our fresh groceries in the meantime.
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
            {filters.q ? <>We couldn’t find “{filters.q}”. Try another spelling or a Hindi name, or call us and we’ll help.</> : 'Nothing matches these filters right now.'}
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
        <div className="mt-12">
          <TrustStrip />
        </div>
      </div>
    </div>
  );
}

const TILE_BG = ['bg-[#e9f4ec]', 'bg-[#fdecef]', 'bg-[#e8f1f8]', 'bg-[#fdf3e3]', 'bg-[#fbeee4]', 'bg-[#efeaf6]', 'bg-[#fdf6e0]', 'bg-[#f7ece6]'];
