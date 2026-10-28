import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, BellRing, CalendarClock, CheckCircle2, Clock, IndianRupee, MapPin, Package, Store, X } from 'lucide-react';
import { formatINR } from '@shared/core';
import { riderApi } from '@/api/endpoints';
import { Button } from '@/components/ui/Button';
import { playAlert } from '@/utils/alertSound';
import { cn } from '@/utils';
import type { AvailableOrder, Order } from '@/types';

const km = (d: number | null | undefined) => (d == null ? null : d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`);
/** Rings again every few seconds until the rider answers. */
const RING_EVERY_MS = 4000;

interface Booking {
  id: string;
  orderNumber: string;
  kind: 'offer' | 'assigned';
  /** Offers only: when it passes to the next rider. */
  expiresAt: string | null;
  pickup: string;
  pickupDistance: string | null;
  dropArea: string;
  items: number;
  total: number;
  cash: boolean;
  when: string | null;
}

function fromOffer(o: AvailableOrder): Booking {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    kind: 'offer',
    expiresAt: o.offer?.expiresAt ?? null,
    pickup: o.pickup ? `${o.pickup.shopName}${o.pickup.areaName ? `, ${o.pickup.areaName}` : ''}` : 'Brio Cart store',
    pickupDistance: km(o.distanceKm),
    dropArea: o.areaName,
    items: o.itemCount,
    total: o.total,
    cash: o.paymentMethod === 'COD',
    when: [o.deliveryDate, o.deliverySlot].filter(Boolean).join(' · ') || null,
  };
}

function fromAssigned(o: Order): Booking {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    kind: 'assigned',
    expiresAt: null,
    pickup: o.shop ? `${o.shop.name}${o.shop.areaName ? `, ${o.shop.areaName}` : ''}` : 'Brio Cart store',
    pickupDistance: null,
    dropArea: o.customer.areaName,
    items: o.items.reduce((n, i) => n + i.quantity, 0),
    total: o.total,
    cash: o.paymentStatus === 'UNPAID' && o.paymentMethod !== 'ONLINE',
    when: [o.deliveryDate, o.deliverySlot].filter(Boolean).join(' · ') || null,
  };
}

function useSecondsLeft(iso: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!iso) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [iso]);
  return iso ? Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 1000)) : null;
}

function BookingCard({ b, total, payout, onClose, onDone }: { b: Booking; total: number; payout: number | null; onClose: () => void; onDone: () => void }) {
  const left = useSecondsLeft(b.expiresAt);
  const expired = left === 0;
  const accept = useMutation({ mutationFn: () => (b.kind === 'offer' ? riderApi.claim(b.id) : riderApi.accept(b.id)), onSuccess: onDone });
  const decline = useMutation({ mutationFn: () => riderApi.decline(b.id), onSuccess: onDone });
  const busy = accept.isPending || decline.isPending;
  const error = accept.error ?? decline.error;

  // Ring now and every few seconds until answered.
  useEffect(() => {
    if (expired) return;
    playAlert('booking');
    const t = setInterval(() => playAlert('booking'), RING_EVERY_MS);
    return () => clearInterval(t);
  }, [expired]);
  useEffect(() => {
    if (expired) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expired]);

  const rows = [
    { icon: Store, label: 'Pick up', value: b.pickup, extra: b.pickupDistance ? `${b.pickupDistance} from you` : null },
    { icon: MapPin, label: 'Deliver to', value: b.dropArea, extra: null },
    { icon: Package, label: 'Order', value: `${b.items} item${b.items === 1 ? '' : 's'} · ${formatINR(b.total)}`, extra: b.cash ? `Collect ${formatINR(b.total)} cash` : 'Prepaid' },
    ...(b.when ? [{ icon: CalendarClock, label: 'Delivery', value: b.when, extra: null }] : []),
  ];

  return (
    <div className="fixed inset-0 z-[90] flex items-end bg-forest-950/60 p-3 backdrop-blur-[2px] sm:items-center sm:justify-center" role="alertdialog" aria-modal="true" aria-labelledby="booking-title" data-testid="new-booking">
      <div className="safe-bottom mx-auto w-full max-w-md animate-pop overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="grain relative bg-forest-900 px-5 pb-4 pt-5 text-ivory-50">
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full bg-lime-300 px-2.5 py-1 text-[0.7rem] font-extrabold uppercase text-forest-900">
                <BellRing className="size-3.5 animate-pulse" /> {b.kind === 'offer' ? 'New booking for you' : 'Assigned to you'}
              </p>
              <h2 id="booking-title" className="mt-2 font-mono text-xl font-bold">
                {b.orderNumber}
              </h2>
            </div>
            {left !== null ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 font-mono text-lg font-extrabold tabular-nums" aria-live="polite">
                <Clock className="size-4" /> {left}s
              </span>
            ) : (
              <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full bg-white/10" aria-label="Close">
                <X className="size-5" />
              </button>
            )}
          </div>
          {left !== null && (
            <div className="relative z-10 mt-3 h-1.5 overflow-hidden rounded-full bg-white/15" aria-hidden>
              <div className="h-full rounded-full bg-lime-300 transition-[width] duration-1000 ease-linear" style={{ width: `${total > 0 ? Math.min(100, (left / total) * 100) : 0}%` }} />
            </div>
          )}
        </div>
        <ul className="space-y-3 p-5">
          {rows.map(({ icon: Icon, label, value, extra }) => (
            <li key={label} className="flex gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-mint-100 text-forest-800">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 text-sm leading-tight">
                <span className="block text-xs font-bold uppercase tracking-wide text-charcoal-500">{label}</span>
                <span className="block font-bold text-charcoal-900">{value}</span>
                {extra && <span className={cn('block', b.cash && label === 'Order' ? 'font-bold text-tomato-500' : 'text-charcoal-500')}>{extra}</span>}
              </span>
            </li>
          ))}
          {payout !== null && payout > 0 && (
            <li className="flex items-center gap-2 rounded-2xl bg-lime-300/40 p-3 text-sm font-bold text-forest-900">
              <IndianRupee className="size-4" /> You earn {formatINR(payout)} for this delivery
            </li>
          )}
        </ul>
        {error && <p className="px-5 pb-2 text-sm font-semibold text-tomato-500">{(error as Error).message}</p>}
        <div className={cn('grid gap-2 px-5 pb-5', b.kind === 'offer' ? 'grid-cols-2' : 'grid-cols-1')}>
          {b.kind === 'offer' && (
            <Button size="lg" variant="outline" className="text-tomato-500" icon={<Ban className="size-5" />} disabled={busy || expired} loading={decline.isPending} onClick={() => decline.mutate()}>
              Decline
            </Button>
          )}
          <Button size="lg" icon={<CheckCircle2 className="size-5" />} disabled={busy || expired} loading={accept.isPending} onClick={() => accept.mutate()}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Full-screen ringing pop-up for every new booking, on any rider tab: an order offered to this rider
 * (nearest-rider dispatch) or one the store assigned directly. Each booking pops up once.
 */
export function NewBookingAlert({ online }: { online: boolean }) {
  const qc = useQueryClient();
  // Same queries as the Deliveries tab, so they're shared, not doubled.
  const available = useQuery({ queryKey: ['rider', 'available'], queryFn: riderApi.available, enabled: online, refetchInterval: online ? 10_000 : false });
  const orders = useQuery({ queryKey: ['rider', 'orders'], queryFn: riderApi.orders, refetchInterval: 15_000 });
  const earnings = useQuery({ queryKey: ['rider', 'earnings'], queryFn: riderApi.earnings, staleTime: 5 * 60_000 });
  const shown = useRef(new Set<string>());
  const [dismissed, setDismissed] = useState<string[]>([]);

  const bookings = useMemo(() => {
    const offers = (available.data?.items ?? []).filter((o) => o.offer && new Date(o.offer.expiresAt).getTime() > Date.now()).map(fromOffer);
    const assigned = (orders.data ?? []).filter((o) => o.delivery.status === 'ASSIGNED').map(fromAssigned);
    return [...offers, ...assigned];
  }, [available.data, orders.data]);

  const current = bookings.find((b) => !dismissed.includes(b.id) && !shown.current.has(`${b.id}:${b.kind}:done`));
  if (current) shown.current.add(current.id);

  if (!current) return null;
  const close = () => setDismissed((d) => [...d, current.id]);
  const done = () => {
    shown.current.add(`${current.id}:${current.kind}:done`);
    close();
    void qc.invalidateQueries({ queryKey: ['rider'] });
  };
  return <BookingCard key={current.id} b={current} total={available.data?.offerSeconds ?? 45} payout={earnings.data?.payoutPerDelivery ?? null} onClose={close} onDone={done} />;
}
