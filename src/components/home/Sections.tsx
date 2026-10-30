import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ChevronLeft, ChevronRight, HandHeart, IndianRupee, MapPin, PackageCheck, Phone, ShoppingBasket, Sprout, Store } from 'lucide-react';
import { buildWhatsAppUrl } from '@shared/core';
import { catalogApi, type ProductFilters } from '@/api/endpoints';
import { ProductCard, ProductCardSkeleton } from '@/components/products/ProductCard';
import { SectionHeading } from '@/components/ui/misc';
import { WhatsAppIcon } from '@/components/ui/Brand';
import { useContact, useStoreInfo } from '@/hooks/useStoreInfo';
import { cn, openExternal } from '@/utils';
import stallPhoto from '@/assets/brand/brio-cart-stall.jpg';

/* ---------------- Produce ticker ---------------- */
const TICKER = [
  ['आलू', 'Potato'], ['टमाटर', 'Tomato'], ['पालक', 'Spinach'], ['सेब', 'Apple'], ['दूध', 'Milk'], ['भिंडी', 'Lady Finger'],
  ['अनार', 'Pomegranate'], ['पनीर', 'Paneer'], ['अदरक', 'Ginger'], ['केला', 'Banana'], ['मटर', 'Green Peas'], ['दही', 'Curd'],
];

export function ProduceTicker() {
  const row = (
    <ul className="flex shrink-0 items-center gap-8 pr-8">
      {TICKER.map(([hi, en]) => (
        <li key={en} className="flex items-center gap-3 whitespace-nowrap">
          <span lang="hi" className="font-deva text-xl font-bold text-forest-900">{hi}</span>
          <span className="text-sm font-bold uppercase tracking-[0.14em] text-forest-700/70">{en}</span>
          <Sprout className="ml-5 size-4 text-forest-700/50" />
        </li>
      ))}
    </ul>
  );
  return (
    <div className="relative -mt-1 overflow-hidden border-y border-forest-900/10 bg-lime-300 py-3.5" aria-hidden>
      <div className="flex w-max animate-marquee motion-reduce:animate-none">
        {row}
        {row}
      </div>
    </div>
  );
}

export function ProductRail({
  eyebrow,
  title,
  filters,
  fallback,
  href,
  tone = 'plain',
}: {
  eyebrow: string;
  title: string;
  filters: ProductFilters;
  fallback?: ProductFilters;
  href: string;
  tone?: 'plain' | 'mint';
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const q = useQuery({ queryKey: ['rail', filters], queryFn: () => catalogApi.products({ inStock: true, pageSize: 12, ...filters }) });
  // "Popular" uses real sales when available; otherwise the store's curated list.
  const needFallback = !!fallback && q.data && (!q.data.hasPopularityData || q.data.items.length < 4);
  const fb = useQuery({
    queryKey: ['rail', fallback],
    queryFn: () => catalogApi.products({ inStock: true, pageSize: 12, ...fallback }),
    enabled: !!needFallback,
  });
  const data = needFallback ? fb.data : q.data;
  const loading = q.isLoading || (needFallback && fb.isLoading);
  if (!loading && (!data || data.items.length === 0)) return null;

  const scroll = (dir: number) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.8, behavior: 'smooth' });

  return (
    <section className={cn('pt-16 sm:pt-20', tone === 'mint' && 'mt-16 bg-mint-50 pb-16 sm:mt-20 sm:pb-20')}>
      <div className="container-page">
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          action={
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => scroll(-1)} className="hidden size-11 place-items-center rounded-full border border-line bg-white transition hover:border-forest-700 md:grid" aria-label={`Scroll ${title} left`}>
                <ChevronLeft className="size-5" />
              </button>
              <button type="button" onClick={() => scroll(1)} className="hidden size-11 place-items-center rounded-full border border-line bg-white transition hover:border-forest-700 md:grid" aria-label={`Scroll ${title} right`}>
                <ChevronRight className="size-5" />
              </button>
              <Link to={href} className="ml-1 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-extrabold text-forest-700 hover:bg-mint-100">
                See all <ArrowRight className="size-4" />
              </Link>
            </div>
          }
        />
      </div>
      <div ref={scroller} className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-4 sm:gap-4 sm:scroll-px-6 sm:px-6 lg:scroll-px-[max(2rem,calc((100vw-1280px)/2+2rem))] lg:px-[max(2rem,calc((100vw-1280px)/2+2rem))]">
        {loading
          ? Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="w-[46%] shrink-0 sm:w-[14.5rem]">
                <ProductCardSkeleton />
              </div>
            ))
          : data!.items.map((p) => (
              <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[14.5rem]">
                <ProductCard product={p} className="h-full" />
              </div>
            ))}
      </div>
    </section>
  );
}

