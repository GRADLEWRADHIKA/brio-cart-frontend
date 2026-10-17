import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { Campaign } from '@/types';
import { assetUrl } from '@/config/env';
import { formatDate } from '@/utils';

/** A marigold-and-mango-leaf toran (door garland), drawn procedurally. */
function Toran() {
  const flowers = 22;
  return (
    <svg viewBox="0 0 1100 120" preserveAspectRatio="none" className="absolute inset-x-0 top-0 h-16 w-full sm:h-24" aria-hidden>
      <path d="M0 8 Q 550 70 1100 8" fill="none" stroke="#f4b52c" strokeWidth="3" />
      {Array.from({ length: flowers }, (_, i) => {
        const t = (i + 0.5) / flowers;
        const x = t * 1100;
        const y = 8 + 4 * 62 * t * (1 - t);
        const hang = i % 2 === 0 ? 38 : 26;
        return (
          <g key={i}>
            <line x1={x} y1={y} x2={x} y2={y + hang} stroke="#c97a0a" strokeWidth="1.5" />
            {[0, 1, 2].map((k) => (
              <circle key={k} cx={x} cy={y + 8 + k * ((hang - 6) / 3)} r={k === 2 ? 7 : 5.5} fill={k === 2 ? (i % 3 === 0 ? '#e0452f' : '#f08a12') : '#f4b52c'} />
            ))}
            {i % 2 === 1 && <path d={`M${x} ${y + 2} q -10 16 0 30 q 10 -14 0 -30Z`} fill="#3d9a62" opacity="0.9" />}
          </g>
        );
      })}
    </svg>
  );
}

function Mandala({ className }: { className?: string }) {
  return (
    <svg viewBox="-100 -100 200 200" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="0.8">
      {[90, 72, 54, 36, 20].map((r) => (
        <circle key={r} r={r} />
      ))}
      {Array.from({ length: 24 }, (_, i) => (
        <path key={i} transform={`rotate(${i * 15})`} d="M0 -20 C 10 -40, 10 -60, 0 -90 C -10 -60, -10 -40, 0 -20Z" />
      ))}
      {Array.from({ length: 12 }, (_, i) => (
        <circle key={i} transform={`rotate(${i * 30})`} cy={-63} r={5} />
      ))}
    </svg>
  );
}

function Diya({ className, delay = '0s' }: { className?: string; delay?: string }) {
  return (
    <svg viewBox="0 0 80 70" className={className} aria-hidden>
      <g className="origin-[40px_30px] animate-flicker motion-reduce:animate-none" style={{ animationDelay: delay }}>
        <path d="M40 6 C 49 20, 47 30, 40 34 C 33 30, 31 20, 40 6Z" fill="#fbbf24" />
        <path d="M40 16 C 44 24, 43 29, 40 31 C 37 29, 36 24, 40 16Z" fill="#fff4c2" />
      </g>
      <ellipse cx="40" cy="36" rx="22" ry="5" fill="#f9d77e" opacity="0.35" />
      <path d="M8 38 Q 40 70 72 38 Q 56 46 40 46 Q 24 46 8 38Z" fill="#c2410c" />
      <path d="M8 38 Q 40 52 72 38" fill="none" stroke="#fdba74" strokeWidth="2" />
    </svg>
  );
}

export function CampaignBanner({ campaign }: { campaign: Campaign }) {
  const productSlug = campaign.ctaHref?.match(/^\/product\/([\w-]+)/)?.[1];
  return (
    <section className="container-page pt-16 sm:pt-20" aria-labelledby="campaign-title">
      <div className="relative overflow-hidden rounded-[2rem] bg-kumkum-800 text-ivory-50 shadow-[0_40px_80px_-30px_rgb(92_13_24/0.6)]">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_60%,rgb(240_138_18/0.35),transparent_60%)]" />
        <Mandala className="absolute -right-24 top-1/2 size-[34rem] -translate-y-1/2 text-turmeric-400/15 motion-safe:animate-[spin_120s_linear_infinite]" />
        <Mandala className="absolute -left-32 -bottom-40 size-80 text-turmeric-400/10" />
        <Toran />

        <div className="relative grid items-center gap-8 px-6 pb-10 pt-24 sm:px-12 sm:pb-14 sm:pt-32 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="eyebrow text-turmeric-400">{campaign.title}</p>
            <h2 id="campaign-title" lang="hi" className="mt-4 text-balance font-deva text-[1.9rem] font-bold leading-[1.35] tracking-normal text-[#fff3d6] sm:text-[2.6rem]">
              {campaign.headline}
            </h2>
            {campaign.subcopy && (
              <p lang="hi" className="mt-4 max-w-2xl font-deva text-lg leading-relaxed text-ivory-50/80">
                {campaign.subcopy}
              </p>
            )}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {campaign.ctaHref && campaign.ctaLabel && (
                <Link
                  to={campaign.ctaHref}
                  className="inline-flex h-14 items-center gap-2 rounded-full bg-turmeric-400 px-7 font-extrabold text-kumkum-800 shadow-[0_14px_30px_-10px_rgb(244_181_44/0.7)] transition hover:bg-[#ffc94a]"
                >
                  {campaign.ctaLabel} <ArrowRight className="size-5" />
                </Link>
              )}
              <span className="text-sm text-ivory-50/60">Until {formatDate(campaign.endsAt, false)}</span>
            </div>
            {campaign.signature && <p className="mt-8 font-display text-lg italic text-turmeric-400/90">{campaign.signature}</p>}
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-[20rem]" aria-hidden>
            <div className="absolute inset-0 rounded-full bg-turmeric-400/20 blur-2xl" />
            <div className="absolute inset-[6%] rounded-full border-2 border-dashed border-turmeric-400/40" />
            <div className="absolute inset-[14%] grid place-items-center rounded-full bg-[#fff6e3] shadow-plate ring-8 ring-turmeric-400/30">
              {productSlug ? (
                <img src={assetUrl(`/uploads/products/${productSlug}.webp`) ?? ''} alt="" className="size-[88%] rounded-full object-cover" loading="lazy" />
              ) : (
                <Diya className="size-1/2" />
              )}
            </div>
            <Diya className="absolute -bottom-2 left-0 w-20" />
            <Diya className="absolute -bottom-2 right-0 w-20" delay="-1.2s" />
            <Diya className="absolute bottom-2 left-1/2 w-16 -translate-x-1/2" delay="-0.6s" />
          </div>
        </div>
      </div>
    </section>
  );
}
