import { useEffect, useState } from 'react';
import { Banknote, BadgeCheck, ChevronLeft, ChevronRight, Clock3, Heart, Leaf, MapPin, MapPinOff, Refrigerator, Star, Truck, X, ZoomIn } from 'lucide-react';
import { formatINR } from '@shared/core';
import type { Product } from '@/types';
import { useShopperLocation, useProductReach } from '@/hooks/useShopper';
import { useDeliveryRules } from '@/hooks/useStoreInfo';
import { ProductImage } from '@/components/ui/misc';
import { cn } from '@/utils';

/**
 * Photo gallery: main photo plus thumbnails; click (or tap) to open a full-screen view where the
 * photo can be zoomed and moved around. Works with one photo too.
 */
export function ProductGallery({ product, plate, grey }: { product: Product; plate: string; grey?: boolean }) {
  const photos = product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : [];
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);
  useEffect(() => setI(0), [product.id]);
  const src = photos[i] ?? null;
  return (
    <div>
      <button
        type="button"
        onClick={() => src && setOpen(true)}
        className={cn('group relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-[2rem]', plate)}
        aria-label={`Zoom photo of ${product.name}`}
      >
        <div className="absolute inset-[12%] rounded-full bg-white/50 blur-2xl" aria-hidden />
        <ProductImage src={src} alt={product.name} eager sizes="(min-width:1024px) 600px, 100vw" className="relative size-full p-8 sm:p-14" imgClassName={cn(grey && 'grayscale')} />
        <span className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-charcoal-700 opacity-0 shadow-soft transition group-hover:opacity-100 group-focus-visible:opacity-100">
          <ZoomIn className="size-4" /> Click to zoom
        </span>
      </button>
      {photos.length > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto" role="tablist" aria-label="Product photos">
          {photos.map((p, n) => (
            <button
              key={p + n}
              type="button"
              role="tab"
              aria-selected={n === i}
              aria-label={`Photo ${n + 1}`}
              onClick={() => setI(n)}
              className={cn('size-20 shrink-0 overflow-hidden rounded-2xl border-2 bg-white p-1.5 transition', n === i ? 'border-forest-700' : 'border-line hover:border-forest-700/40')}
            >
              <ProductImage src={p} alt="" className="size-full" imgClassName="object-contain!" />
            </button>
          ))}
        </div>
      )}
      {open && <Lightbox photos={photos} start={i} name={product.name} onClose={() => setOpen(false)} />}
    </div>
  );
}

function Lightbox({ photos, start, name, onClose }: { photos: string[]; start: number; name: string; onClose: () => void }) {
  const [i, setI] = useState(start);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');
  const go = (d: number) => {
    setZoom(false);
    setI((x) => (x + d + photos.length) % photos.length);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="fixed inset-0 z-[95] flex flex-col bg-white" role="dialog" aria-modal="true" aria-label={`Photos of ${name}`}>
      <div className="flex items-center justify-between p-4">
        <p className="text-sm font-bold text-charcoal-700">
          {name} · {i + 1} / {photos.length}
        </p>
        <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-full hover:bg-ivory-100" aria-label="Close photos">
          <X className="size-6" />
        </button>
      </div>
      <div
        className={cn('relative flex-1 overflow-hidden', zoom ? 'cursor-zoom-out' : 'cursor-zoom-in')}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
          setZoom((z) => !z);
        }}
        onMouseMove={(e) => {
          if (!zoom) return;
          const r = e.currentTarget.getBoundingClientRect();
          setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
        }}
      >
        <img
          src={photos[i]}
          alt={name}
          className="size-full object-contain transition-transform duration-300"
          style={{ transform: zoom ? 'scale(2.4)' : undefined, transformOrigin: origin }}
          draggable={false}
        />
        {photos.length > 1 && (
          <>
            <button type="button" onClick={(e) => (e.stopPropagation(), go(-1))} className="absolute left-3 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white shadow-lift" aria-label="Previous photo">
              <ChevronLeft className="size-6" />
            </button>
            <button type="button" onClick={(e) => (e.stopPropagation(), go(1))} className="absolute right-3 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white shadow-lift" aria-label="Next photo">
              <ChevronRight className="size-6" />
            </button>
          </>
        )}
      </div>
      <p className="p-3 text-center text-xs text-charcoal-500">{zoom ? 'Move to look around · click to zoom out' : 'Click the photo to zoom in'}</p>
    </div>
  );
}

