import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { catalogApi } from '@/api/endpoints';
import type { Banner } from '@/types';
import { ProductImage } from '@/components/ui/misc';
import { cn } from '@/utils';

const THEMES: Record<string, { bg: string; text: string; sub: string; cta: string; plate: string }> = {
  forest: { bg: 'bg-forest-900', text: 'text-ivory-50', sub: 'text-ivory-50/75', cta: 'bg-lime-300 text-forest-900', plate: 'bg-white/10' },
  lime: { bg: 'bg-lime-300', text: 'text-forest-900', sub: 'text-forest-900/75', cta: 'bg-forest-900 text-ivory-50', plate: 'bg-white/50' },
  tomato: { bg: 'bg-tomato-500', text: 'text-white', sub: 'text-white/80', cta: 'bg-white text-tomato-500', plate: 'bg-white/15' },
  turmeric: { bg: 'bg-turmeric-100', text: 'text-forest-900', sub: 'text-charcoal-600', cta: 'bg-forest-900 text-ivory-50', plate: 'bg-white/60' },
};
const ROTATE_MS = 5000;

function Slide({ b }: { b: Banner }) {
  const t = THEMES[b.theme] ?? THEMES.forest!;
  return (
    <Link to={b.href} className={cn('grain relative flex h-full items-center gap-4 overflow-hidden rounded-[1.75rem] p-5 sm:gap-8 sm:p-8', t.bg)}>
      <div className="relative z-10 min-w-0 flex-1">
        <p className={cn('text-[0.7rem] font-extrabold uppercase tracking-widest', t.sub)}>Featured</p>
        <h2 className={cn('mt-1 line-clamp-2 font-display text-2xl font-semibold leading-tight sm:text-4xl', t.text)}>{b.title}</h2>
        {b.subtitle && <p className={cn('mt-1.5 line-clamp-2 text-sm sm:text-base', t.sub)}>{b.subtitle}</p>}
        <span className={cn('mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold shadow-sm', t.cta)}>
          {b.ctaLabel} <ArrowRight className="size-4" />
        </span>
      </div>
      {b.imageUrl && (
        <div className={cn('relative z-10 size-28 shrink-0 overflow-hidden rounded-[1.5rem] p-2 sm:size-44', t.plate)}>
          {/* The whole photo, centred: product shots aren't always framed in the middle. */}
          <ProductImage src={b.imageUrl} alt="" className="size-full rounded-2xl bg-white" imgClassName="object-contain! p-1.5" />
        </div>
      )}
    </Link>
  );
}

/**
 * Promoted products: the home page's banners, or those for one category (with its parents').
 * Rotates every few seconds; pauses while hovered or focused.
 */
export function BannerCarousel({ category, className }: { category?: string; className?: string }) {
  const { data } = useQuery({ queryKey: ['banners', category ?? 'home'], queryFn: () => catalogApi.banners(category), staleTime: 60_000 });
  const items = data ?? [];
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => setI(0), [category]);
  useEffect(() => {
    if (items.length < 2 || paused) return;
    const t = setInterval(() => setI((n) => (n + 1) % items.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [items.length, paused]);
  if (!items.length) return null;
  const at = i % items.length;

  return (
    <section
      className={cn('relative', className)}
      aria-roledescription="carousel"
      aria-label="Featured products"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      data-testid="banner-carousel"
    >
      <div className="overflow-hidden rounded-[1.75rem]">
        <div className="flex transition-transform duration-700 ease-out" style={{ transform: `translateX(-${at * 100}%)` }}>
          {items.map((b, n) => (
            <div key={b.id} className="w-full shrink-0" aria-hidden={n !== at} inert={n !== at}>
              <Slide b={b} />
            </div>
          ))}
        </div>
      </div>
      {items.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {items.map((b, n) => (
            <button key={b.id} type="button" onClick={() => setI(n)} aria-label={`Show ${b.title}`} aria-current={n === at} className={cn('h-2 rounded-full transition-all', n === at ? 'w-6 bg-forest-800' : 'w-2 bg-charcoal-400/40')} />
          ))}
        </div>
      )}
    </section>
  );
}
