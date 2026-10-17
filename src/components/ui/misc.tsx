import { useState, type ReactNode } from 'react';
import { Leaf, Minus, Plus } from 'lucide-react';
import { formatINR } from '@shared/core';
import { assetUrl } from '@/config/env';
import { cn, discountPercent } from '@/utils';

/** Product photo with lazy loading and a tasteful placeholder when the image is unavailable. */
export function ProductImage({
  src,
  alt,
  className,
  imgClassName,
  eager,
  sizes = '(min-width: 1024px) 240px, 45vw',
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  const url = assetUrl(src);
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {url && !failed ? (
        <img
          src={url}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          sizes={sizes}
          width={720}
          height={720}
          onError={() => setFailed(true)}
          className={cn('size-full object-cover', imgClassName)}
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-1 text-leaf-500/70" role="img" aria-label={alt}>
          <Leaf className="size-10" strokeWidth={1.4} />
          <span className="text-[0.65rem] font-bold uppercase tracking-widest text-charcoal-400">Photo soon</span>
        </div>
      )}
    </div>
  );
}

export function Price({ price, mrp, size = 'md', className }: { price: number; mrp?: number | null; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const off = discountPercent(price, mrp ?? null);
  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-1.5', className)}>
      <span className={cn('font-extrabold tracking-tight text-charcoal-900 tabular-nums', size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-sm' : 'text-lg')}>
        {formatINR(price)}
      </span>
      {off > 0 && (
        <>
          <s className="text-[0.8em] font-semibold text-charcoal-400 tabular-nums" aria-label={`was ${formatINR(mrp!)}`}>
            {formatINR(mrp!)}
          </s>
          <span className="text-[0.75em] font-extrabold text-leaf-600">{off}% off</span>
        </>
      )}
    </span>
  );
}

export function QuantityStepper({
  value,
  max,
  onChange,
  label,
  size = 'md',
  tone = 'forest',
}: {
  value: number;
  max: number;
  onChange: (next: number) => void;
  label: string;
  size?: 'sm' | 'md';
  tone?: 'forest' | 'light';
}) {
  const h = size === 'sm' ? 'h-9' : 'h-11';
  const btn = cn(
    'grid aspect-square h-full place-items-center rounded-full transition active:scale-90 disabled:opacity-40',
    tone === 'forest' ? 'hover:bg-white/15' : 'hover:bg-forest-900/10',
  );
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full p-0.5',
        h,
        tone === 'forest' ? 'bg-forest-800 text-ivory-50' : 'bg-mint-100 text-forest-800',
      )}
      role="group"
      aria-label={`Quantity for ${label}`}
    >
      <button type="button" className={btn} onClick={() => onChange(value - 1)} aria-label={value === 1 ? `Remove ${label}` : `Decrease ${label}`}>
        <Minus className="size-4" strokeWidth={2.6} />
      </button>
      <span key={value} className="min-w-7 animate-pop text-center text-sm font-extrabold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`Increase ${label}`}>
        <Plus className="size-4" strokeWidth={2.6} />
      </button>
    </div>
  );
}

export function EmptyState({ icon, title, children, action, className }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-14 text-center', className)}>
      <div className="relative mb-6 grid size-24 place-items-center rounded-full bg-mint-100 text-forest-700">
        <div className="absolute inset-0 -z-0 scale-125 rounded-full bg-mint-50" />
        <div className="relative">{icon}</div>
      </div>
      <h2 className="font-display text-2xl font-semibold text-forest-900">{title}</h2>
      {children && <div className="mt-2 max-w-md text-charcoal-500">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cn('inline-block size-5 animate-spin rounded-full border-2 border-current border-r-transparent', className)} role="status" aria-label="Loading" />;
}

export function Badge({ children, tone = 'mint', className }: { children: ReactNode; tone?: 'mint' | 'tomato' | 'turmeric' | 'forest' | 'ivory' | 'berry'; className?: string }) {
  const tones = {
    mint: 'bg-mint-100 text-forest-700',
    tomato: 'bg-tomato-100 text-tomato-500',
    turmeric: 'bg-turmeric-100 text-[#8a5a00]',
    forest: 'bg-forest-800 text-ivory-50',
    ivory: 'bg-ivory-50/90 text-forest-800',
    berry: 'bg-berry-100 text-berry-600',
  };
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.7rem] font-extrabold uppercase tracking-wider', tones[tone], className)}>{children}</span>;
}

export function SectionHeading({ eyebrow, title, action, className, children }: { eyebrow?: string; title: ReactNode; action?: ReactNode; className?: string; children?: ReactNode }) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8', className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-2 text-leaf-600">{eyebrow}</p>}
        <h2 className="text-balance font-display text-[1.9rem] font-semibold leading-[1.05] text-forest-900 sm:text-[2.6rem]">{title}</h2>
        {children && <p className="mt-3 text-charcoal-500">{children}</p>}
      </div>
      {action}
    </div>
  );
}
