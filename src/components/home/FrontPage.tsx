import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Apple, ArrowRight, Clock3, Hand, MapPin, Play, SlidersHorizontal, Sparkles, Truck, Wheat } from 'lucide-react';
import { SECTION_LABELS, SECTION_SLUGS, SECTIONS, type Section } from '@shared/core';
import { catalogApi } from '@/api/endpoints';
import { ProductCard, ProductCardSkeleton } from '@/components/products/ProductCard';
import { ProductImage } from '@/components/ui/misc';
import { LocationPicker } from '@/components/layout/LocationPicker';
import { SearchBox } from '@/components/layout/SearchBox';
import { useCategories, useStoreInfo } from '@/hooks/useStoreInfo';
import { usePreferenceParams, useShopperLocation } from '@/hooks/useShopper';
import { usePrefs } from '@/store/prefs';
import { useUi } from '@/store/ui';
import { subCategories } from '@/utils/categories';
import { cn } from '@/utils';
import { RailTitle } from './Redesign';

/** Sections in the shopper's order of interest (their first-visit answer), then the rest. */
export function useSectionOrder(): Section[] {
  const interests = usePrefs((s) => s.answers?.interests) ?? [];
  return [...interests.filter((s) => SECTIONS.includes(s)), ...SECTIONS.filter((s) => !interests.includes(s))];
}

