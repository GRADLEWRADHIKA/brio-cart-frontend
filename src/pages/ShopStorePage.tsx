import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, MapPin, Store } from 'lucide-react';
import { catalogApi } from '@/api/endpoints';
import { ProductGrid } from '@/components/products/ProductCard';
import { EmptyState, ProductImage, SectionHeading } from '@/components/ui/misc';
import { ButtonLink } from '@/components/ui/Button';
import { cn } from '@/utils';

/** /shops lists local shops on Brio Cart; /shops/:slug is one shop with its products. */
export default function ShopStorePage() {
  const { slug } = useParams();
  return slug ? <OneShop slug={slug} /> : <AllShops />;
}

function AllShops() {
  const { data, isLoading } = useQuery({ queryKey: ['shops'], queryFn: catalogApi.shops });
  useEffect(() => {
    document.title = 'Local shops — Brio Cart';
  }, []);
  return (
    <div className="container-page py-8">
      <SectionHeading eyebrow="Local shops" title="Shops on Brio Cart">
        Neighbourhood shops selling through Brio Cart. Each shop packs its own orders and our riders deliver them.
      </SectionHeading>
      {isLoading && <div className="skeleton mt-6 h-40 rounded-3xl" />}
      {data && data.length === 0 && (
        <EmptyState className="mt-6" icon={<Store className="size-10" />} title="No shops yet" action={<ButtonLink to="/seller/register">Sell on Brio Cart</ButtonLink>}>
          Run a shop in Lucknow? List your products and take orders here.
        </EmptyState>
      )}
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((s) => (
          <li key={s.id}>
            <Link to={`/shops/${s.slug}`} className="flex gap-4 rounded-3xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
              <ProductImage src={s.imageUrl} alt="" className="size-20 shrink-0 rounded-2xl bg-mint-50" />
              <span className="min-w-0">
                <span className="block truncate font-display text-xl font-semibold text-forest-900">{s.name}</span>
                <span className="block text-sm text-charcoal-500">{s.area?.name ?? s.address}</span>
                <span className={cn('mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold', s.isOpen ? 'bg-mint-100 text-forest-800' : 'bg-ivory-200 text-charcoal-500')}>
                  {s.isOpen ? 'Open' : 'Closed'} · {s.productCount} product{s.productCount === 1 ? '' : 's'}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm text-charcoal-500">
        Have a shop?{' '}
        <Link to="/seller/register" className="font-bold text-forest-700 underline underline-offset-2">Sell on Brio Cart</Link>
      </p>
    </div>
  );
}

function OneShop({ slug }: { slug: string }) {
  const shop = useQuery({ queryKey: ['shops', slug], queryFn: () => catalogApi.shop(slug) });
  const products = useQuery({ queryKey: ['products', { shop: slug }], queryFn: () => catalogApi.products({ shop: slug, pageSize: 60 }) });
  useEffect(() => {
    if (shop.data) document.title = `${shop.data.name} — Brio Cart`;
  }, [shop.data]);

  if (shop.error) {
    return (
      <div className="container-page py-12">
        <EmptyState icon={<Store className="size-10" />} title="Shop not found" action={<ButtonLink to="/shops">All shops</ButtonLink>}>
          This shop may have closed down or changed its name.
        </EmptyState>
      </div>
    );
  }
  const s = shop.data;
  return (
    <div className="container-page py-8">
      <Link to="/shops" className="text-sm font-bold text-forest-700">← All shops</Link>
      {s ? (
        <header className="mt-3 flex flex-col gap-4 rounded-[2rem] bg-forest-800 p-6 text-ivory-50 sm:flex-row sm:items-center">
          <ProductImage src={s.imageUrl} alt="" className="size-24 shrink-0 rounded-3xl bg-white/10" />
          <div className="min-w-0">
            <p className="eyebrow text-lime-300">Local shop on Brio Cart</p>
            <h1 className="mt-1 font-display text-4xl font-semibold">{s.name}</h1>
            {s.description && <p className="mt-1 whitespace-pre-line text-ivory-50/80">{s.description}</p>}
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ivory-50/80">
              <span className="inline-flex items-center gap-1"><MapPin className="size-4" /> {s.address}{s.area ? `, ${s.area.name}` : ''}</span>
              <span className="inline-flex items-center gap-1"><Clock className="size-4" /> Usually ready in {s.prepMinutes} min</span>
            </p>
          </div>
          <span className={cn('rounded-full px-3 py-1 text-sm font-extrabold sm:ml-auto', s.isOpen ? 'bg-lime-300 text-forest-900' : 'bg-white/15')}>{s.isOpen ? 'Open now' : 'Closed'}</span>
        </header>
      ) : (
        <div className="skeleton mt-3 h-36 rounded-[2rem]" />
      )}
      {s && !s.isOpen && <p className="mt-4 rounded-2xl bg-turmeric-100 p-3 text-sm font-semibold text-[#6b4500]">{s.name} is closed right now. You can browse, and order once it opens.</p>}
      <ProductGrid className="mt-6" products={products.data?.items} loading={products.isLoading} />
      {products.data && products.data.items.length === 0 && <p className="mt-6 text-charcoal-500">This shop hasn’t listed any products yet.</p>}
    </div>
  );
}