/* ---------------- Why Brio Cart ---------------- */
export function WhyBrio() {
  const items = [
    { icon: PackageCheck, title: 'Quality-focused selection', body: 'Produce is sorted and cleaned before packing each morning, so what reaches you is ready for your kitchen.', tint: 'bg-mint-100 text-forest-700' },
    { icon: IndianRupee, title: 'Everyday affordability', body: 'Transparent, mandi-linked prices per pack — what you see on the product is what you pay.', tint: 'bg-turmeric-100 text-[#7a4f00]' },
    { icon: Store, title: 'Convenient local shopping', body: 'A neighbourhood service for five Lucknow localities, with morning delivery slots that fit your routine.', tint: 'bg-peach-100 text-[#9a3f12]' },
    { icon: HandHeart, title: 'Customer-focused service', body: 'Real people on call and WhatsApp to help with orders, substitutions and special requests.', tint: 'bg-sky-100 text-[#1e4f78]' },
  ];
  return (
    <section className="container-page pt-20 sm:pt-24" aria-labelledby="why-title">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="relative min-h-[22rem] overflow-hidden rounded-[2rem] bg-forest-900">
          <img src={stallPhoto} alt="The Brio Cart produce stall stocked with fresh vegetables and fruits" loading="lazy" className="absolute inset-0 size-full object-cover opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-t from-forest-950/90 via-forest-950/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-ivory-50 sm:p-8">
            <p className="eyebrow text-lime-300">Why Brio Cart</p>
            <h2 id="why-title" className="mt-2 text-balance font-display text-3xl font-medium leading-tight sm:text-[2.6rem]">
              <span lang="hi" className="font-deva">किसान की मेहनत,</span> <span className="italic text-lime-300">आपके घर की सेहत.</span>
            </h2>
            <p className="mt-3 max-w-md text-ivory-50/75">Fresh • Safe • Responsible — the three promises behind every basket we pack.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map(({ icon: Icon, title, body, tint }) => (
            <div key={title} className="group rounded-[1.75rem] border border-line bg-white p-6 transition duration-300 hover:-translate-y-0.5 hover:shadow-lift">
              <span className={cn('grid size-12 place-items-center rounded-2xl transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110', tint)}>
                <Icon className="size-6" />
              </span>
              <h3 className="mt-5 font-sans text-lg font-extrabold tracking-tight text-forest-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-charcoal-500">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- How it works ---------------- */
export function HowItWorks() {
  const steps = [
    { n: '01', title: 'Choose your groceries', body: 'Browse vegetables, fruits, dairy and essentials — in English, Hinglish or हिंदी.', icon: ShoppingBasket },
    { n: '02', title: 'Add products to your cart', body: 'Pick the pack size you need. Your cart is saved, even if you close the app.', icon: PackageCheck },
    { n: '03', title: 'Confirm your order', body: 'Choose your area and morning slot, pay by cash or UPI when it arrives.', icon: HandHeart },
  ];
  return (
    <section className="container-page pt-20 sm:pt-24" aria-labelledby="how-title">
      <SectionHeading eyebrow="How it works" title={<span id="how-title">Three steps to a fresher morning</span>} />
      <ol className="relative grid gap-4 md:grid-cols-3">
        <div aria-hidden className="absolute left-[16%] right-[16%] top-14 hidden border-t-2 border-dashed border-leaf-400/40 md:block" />
        {steps.map(({ n, title, body, icon: Icon }) => (
          <li key={n} className="relative rounded-[1.75rem] bg-ivory-100 p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <span className="font-display text-6xl font-semibold leading-none text-transparent [-webkit-text-stroke:1.5px_var(--color-leaf-500)] display-soft">{n}</span>
              <span className="relative grid size-14 place-items-center rounded-full bg-forest-800 text-lime-300 shadow-lg ring-8 ring-ivory-50">
                <Icon className="size-6" />
              </span>
            </div>
            <h3 className="mt-6 font-sans text-xl font-extrabold tracking-tight text-forest-900">{title}</h3>
            <p className="mt-2 text-charcoal-500">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------------- Service areas ---------------- */
// Schematic positions only (not a geographic map).
const PIN_POS: Record<string, string> = {
  aliganj: 'left-[40%] top-[34%]',
  'vikas-nagar': 'left-[58%] top-[24%]',
  mahanagar: 'left-[66%] top-[54%]',
  'nirala-nagar': 'left-[50%] top-[64%]',
  kalyanpur: 'left-[74%] top-[36%]',
};

export function ServiceAreas() {
  const { data } = useStoreInfo();
  const areas = data?.areas ?? [];
  return (
    <section className="container-page pt-20 sm:pt-24" aria-labelledby="areas-title">
      <div className="grain relative overflow-hidden rounded-[2rem] bg-forest-800 text-ivory-50">
        <div className="relative z-10 grid gap-8 p-6 sm:p-10 lg:grid-cols-2 lg:p-14">
          <div>
            <p className="eyebrow text-lime-300">Delivery areas</p>
            <h2 id="areas-title" className="mt-3 text-balance font-display text-[2rem] font-medium leading-tight sm:text-5xl">
              Now delivering across <em className="italic text-lime-300">{areas.length || 5} Lucknow</em> neighbourhoods
            </h2>
            <p className="mt-4 max-w-md text-ivory-50/70">{data?.settings.deliveryNote ?? 'Order by 12 AM for next-morning delivery.'} Choose your slot at checkout.</p>
            <ul className="mt-8 grid gap-2.5 sm:grid-cols-2">
              {areas.map((a) => (
                <li key={a.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <MapPin className="size-5 shrink-0 text-lime-300" />
                  <span className="font-bold">{a.name}</span>
                  {a.pincode && <span className="ml-auto text-sm tabular-nums text-ivory-50/50">{a.pincode}</span>}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative min-h-[18rem]" aria-hidden>
            <svg viewBox="0 0 400 320" className="absolute inset-0 size-full text-white/10" fill="none" stroke="currentColor">
              <path d="M10 240C80 200 120 260 190 220S300 120 390 150" strokeWidth="14" className="text-[#5aa9c9]/25" strokeLinecap="round" />
              <path d="M30 60h340M30 120h340M30 180h340M30 240h340M80 20v280M160 20v280M240 20v280M320 20v280" strokeWidth="1" strokeDasharray="2 6" />
              <circle cx="220" cy="140" r="110" strokeDasharray="4 8" className="text-lime-300/30" strokeWidth="1.5" />
            </svg>
            {areas.map((a, i) => (
              <div
                key={a.id}
                className={cn('absolute -translate-x-1/2 -translate-y-full', PIN_POS[a.slug])}
                style={PIN_POS[a.slug] ? undefined : { left: `${22 + ((i * 17) % 60)}%`, top: `${30 + ((i * 23) % 45)}%` }}
              >
                <div className="flex flex-col items-center">
                  <span className="mb-1 whitespace-nowrap rounded-full bg-ivory-50 px-2.5 py-1 text-xs font-extrabold text-forest-900 shadow-lg">{a.name}</span>
                  <span className="relative grid size-4 place-items-center">
                    <span className="absolute size-4 animate-ping rounded-full bg-lime-300/60 motion-reduce:animate-none" style={{ animationDelay: `${i * 0.4}s` }} />
                    <span className="relative size-3 rounded-full bg-lime-300 ring-2 ring-forest-800" />
                  </span>
                </div>
              </div>
            ))}
            <p className="absolute bottom-0 right-0 text-[0.65rem] text-ivory-50/40">Illustrative, not to scale</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- WhatsApp CTA ---------------- */
export function WhatsAppCta() {
  const { whatsapp, phoneDisplay } = useContact();
  return (
    <section className="container-page pt-20 sm:pt-24" aria-labelledby="wa-title">
      <div className="relative overflow-hidden rounded-[2rem] bg-[#e7f7ec] p-6 sm:p-10 lg:p-12">
        <div aria-hidden className="absolute -right-16 -top-16 size-72 rounded-full bg-[#1fae55]/15 blur-2xl" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="eyebrow text-[#13843f]">Prefer chatting?</p>
            <h2 id="wa-title" className="mt-3 text-balance font-display text-[2rem] font-semibold leading-tight text-forest-900 sm:text-[2.75rem]">
              Order on WhatsApp in one message
            </h2>
            <p className="mt-3 max-w-lg text-charcoal-700">
              Send your list to our team and we’ll confirm availability and the final amount. Your order is placed once we confirm it on WhatsApp.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => openExternal(buildWhatsAppUrl(whatsapp, 'Hello Brio Cart, I would like to place an order:\n'))}
                className="inline-flex h-14 items-center gap-2.5 rounded-full bg-[#1fae55] px-7 font-bold text-white shadow-[0_14px_30px_-12px_rgb(31_174_85/0.9)] transition hover:bg-[#199a4a]"
              >
                <WhatsAppIcon className="size-5" /> Chat on WhatsApp
              </button>
              <a href={`tel:+91${whatsapp.replace(/\D/g, '').slice(-10)}`} className="inline-flex h-14 items-center gap-2 rounded-full border border-forest-800/15 bg-white px-6 font-bold text-forest-800 transition hover:border-forest-800/40">
                <Phone className="size-4" /> {phoneDisplay}
              </a>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-sm" aria-hidden>
            <div className="rounded-[1.75rem] bg-[#0b141a] p-4 shadow-2xl">
              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <span className="grid size-9 place-items-center rounded-full bg-ivory-50 text-forest-800"><Sprout className="size-5" /></span>
                <span>
                  <span className="block text-sm font-bold text-white">Brio Cart</span>
                  <span className="text-[0.65rem] text-white/50">Business account</span>
                </span>
              </div>
              <div className="space-y-2 pt-3 text-[0.8rem]">
                <p className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-[#005c4b] px-3 py-2 text-white">Hi! 1 kg aloo, 500 g tamatar, 1 L milk please 🙏</p>
                <p className="max-w-[80%] rounded-2xl rounded-tl-sm bg-[#202c33] px-3 py-2 text-white/90">Namaste! We’ll confirm your list and total shortly.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
