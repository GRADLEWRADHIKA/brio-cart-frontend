import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Boxes,
  CalendarClock,
  CircleCheckBig,
  Gift,
  Headphones,
  IndianRupee,
  Mail,
  MapPin,
  PackageCheck,
  PartyPopper,
  Phone,
  ShoppingBasket,
  ShoppingCart,
  Sparkles,
  Store,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import { catalogApi } from '@/api/endpoints';
import type { Banner } from '@/types';
import { ProductImage } from '@/components/ui/misc';
import { LocationPicker } from '@/components/layout/LocationPicker';
import { SearchBox } from '@/components/layout/SearchBox';
import { useCategories, useContact, useStoreInfo } from '@/hooks/useStoreInfo';
import { mainCategories } from '@/utils/categories';
import { cn } from '@/utils';

/* ---------------- Section title: "▍Bestsellers ............ See All →" ---------------- */
export function RailTitle({ title, href, id }: { title: string; href?: string; id?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 id={id} className="flex items-center gap-2.5 font-sans text-xl font-bold tracking-tight text-charcoal-900 sm:text-[1.6rem]">
        <span aria-hidden className="h-6 w-1 rounded-full bg-forest-800" />
        {title}
      </h2>
      {href && (
        <Link to={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-charcoal-900 hover:text-forest-700">
          See All <ArrowRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}

/* ---------------- Three promo cards at the top ---------------- */
const PROMO_STYLES = [
  { bg: 'bg-gradient-to-br from-[#fdf3d9] to-[#fbe7b8]', title: 'text-forest-900', cta: 'bg-forest-800 text-white' },
  { bg: 'bg-gradient-to-br from-[#e3f4e6] to-[#c9e9cf]', title: 'text-forest-900', cta: 'bg-forest-800 text-white' },
  { bg: 'bg-gradient-to-br from-[#fde9da] to-[#fbd5bd]', title: 'text-[#5c1d14]', cta: 'bg-[#8a2a1c] text-white' },
];

interface Promo {
  key: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  image: string | null;
}

function PromoCard({ p, i }: { p: Promo; i: number }) {
  const s = PROMO_STYLES[i % PROMO_STYLES.length]!;
  return (
    <Link to={p.href} className={cn('group relative flex min-h-[13.5rem] overflow-hidden rounded-3xl p-6 transition duration-300 hover:-translate-y-0.5 hover:shadow-lift sm:p-7', s.bg)}>
      <div className="relative z-10 flex max-w-[58%] flex-col">
        <h2 className={cn('font-display text-[1.35rem] font-semibold leading-[1.1] sm:text-[1.75rem]', s.title)}>{p.title}</h2>
        <p className="mt-2 line-clamp-3 text-sm text-charcoal-700">{p.subtitle}</p>
        <span className={cn('mt-auto inline-flex w-fit items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold shadow-sm transition group-hover:gap-2.5', s.cta)}>
          {p.cta} <ArrowRight className="size-4" />
        </span>
      </div>
      {p.image && (
        <ProductImage
          src={p.image}
          alt=""
          eager
          className="!absolute right-5 top-1/2 aspect-square w-[38%] -translate-y-1/2 rotate-3 rounded-2xl shadow-lift ring-4 ring-white/70 transition-transform duration-500 group-hover:rotate-0 group-hover:scale-105"
        />
      )}
    </Link>
  );
}

/** The store's own banners when it has set any; otherwise three cards made from its categories. */
export function PromoCards() {
  const banners = useQuery({ queryKey: ['banners', 'home'], queryFn: () => catalogApi.banners(), staleTime: 60_000 });
  const { data: categories } = useCategories();
  const main = mainCategories(categories);
  const find = (re: RegExp) => main.find((c) => re.test(c.slug));
  const fresh = find(/fresh|veg|fruit/);
  const gift = find(/gift|festiv/);
  const dairy = find(/dairy|milk/);

  const fromBanners: Promo[] = (banners.data ?? []).slice(0, 3).map((b: Banner) => ({
    key: b.id,
    title: b.title,
    subtitle: b.subtitle ?? '',
    cta: b.ctaLabel || 'Shop now',
    href: b.href,
    image: b.imageUrl,
  }));
  const fallback: Promo[] = [
    { key: 'essentials', title: 'Daily Essentials at Best Prices', subtitle: 'Stock up on your everyday needs.', cta: 'Shop Essentials', href: '/shop?collection=essentials', image: dairy?.coverUrl ?? dairy?.imageUrl ?? null },
    {
      key: 'fresh',
      title: 'Fresh Fruits & Vegetables',
      subtitle: 'Handpicked, fresh and full of goodness.',
      cta: 'Shop Fresh',
      href: fresh ? `/shop?category=${fresh.slug}` : '/shop',
      image: fresh?.coverUrl ?? fresh?.imageUrl ?? null,
    },
    {
      key: 'gifting',
      title: 'Festival & Gifting',
      subtitle: 'Special hampers and gifting options for every occasion.',
      cta: 'Explore Gifts',
      href: gift ? `/shop?category=${gift.slug}` : '/shop',
      image: gift?.coverUrl ?? gift?.imageUrl ?? null,
    },
  ];
  const items = [...fromBanners, ...fallback.slice(fromBanners.length)].slice(0, 3);

  return (
    <section className="container-page pt-5 sm:pt-6" aria-label="Offers">
      <div className="mb-4 space-y-3 md:hidden">
        <LocationPicker />
        <SearchBox />
      </div>
      <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
        {items.map((p, i) => (
          <div key={p.key} className="w-[85%] shrink-0 snap-start md:w-auto">
            <PromoCard p={p} i={i} />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Popular categories ---------------- */
const ICON_ART: Array<{ match: RegExp; Icon: LucideIcon }> = [
  { match: /wholesale|bulk/, Icon: Boxes },
  { match: /gift/, Icon: Gift },
  { match: /festiv|diwali|holi/, Icon: PartyPopper },
  { match: /personal|care|beauty/, Icon: Sparkles },
];
const TILE_BG = ['bg-[#f6efe9]', 'bg-[#fbe9ec]', 'bg-[#e8f1f8]', 'bg-[#f4ece3]', 'bg-[#f7ece4]', 'bg-[#e7efe9]', 'bg-[#f6efe2]', 'bg-[#efeaf6]'];

export function PopularCategories() {
  const { data: categories, isLoading } = useCategories();
  const tiles = mainCategories(categories)
    .filter((c) => c.onHome ?? true)
    .map((c) => ({ key: c.id, to: `/shop?category=${c.slug}`, name: c.name, image: c.coverUrl ?? c.imageUrl, Icon: ICON_ART.find((a) => a.match.test(c.slug))?.Icon ?? ShoppingBasket }));
  tiles.splice(Math.min(2, tiles.length), 0, { key: 'essentials', to: '/shop?collection=essentials', name: 'Daily Essentials', image: '/uploads/products/onion.webp', Icon: ShoppingBasket });

  return (
    <section className="container-page pt-10 sm:pt-12" aria-labelledby="cat-title">
      <div className="mb-4 flex items-center justify-between">
        <h2 id="cat-title" className="font-sans text-xl font-semibold tracking-tight text-charcoal-900 sm:text-[1.6rem]">
          Popular Categories
        </h2>
        <Link to="/shop" className="inline-flex items-center gap-1 text-sm font-medium text-charcoal-900 hover:text-forest-700">
          Show All <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-8" data-testid="home-category-tiles">
        {isLoading
          ? Array.from({ length: 7 }, (_, i) => <li key={i} className="skeleton aspect-square w-28 shrink-0 rounded-2xl sm:w-auto" />)
          : tiles.map((c, i) => (
              <li key={c.key} className="w-28 shrink-0 sm:w-auto">
                <Link to={c.to} className="group flex flex-col items-center gap-2.5 text-center">
                  <span className={cn('grid aspect-square w-full place-items-center overflow-hidden rounded-2xl transition duration-300 group-hover:-translate-y-1 group-hover:shadow-lift', TILE_BG[i % TILE_BG.length])}>
                    {c.image ? (
                      <ProductImage src={c.image} alt="" className="size-full" imgClassName="transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <c.Icon className="size-1/2 text-forest-700" strokeWidth={1.5} aria-hidden />
                    )}
                  </span>
                  <span className="line-clamp-2 text-[0.82rem] font-medium leading-tight text-charcoal-900 sm:text-sm">{c.name}</span>
                </Link>
              </li>
            ))}
      </ul>
    </section>
  );
}

/* ---------------- Four promise tiles ---------------- */
export function PromiseTiles() {
  const items = [
    { title: 'Quality-focused selection', body: 'Produce is sorted and cleaned before packing.', Icon: PackageCheck, bg: 'from-[#2f8a5b] to-[#bfe3c9]', text: 'text-white', sub: 'text-white/85', art: 'bg-white/20 text-white' },
    { title: 'Everyday affordability', body: 'Transparent, mandi-linked prices you can trust.', Icon: IndianRupee, bg: 'from-[#ee8a9a] to-[#fcd9df]', text: 'text-white', sub: 'text-white/85', art: 'bg-white/25 text-white' },
    { title: 'Convenient local shopping', body: 'A neighbourhood service for your daily needs.', Icon: Store, bg: 'from-[#fbe27a] to-[#fdf3c8]', text: 'text-forest-900', sub: 'text-charcoal-700', art: 'bg-white/50 text-[#8a6400]' },
    { title: 'Customer-focused service', body: 'Real support from a team that cares.', Icon: Headphones, bg: 'from-[#8cc4f0] to-[#dcecfa]', text: 'text-forest-900', sub: 'text-charcoal-700', art: 'bg-white/50 text-[#1e4f78]' },
  ];
  return (
    <section className="container-page pt-14 sm:pt-16" aria-label="Why Brio Cart">
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {items.map(({ title, body, Icon, bg, text, sub, art }) => (
          <li key={title} className={cn('relative flex min-h-[12.5rem] flex-col overflow-hidden rounded-3xl bg-gradient-to-b p-5 sm:min-h-[14rem] sm:p-6', bg)}>
            <h3 className={cn('font-sans text-lg font-bold leading-tight tracking-tight sm:text-xl', text)}>{title}</h3>
            <p className={cn('mt-2 max-w-[14rem] text-xs sm:text-sm', sub)}>{body}</p>
            <span aria-hidden className={cn('ml-auto mt-auto grid size-16 place-items-center rounded-full sm:size-20', art)}>
              <Icon className="size-8 sm:size-10" strokeWidth={1.6} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------- How it works ---------------- */
export function HowItWorksSteps() {
  const steps = [
    { n: '01', title: 'Choose your groceries', body: 'Browse vegetables, fruits, dairy and essentials.', Icon: ShoppingBasket, bg: 'bg-[#eef8f0] border-[#cfe9d6]', num: 'bg-[#d4efdc] text-forest-800', art: 'text-leaf-600' },
    { n: '02', title: 'Add products to your cart', body: 'Pick the pack size you need. Your cart is saved, even if you close the app.', Icon: ShoppingCart, bg: 'bg-[#fff4ec] border-[#fadfcb]', num: 'bg-[#fde3d0] text-[#b4501e]', art: 'text-[#d9822b]' },
    { n: '03', title: 'Confirm your order', body: 'Choose your area and morning slot, pay by cash or UPI when it arrives.', Icon: CircleCheckBig, bg: 'bg-[#eef5fd] border-[#d4e5f7]', num: 'bg-[#d8e8f9] text-[#1e4f78]', art: 'text-[#2b6cb0]' },
  ];
  return (
    <section className="container-page pt-14 sm:pt-16" aria-labelledby="how-title">
      <div className="relative overflow-hidden rounded-3xl border border-line bg-white p-6 sm:p-10">
        <div aria-hidden className="absolute -right-10 -top-10 size-64 rounded-full bg-mint-100 blur-3xl" />
        <p className="relative flex items-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-charcoal-700">
          How it works <span className="h-px w-8 bg-charcoal-700" />
        </p>
        <h2 id="how-title" className="relative mt-3 max-w-xl font-display text-3xl font-semibold leading-tight text-forest-900 sm:text-[2.6rem]">
          Three Easy Steps to a <em className="italic">Fresher Morning</em>
        </h2>
        <ol className="relative mt-8 grid gap-4 md:grid-cols-3">
          {steps.map(({ n, title, body, Icon, bg, num, art }) => (
            <li key={n} className={cn('flex gap-4 rounded-2xl border p-5', bg)}>
              <span className={cn('grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold', num)}>{n}</span>
              <div className="min-w-0 flex-1">
                <h3 className="font-sans text-base font-bold leading-snug tracking-tight text-charcoal-900">{title}</h3>
                <p className="mt-1.5 text-sm text-charcoal-500">{body}</p>
              </div>
              <Icon aria-hidden className={cn('size-10 shrink-0 self-center', art)} strokeWidth={1.5} />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------------- Delivery areas ---------------- */
// Schematic positions on the drawn map (not geographic).
const PINS = ['left-[38%] top-[26%]', 'left-[62%] top-[14%]', 'left-[84%] top-[38%]', 'left-[24%] top-[58%]', 'left-[76%] top-[72%]', 'left-[44%] top-[80%]', 'left-[56%] top-[40%]', 'left-[30%] top-[40%]'];

export function DeliveryAreas() {
  const { data } = useStoreInfo();
  const areas = data?.areas ?? [];
  return (
    <section className="container-page pt-14 sm:pt-16" aria-labelledby="areas-title">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#f3f9ee] via-[#eef7ea] to-[#e4f2df]">
        <div className="relative z-10 grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.05fr_1fr] lg:p-12">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-mint-100 px-3 py-1 text-xs font-bold text-forest-800">
              <MapPin className="size-3.5" /> Delivery Areas
            </p>
            <h2 id="areas-title" className="mt-4 text-balance font-display text-3xl font-semibold leading-tight text-forest-900 sm:text-[2.6rem]">
              Now Delivering Across <em className="italic text-leaf-500">{areas.length || 6} Lucknow</em> Neighbourhoods
            </h2>
            <p className="mt-3 max-w-md text-charcoal-500">{data?.settings.deliveryNote ?? 'Order by 12 AM for next-morning delivery.'} Choose your slot at checkout.</p>
            <ul className="mt-7 grid gap-2.5 sm:grid-cols-2">
              {areas.map((a) => (
                <li key={a.id} className="flex items-center gap-3 rounded-full border border-line bg-white px-4 py-2.5 shadow-sm">
                  <span className="grid size-6 place-items-center rounded-full bg-mint-100">
                    <MapPin className="size-3.5 text-leaf-600" />
                  </span>
                  <span className="text-sm font-semibold">{a.name}</span>
                  {a.pincode && <span className="ml-auto text-xs tabular-nums text-charcoal-400">{a.pincode}</span>}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative min-h-[18rem] lg:min-h-0" aria-hidden>
            <svg viewBox="0 0 400 320" className="absolute inset-0 size-full drop-shadow-xl" preserveAspectRatio="xMidYMid meet">
              <path
                d="M60 70C90 30 170 20 230 30s120 10 150 60 10 90-10 130-20 70-80 80-120 10-170-10-80-50-90-100 20-80 30-120Z"
                fill="#3fa34d"
              />
              <path d="M60 70C90 30 170 20 230 30s120 10 150 60" fill="none" stroke="#6cc070" strokeWidth="10" strokeLinecap="round" opacity=".55" />
              <path d="M40 270C110 240 180 280 250 250S350 200 390 230" fill="none" stroke="#7fd3c9" strokeWidth="12" strokeLinecap="round" opacity=".8" />
            </svg>
            <p className="absolute left-[48%] top-[50%] -translate-x-1/2 -translate-y-1/2 font-sans text-3xl font-bold text-white drop-shadow sm:text-4xl">Lucknow</p>
            {areas.map((a, i) => (
              <div key={a.id} className={cn('absolute -translate-x-1/2 -translate-y-full', PINS[i % PINS.length])}>
                <div className="flex flex-col items-center">
                  <span className="whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs font-bold text-forest-900 shadow-lg sm:text-sm">{a.name}</span>
                  <span className="mt-1 size-3 rounded-full bg-lime-300 ring-2 ring-white" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Support strip (number only: no order-on-WhatsApp button) ---------------- */
export function SupportStrip() {
  const { phoneDisplay, email } = useContact();
  return (
    <section className="container-page pt-14 sm:pt-16" aria-label="Questions or support">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-full border border-line bg-mint-50 px-5 py-4 sm:px-6">
        <span className="grid size-10 place-items-center rounded-full bg-forest-800 text-white">
          <Phone className="size-5" />
        </span>
        <p className="font-bold text-charcoal-900">Questions or support?</p>
        <p className="text-sm text-charcoal-700">
          Call or WhatsApp <span className="select-all font-bold text-forest-800">{phoneDisplay}</span>
        </p>
        {email && (
          <p className="inline-flex items-center gap-1.5 text-sm text-charcoal-700">
            <Mail className="size-4" /> <span className="select-all">{email}</span>
          </p>
        )}
        <p className="inline-flex items-center gap-1.5 text-sm text-charcoal-500 sm:ml-auto">
          <Truck className="size-4" /> Outside Lucknow: delivered within 7 days
        </p>
      </div>
    </section>
  );
}

/* ---------------- Feature strip used under product listings ---------------- */
export function TrustStrip() {
  const items = [
    { Icon: Truck, title: 'Fresh & Farm-Direct', body: 'Sourced from trusted farms.', bg: 'bg-[#eef8f0]', ic: 'bg-[#d4efdc] text-forest-800' },
    { Icon: PackageCheck, title: 'Quality Assured', body: 'Cleaned, sorted and packed with care.', bg: 'bg-[#fdeef0]', ic: 'bg-[#fbd9de] text-tomato-500' },
    { Icon: IndianRupee, title: 'Everyday Low Prices', body: 'Great value for daily needs.', bg: 'bg-[#fff8e3]', ic: 'bg-[#fdecb5] text-[#b07d00]' },
    { Icon: CalendarClock, title: 'Next-Morning Delivery', body: 'Order by 12 AM for next-day delivery.', bg: 'bg-[#eef5fd]', ic: 'bg-[#d8e8f9] text-[#2b6cb0]' },
  ];
  return (
    <ul className="grid gap-3 border-t border-line pt-8 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(({ Icon, title, body, bg, ic }) => (
        <li key={title} className={cn('flex items-center gap-4 rounded-2xl p-4', bg)}>
          <span className={cn('grid size-11 shrink-0 place-items-center rounded-full', ic)}>
            <Icon className="size-5" />
          </span>
          <span>
            <span className="block text-sm font-bold text-charcoal-900">{title}</span>
            <span className="block text-xs text-charcoal-500">{body}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
