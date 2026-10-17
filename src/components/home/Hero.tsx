import { ArrowRight, Banknote, Clock3, Sparkles, Truck } from 'lucide-react';
import { formatINR } from '@shared/core';
import { ButtonLink } from '@/components/ui/Button';
import { useStoreInfo } from '@/hooks/useStoreInfo';
import { assetUrl } from '@/config/env';
import { cn } from '@/utils';

/** Produce "plates" orbiting the hero. Photos are the store's own product shots. */
const PLATES = [
  { slug: 'kinnaur-apple', label: 'Kinnaur Apple', pos: 'left-[26%] top-[18%] size-[46%]', r: '-4deg', delay: '0s', main: true },
  { slug: 'carrot', label: 'Carrot', pos: 'left-[2%] top-[6%] size-[27%]', r: '6deg', delay: '-2s' },
  { slug: 'spinach', label: 'Palak', pos: 'right-[1%] top-[2%] size-[30%]', r: '-8deg', delay: '-4s' },
  { slug: 'amul-gold-full-cream-milk', label: 'Milk', pos: 'right-[-2%] top-[44%] size-[26%]', r: '5deg', delay: '-1s' },
  { slug: 'green-capsicum-bell-pepper', label: 'Capsicum', pos: 'left-[-1%] top-[50%] size-[28%]', r: '-6deg', delay: '-3s' },
  { slug: 'pomegranate', label: 'Anar', pos: 'left-[30%] bottom-[0%] size-[25%]', r: '8deg', delay: '-5s' },
  { slug: 'dragon-fruit-red-flesh', label: 'Dragon fruit', pos: 'right-[16%] bottom-[4%] size-[24%]', r: '-3deg', delay: '-2.5s' },
];

function Plate({ slug, label, pos, r, delay, main }: (typeof PLATES)[number]) {
  return (
    <div className={cn('absolute', pos)} style={{ ['--r' as string]: r }}>
      <div className="size-full animate-float motion-reduce:animate-none" style={{ animationDelay: delay }}>
        <div className={cn('relative grid size-full place-items-center rounded-full bg-ivory-50 shadow-plate ring-1 ring-white/60', main && 'ring-[10px] ring-white/10')}>
          <img src={assetUrl(`/uploads/products/${slug}.webp`) ?? ''} alt="" className="absolute inset-[5%] size-[90%] rounded-full object-cover" loading="eager" decoding="async" />
        </div>
        {main && (
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-lime-300 px-3 py-1 text-xs font-extrabold text-forest-900 shadow-lg">{label}</span>
        )}
      </div>
    </div>
  );
}

export function Hero() {
  const { data } = useStoreInfo();
  const s = data?.settings;
  const areas = data?.areas ?? [];
  const slot = s?.deliverySlots[0] ?? 'Morning, 6:00 – 8:00 AM';

  return (
    <section className="grain relative overflow-hidden bg-forest-900 text-ivory-50" aria-labelledby="hero-title">
      {/* atmospheric light */}
      <div aria-hidden className="absolute -right-40 -top-40 size-[44rem] rounded-full bg-leaf-500/25 blur-[120px]" />
      <div aria-hidden className="absolute -bottom-64 -left-40 size-[36rem] rounded-full bg-lime-300/10 blur-[110px]" />
      {/* botanical line art */}
      <svg aria-hidden viewBox="0 0 600 600" className="absolute -left-24 top-10 z-0 hidden w-[34rem] text-white/[0.05] lg:block" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M80 560C160 380 300 240 540 120" />
        {Array.from({ length: 9 }, (_, i) => {
          const x = 120 + i * 46;
          const y = 500 - i * 42;
          return <path key={i} d={`M${x} ${y}c-40-60-20-120 40-150c20 60 0 120-40 150Zm0 0c50-30 110-20 140 30c-60 30-110 10-140-30Z`} />;
        })}
      </svg>

      <div className="container-page relative z-10 grid items-center gap-10 pb-16 pt-12 md:pb-24 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-6 lg:pb-28 lg:pt-20">
        <div className="animate-fade-up">
          <p className="eyebrow rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-lime-300 backdrop-blur">
            <Sparkles className="size-3.5" /> Lucknow’s morning grocery service
          </p>
          <h1 id="hero-title" className="mt-6 text-balance font-display text-[2.7rem] font-medium leading-[0.98] tracking-[-0.035em] display-soft sm:text-6xl lg:text-[4.6rem]">
            Your Everyday <em className="font-display font-normal italic text-lime-300">Freshness,</em> Delivered to Your Door.
          </h1>
          <p className="mt-6 max-w-xl text-[1.05rem] leading-relaxed text-ivory-50/75 sm:text-lg">
            From fresh vegetables and juicy fruits to dairy and everyday essentials, bring quality and convenience home with Brio Cart.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/shop" variant="lime" size="lg" iconRight={<ArrowRight className="size-5" />}>
              Shop Fresh Groceries
            </ButtonLink>
            <a href="#categories" className="inline-flex h-14 items-center gap-2 rounded-full border border-white/25 px-7 font-bold text-ivory-50 transition hover:border-white/60 hover:bg-white/5">
              Explore Categories
            </a>
          </div>

          <ul className="mt-10 grid max-w-xl grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            {[
              {
                icon: Clock3,
                top: 'Morning delivery',
                sub: slot.replace(/^Morning,\s*/, '').replace(/\s*–\s*/, '–') + ((s?.deliverySlots.length ?? 0) > 1 ? ` +${s!.deliverySlots.length - 1} slot` : ''),
              },
              {
                icon: Truck,
                top: s && s.freeDeliveryThreshold > 0 ? `Free over ${formatINR(s.freeDeliveryThreshold)}` : 'Doorstep delivery',
                sub: s && s.deliveryFee > 0 ? `${formatINR(s.deliveryFee)} below that` : 'Across 5 localities',
              },
              { icon: Banknote, top: 'Pay on delivery', sub: 'Cash or UPI' },
            ].map(({ icon: Icon, top, sub }) => (
              <li key={top} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-sm">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lime-300/15 text-lime-300">
                  <Icon className="size-5" />
                </span>
                <span className="leading-tight">
                  <span className="block font-bold">{top}</span>
                  <span className="text-xs text-ivory-50/60">{sub}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Produce constellation */}
        <div className="relative mx-auto aspect-square w-full max-w-[34rem] lg:max-w-none" aria-hidden>
          <div className="absolute inset-[8%] rounded-full border border-dashed border-white/15" />
          <div className="absolute inset-[22%] rounded-full border border-white/10" />
          {PLATES.map((p) => (
            <Plate key={p.slug} {...p} />
          ))}
          <div className="absolute bottom-[3%] left-[0%] hidden animate-float-slow rounded-2xl border border-white/15 bg-forest-800/70 p-3 shadow-2xl backdrop-blur-md sm:block" style={{ animationDelay: '-3s' }}>
            <p className="text-[0.65rem] font-bold uppercase tracking-wider text-lime-300">Next delivery</p>
            <p className="font-display text-lg font-medium">Tomorrow morning</p>
            <p className="text-xs text-ivory-50/60">{areas.length ? `${areas[0]!.name} + ${areas.length - 1} more areas` : 'Across Lucknow'}</p>
          </div>
        </div>
      </div>

      {/* curved transition into the ivory page */}
      <svg aria-hidden viewBox="0 0 1440 60" preserveAspectRatio="none" className="relative z-10 -mb-px block h-8 w-full text-ivory-50 sm:h-12">
        <path d="M0 60V30C240 0 480 0 720 20s480 40 720 10v30Z" fill="currentColor" />
      </svg>
    </section>
  );
}
