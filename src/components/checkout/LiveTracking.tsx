import { lazy, Suspense, useMemo } from 'react';
import { Bike, KeyRound, MapPin, PackageCheck, Phone, Sparkles, Timer } from 'lucide-react';
import type { Order } from '@/types';
import type { MapMarker } from '@/components/maps/DeliveryMap';
import { cn } from '@/utils';

const DeliveryMap = lazy(() => import('@/components/maps/DeliveryMap'));

function headline(o: Order) {
  const t = o.tracking;
  switch (o.status) {
    case 'PENDING':
      return { title: 'Order received', sub: 'The store will confirm it shortly.' };
    case 'CONFIRMED':
      return { title: 'Order confirmed', sub: o.deliverySlot ? `Scheduled for ${o.deliverySlot}` : 'We’ll start packing soon.' };
    case 'PREPARING':
      return { title: 'Packing your order', sub: 'Fresh produce is being sorted and packed.' };
    case 'OUT_FOR_DELIVERY':
      if (t?.arrived) return { title: 'Your rider has arrived', sub: 'Share the delivery code to receive your order.' };
      if (t?.etaMinutes != null) return { title: `Arriving in ~${Math.max(1, t.etaMinutes)} min`, sub: 'Your order is on the way.' };
      return { title: 'On the way', sub: 'Your order has left the store.' };
    case 'DELIVERED':
      return { title: 'Delivered', sub: 'Enjoy your fresh groceries!' };
    default:
      return { title: 'Order cancelled', sub: '' };
  }
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export function LiveTracking({ order }: { order: Order }) {
  const t = order.tracking;
  const h = headline(order);
  const onTheWay = order.status === 'OUT_FOR_DELIVERY';
  const isDemo = t?.source === 'DEMO';

  const markers = useMemo<MapMarker[]>(() => {
    if (!t) return [];
    const m: MapMarker[] = [{ id: 'store', kind: 'store', position: t.store, label: 'Brio Cart store' }];
    if (t.destination) m.push({ id: 'home', kind: 'home', position: t.destination, label: `${order.customer.areaName} (approx.)` });
    if (t.location) m.push({ id: 'rider', kind: 'rider', position: t.location, label: t.rider?.name ?? 'Rider' });
    return m;
  }, [t, order.customer.areaName]);

  if (order.status === 'CANCELLED' || !t) return null;
  const showMap = !!t.destination && order.status !== 'DELIVERED';

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-line bg-white" aria-labelledby="live-h" aria-live="polite">
      <div className="grain relative bg-forest-900 px-5 py-5 text-ivory-50 sm:px-6">
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-lime-300">
              {onTheWay ? <Bike className="size-3.5" /> : order.status === 'DELIVERED' ? <PackageCheck className="size-3.5" /> : <Timer className="size-3.5" />}
              {onTheWay ? 'Live tracking' : 'Order status'}
            </p>
            <h2 id="live-h" className="mt-1.5 font-display text-[1.75rem] font-medium leading-tight sm:text-3xl">
              {h.title}
            </h2>
            {h.sub && <p className="mt-1 text-sm text-ivory-50/70">{h.sub}</p>}
          </div>
          {isDemo && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-turmeric-400 px-2.5 py-1 text-[0.65rem] font-extrabold uppercase tracking-wider text-forest-900" title="Presentation simulation — not a real rider">
              <Sparkles className="size-3" /> Demo simulation
            </span>
          )}
        </div>
        {onTheWay && t.progress != null && (
          <div className="relative z-10 mt-4 h-1.5 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-lime-300 transition-[width] duration-1000" style={{ width: `${Math.round(t.progress * 100)}%` }} />
          </div>
        )}
      </div>

      {showMap && (
        <div className="relative">
          <Suspense fallback={<div className="skeleton h-72 rounded-none" />}>
            <DeliveryMap className="h-72 sm:h-80" markers={markers} route={t.route} fitKey={`${order.id}-${markers.length}-${!!t.route}`} />
          </Suspense>
          {!t.location && (
            <p className="pointer-events-none absolute inset-x-3 bottom-3 z-[500] rounded-2xl bg-white/95 px-4 py-2.5 text-center text-xs font-semibold text-charcoal-700 shadow-soft">
              {onTheWay ? 'Waiting for your rider’s live location…' : 'Your rider’s live location will appear here once they start the trip.'}
            </p>
          )}
          {t.location && t.source === 'LIVE' && (
            <p className="pointer-events-none absolute left-3 top-3 z-[500] rounded-full bg-white/95 px-3 py-1 text-[0.7rem] font-bold text-forest-800 shadow-soft">
              <span className="mr-1 inline-block size-2 animate-pulse rounded-full bg-leaf-500" /> Live GPS · updated {new Date(t.location.at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
        {t.rider ? (
          <div className="flex items-center gap-3 rounded-2xl bg-ivory-100 p-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-forest-800 font-extrabold text-lime-300">{initials(t.rider.name)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-extrabold">{t.rider.name}</p>
              <p className="text-xs text-charcoal-500">Your delivery partner</p>
              {t.rider.vehicleNumber && (
                <span className="mt-1 inline-block rounded border border-charcoal-900/20 bg-turmeric-100 px-1.5 py-0.5 font-mono text-[0.68rem] font-bold tracking-wider">{t.rider.vehicleNumber}</span>
              )}
            </div>
            {t.rider.phone && (
              <a href={`tel:+91${t.rider.phone}`} className="grid size-11 shrink-0 place-items-center rounded-full bg-leaf-500 text-white shadow-md transition hover:bg-leaf-600" aria-label={`Call ${t.rider.name}`}>
                <Phone className="size-5" />
              </a>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl bg-ivory-100 p-3 text-sm text-charcoal-500">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-ivory-200">
              <Bike className="size-5" />
            </span>
            A delivery partner will be assigned before dispatch.
          </div>
        )}

        {order.deliveryOtp ? (
          <div className={cn('flex items-center gap-3 rounded-2xl p-3', onTheWay ? 'bg-lime-200' : 'bg-mint-50')}>
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-forest-800">
              <KeyRound className="size-5" />
            </span>
            <div>
              <p className="text-xs font-bold text-forest-800">Delivery code — share only at your door</p>
              <p className="font-mono text-2xl font-extrabold tracking-[0.35em] text-forest-900" aria-label={`Delivery code ${order.deliveryOtp.split('').join(' ')}`}>
                {order.deliveryOtp}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl bg-mint-50 p-3 text-sm text-forest-800">
            <MapPin className="size-5 shrink-0" /> {order.customer.house}, {order.customer.street}, {order.customer.areaName}
          </div>
        )}
      </div>
    </section>
  );
}