/* ---------------- Large front banner ---------------- */
export function FrontBanner() {
  const { data } = useStoreInfo();
  const { data: categories } = useCategories();
  const shopper = useShopperLocation();
  const hero = data?.settings.hero;
  const fresh = categories?.find((c) => c.slug === 'fresh');
  const image = hero?.imageUrl ?? fresh?.coverUrl ?? '/uploads/products/tomato.webp';
  return (
    <section className="container-page pt-5 sm:pt-6" aria-labelledby="front-title">
      <div className="mb-4 space-y-3 md:hidden">
        <LocationPicker />
        <SearchBox />
      </div>
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#eaf6ec] via-[#f4faf1] to-[#fdf3d9]">
        <div className="relative z-10 grid items-center gap-6 p-6 sm:p-10 md:grid-cols-[1.15fr_1fr] lg:p-14">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-forest-800 shadow-sm">
              <MapPin className="size-3.5" /> {shopper.location ? `Delivering to ${shopper.label}` : 'Lucknow’s neighbourhood store, now across India'}
            </p>
            <h1 id="front-title" className="mt-4 font-display text-[2.1rem] font-semibold leading-[1.05] text-forest-900 sm:text-5xl lg:text-[3.6rem]">
              {hero?.title || 'Fresh every morning. Good things, all over India.'}
            </h1>
            <p className="mt-4 max-w-xl text-base text-charcoal-700 sm:text-lg">
              {hero?.subtitle || 'Fruit and vegetables picked and packed every morning for Lucknow, plus groceries and handmade goods delivered across India.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/shop?category=fresh" className="btn-solid h-12 px-6 text-sm">
                Shop Fresh <ArrowRight className="size-4" />
              </Link>
              <Link to="/shop?category=grocery" className="btn-outline h-12 px-6 text-sm">
                Shop Grocery
              </Link>
            </div>
            <p className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-charcoal-700">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="size-4 text-leaf-600" /> Fresh: {data?.settings.eta?.local.toLowerCase() ?? 'next morning'} in Lucknow
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Truck className="size-4 text-leaf-600" /> Grocery &amp; Handmade: {data?.settings.eta?.india.toLowerCase() ?? 'within 7 days'} across India
              </span>
            </p>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-[15rem] sm:max-w-[26rem]">
            <span className="absolute inset-[8%] rounded-full bg-white/70" aria-hidden />
            <ProductImage src={image} alt="" eager className="!absolute inset-[10%] rounded-full" imgClassName="object-contain! produce-blend" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Fresh / Grocery / Handmade entry blocks ---------------- */
const BLOCK = {
  FRESH: { icon: Apple, bg: 'bg-gradient-to-br from-[#e3f4e6] to-[#c9e9cf]', note: 'Next-morning delivery in Lucknow', fallback: '/uploads/products/spinach.webp' },
  GROCERY: { icon: Wheat, bg: 'bg-gradient-to-br from-[#fdf3d9] to-[#fbe7b8]', note: 'Delivered across India', fallback: '/uploads/products/paneer.webp' },
  HANDMADE: { icon: Hand, bg: 'bg-gradient-to-br from-[#fde9da] to-[#fbd5bd]', note: 'From local makers, across India', fallback: null },
} as const;

export function SectionBlocks() {
  const { data: categories, isLoading } = useCategories();
  const order = useSectionOrder();
  return (
    <section className="container-page pt-10 sm:pt-12" aria-labelledby="sections-h">
      <RailTitle id="sections-h" title="Shop by section" />
      <div className="grid gap-4 md:grid-cols-3">
        {order.map((s) => {
          const root = categories?.find((c) => c.slug === SECTION_SLUGS[s] && !c.parentId);
          const kids = root ? subCategories(categories, root.id) : [];
          const b = BLOCK[s];
          const Icon = b.icon;
          const image = root?.imageUrl ?? root?.coverUrl ?? b.fallback;
          const empty = !isLoading && (root?.productCount ?? 0) === 0;
          return (
            <div key={s} className={cn('group relative flex min-h-[15rem] flex-col overflow-hidden rounded-3xl p-6 transition hover:-translate-y-0.5 hover:shadow-lift', b.bg)}>
              <Link to={`/shop?category=${SECTION_SLUGS[s]}`} className="absolute inset-0 z-0" aria-label={`Shop ${root?.name ?? SECTION_LABELS[s]}`} />
              <div className="pointer-events-none relative z-10 max-w-[62%]">
                <span className="grid size-10 place-items-center rounded-xl bg-white/80 text-forest-800">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-3 font-display text-2xl font-semibold text-forest-900">{root?.name ?? SECTION_LABELS[s]}</h3>
                <p className="mt-1 text-sm text-charcoal-700">{empty ? 'Coming soon' : b.note}</p>
              </div>
              {image && <ProductImage src={image} alt="" className="!absolute -right-2 top-6 aspect-square w-[42%] rounded-full" imgClassName="object-contain! produce-blend transition-transform duration-500 group-hover:scale-105" />}
              <div className="relative z-10 mt-auto flex flex-wrap gap-1.5 pt-5">
                {kids.slice(0, 4).map((c) => (
                  <Link key={c.id} to={`/shop?category=${c.slug}`} className="rounded-full bg-white/85 px-3 py-1 text-xs font-bold text-forest-800 hover:bg-white">
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- Production video ---------------- */
function youtubeId(url: string) {
  const m = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(url);
  return m?.[1] ?? null;
}

/**
 * How Brio Cart's products are sourced and made. Loads nothing until it scrolls into view, and plays
 * only when tapped (YouTube through its privacy-enhanced player). Hidden until staff add a video.
 */
export function HomeVideo() {
  const { data } = useStoreInfo();
  const video = data?.settings.homeVideo;
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && setNear(true), { rootMargin: '300px' });
    io.observe(el);
    return () => io.disconnect();
  }, [near, video]);
  if (!video) return null;
  const yt = youtubeId(video.url);
  const poster = video.poster ?? (yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : null);
  return (
    <section className="container-page pt-12 sm:pt-14" aria-labelledby="video-h">
      <div className="grid items-center gap-6 overflow-hidden rounded-[2rem] bg-forest-900 p-4 text-ivory-50 sm:p-6 lg:grid-cols-[1fr_1.4fr] lg:p-8">
        <div className="px-2 lg:px-4">
          <p className="eyebrow text-lime-300">
            <Sparkles className="size-3.5" /> From farm to your door
          </p>
          <h2 id="video-h" className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
            {video.title || 'How we source and make our products'}
          </h2>
          <p className="mt-3 text-ivory-50/80">{video.text || 'See where your food comes from: the farms, the morning sorting and the hands that pack your order.'}</p>
        </div>
        <div ref={ref} className="relative aspect-video overflow-hidden rounded-3xl bg-forest-950">
          {playing && yt ? (
            <iframe
              className="absolute inset-0 size-full"
              src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
              title={video.title || 'Brio Cart video'}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ) : playing ? (
            <video className="absolute inset-0 size-full object-cover" src={video.url} poster={poster ?? undefined} controls autoPlay playsInline />
          ) : (
            <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0 grid place-items-center" aria-label={`Play video: ${video.title || 'How we source and make our products'}`}>
              {near && poster && <img src={poster} alt="" loading="lazy" className="absolute inset-0 size-full object-cover opacity-80 transition group-hover:opacity-100" />}
              {near && !poster && !yt && <video className="absolute inset-0 size-full object-cover opacity-80" src={`${video.url}#t=0.5`} preload="metadata" muted playsInline />}
              <span className="relative grid size-20 place-items-center rounded-full bg-lime-300 text-forest-900 shadow-lift transition group-hover:scale-110">
                <Play className="ml-1 size-9" fill="currentColor" />
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Recommended for you ---------------- */
export function RecommendedRail() {
  const answers = usePrefs((s) => s.answers);
  const setPrefsOpen = useUi((s) => s.setPrefsOpen);
  const prefParams = usePreferenceParams();
  const { params } = useShopperLocation();
  const q = useQuery({ queryKey: ['recommended', prefParams, params], queryFn: () => catalogApi.recommended({ ...prefParams, ...params }), enabled: !!answers });

  if (!answers) {
    return (
      <section className="container-page pt-12 sm:pt-14">
        <div className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-mint-200 bg-mint-50 p-5 sm:flex-row sm:items-center sm:p-6">
          <div>
            <p className="font-sans text-lg font-bold text-charcoal-900">Get picks made for you</p>
            <p className="text-sm text-charcoal-700">Answer 4 quick questions about taste and health needs, and we’ll show what suits you first.</p>
          </div>
          <button type="button" onClick={() => setPrefsOpen(true)} className="btn-solid h-11 shrink-0 px-5 text-sm">
            <SlidersHorizontal className="size-4" /> Set my preferences
          </button>
        </div>
      </section>
    );
  }
  if (!q.isLoading && !q.data?.length) return null;
  return (
    <section className="pt-12 sm:pt-14" aria-labelledby="rec-h">
      <div className="container-page flex items-center justify-between gap-3">
        <RailTitle id="rec-h" title="Recommended for you" />
        <button type="button" onClick={() => setPrefsOpen(true)} className="mb-4 inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-charcoal-900 hover:text-forest-700">
          <SlidersHorizontal className="size-3.5" /> Change
        </button>
      </div>
      <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-4 sm:gap-4 sm:scroll-px-6 sm:px-6 lg:scroll-px-[max(2rem,calc((100vw-1280px)/2+2rem))] lg:px-[max(2rem,calc((100vw-1280px)/2+2rem))]">
        {q.isLoading
          ? Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="w-[46%] shrink-0 sm:w-[14.5rem]">
                <ProductCardSkeleton />
              </div>
            ))
          : q.data!.map((p) => (
              <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[14.5rem] lg:w-[calc((min(100vw,1280px)-4rem-4rem)/5)]">
                <ProductCard product={p} className="h-full" />
              </div>
            ))}
      </div>
    </section>
  );
}