/** Description plus origin, freshness & storage and benefits, whichever the store has written. */
export function ProductDetails({ product }: { product: Product }) {
  const rows = [
    { icon: MapPin, title: 'Origin', text: product.origin },
    { icon: Refrigerator, title: 'Freshness & storage', text: product.storageTips },
    { icon: Heart, title: 'Benefits', text: product.benefits },
  ].filter((r) => r.text?.trim());
  if (!product.description && !rows.length) return null;
  const hi = (t: string) => (/[ऀ-ॿ]/.test(t) ? 'hi' : undefined);
  return (
    <section aria-labelledby="about-item" className="mt-8 rounded-3xl bg-ivory-100 p-5 sm:p-6">
      <h2 id="about-item" className="font-sans text-base font-extrabold tracking-normal text-charcoal-900">
        About this item
      </h2>
      {product.description && (
        <p lang={hi(product.description)} className="mt-2 whitespace-pre-line text-charcoal-700">
          {product.description}
        </p>
      )}
      {rows.length > 0 && (
        <dl className="mt-4 grid gap-3">
          {rows.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-3 rounded-2xl bg-white p-4">
              <Icon className="mt-0.5 size-5 shrink-0 text-leaf-600" />
              <div>
                <dt className="text-sm font-bold text-charcoal-900">{title}</dt>
                <dd lang={hi(text!)} className="mt-0.5 whitespace-pre-line text-sm text-charcoal-700">
                  {text}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

/** Delivery time and fees for the shopper's location; says so plainly when it can't be delivered there. */
export function DeliveryBox({ product }: { product: Product }) {
  const shopper = useShopperLocation();
  const reach = useProductReach(product);
  const rules = useDeliveryRules();
  if (!reach.ok) {
    return (
      <div className="mt-8 flex items-start gap-3 rounded-2xl border border-turmeric-400/60 bg-turmeric-100 p-4 text-sm text-[#6b4500]" role="note">
        <MapPinOff className="mt-0.5 size-5 shrink-0" />
        <p>
          <b>{reach.message}</b> You’re shopping for {shopper.label}. Change your location at the top of the page.
        </p>
      </div>
    );
  }
  const courier = shopper.location?.kind === 'COURIER';
  const items = [
    { icon: Clock3, t: courier ? `Delivery ${shopper.eta.toLowerCase()}` : `${shopper.eta} delivery`, s: courier ? `By courier to ${shopper.place}` : shopper.location ? `To ${shopper.place}` : 'In Lucknow · choose your area above' },
    courier
      ? { icon: Truck, t: 'Shipping cost', s: 'Confirmed after you order' }
      : { icon: Truck, t: rules.freeDeliveryThreshold > 0 ? `Free over ${formatINR(rules.freeDeliveryThreshold)}` : 'Home delivery', s: `${formatINR(rules.deliveryFee)} below that` },
    { icon: Banknote, t: 'Pay your way', s: 'Online, UPI or cash on delivery' },
  ];
  return (
    <ul className="mt-8 grid gap-3 sm:grid-cols-3" aria-label="Delivery">
      {items.map(({ icon: Icon, t, s }) => (
        <li key={t} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3">
          <Icon className="size-5 shrink-0 text-leaf-600" />
          <span className="text-sm leading-tight">
            <span className="block font-bold">{t}</span>
            <span className="text-charcoal-500">{s}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('inline-flex', className)} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn('size-4', n <= Math.round(value) ? 'text-turmeric-400' : 'text-ivory-300')} fill="currentColor" strokeWidth={0} />
      ))}
    </span>
  );
}

/** Star rating summary and written reviews from customers who received the item. */
export function ProductReviews({ product }: { product: Product }) {
  const reviews = product.reviews ?? [];
  const rating = product.rating;
  return (
    <section aria-labelledby="reviews-h" className="container-page pt-14">
      <div className="rounded-3xl border border-line bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="reviews-h" className="font-sans text-2xl font-bold tracking-tight text-charcoal-900">
              Ratings &amp; reviews
            </h2>
            <p className="mt-1 text-sm text-charcoal-500">From customers who bought and received it.</p>
          </div>
          {rating && (
            <div className="flex items-center gap-3 rounded-2xl bg-mint-50 px-4 py-3">
              <span className="text-3xl font-extrabold tabular-nums text-charcoal-900">{rating.average.toFixed(1)}</span>
              <span>
                <Stars value={rating.average} />
                <span className="block text-xs text-charcoal-500">
                  {rating.count} rating{rating.count === 1 ? '' : 's'}
                </span>
              </span>
            </div>
          )}
        </div>
        {reviews.length ? (
          <ul className="mt-6 grid gap-3 md:grid-cols-2">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-2xl border border-line p-4">
                <div className="flex items-center justify-between gap-2">
                  <Stars value={r.stars} />
                  {r.at && <span className="text-xs text-charcoal-400">{new Date(r.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-charcoal-700">{r.text}</p>
                <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-charcoal-500">
                  {r.name} · {r.packLabel}
                  <span className="inline-flex items-center gap-1 text-leaf-600">
                    <BadgeCheck className="size-3.5" /> Verified purchase
                  </span>
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 flex items-center gap-2 rounded-2xl bg-ivory-100 p-4 text-sm text-charcoal-700">
            <Leaf className="size-4 text-leaf-600" />
            {rating ? 'No written reviews yet.' : 'No reviews yet.'} After delivery, you can rate and review what you bought from your order page.
          </p>
        )}
      </div>
    </section>
  );
}
