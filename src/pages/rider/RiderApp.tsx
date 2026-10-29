import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Banknote, Bell, Bike, CheckCircle2, ChevronDown, Clock, FileCheck, History, KeyRound, LogOut, MapPin, MapPinCheck, Navigation, Route as RouteIcon, Package, PackageCheck, Phone, Power, Radio, RefreshCw, TriangleAlert, Wallet, X } from 'lucide-react';
import { DELIVERY_OTP_LENGTH, DELIVERY_STATUS_LABELS, formatINR, ORDER_STATUS_LABELS } from '@shared/core';
import { riderApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import type { AvailableOrder, Order } from '@/types';
import { BrioMark } from '@/components/ui/Brand';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/misc';
import { NotificationBell, NotificationList } from '@/components/notifications/Notifications';
import { VerificationPanel } from '@/components/verification/VerificationPanel';
import { cn, formatDate, openExternal } from '@/utils';
import { CashTab } from './CashTab';
import { NewBookingAlert } from './NewBookingAlert';
import { PushPrompt } from '@/components/notifications/RiderArrivedAlert';

/** A stationary phone may report no new fix for minutes; resend the last one so the rider stays "nearby". */
const HEARTBEAT_MS = 60_000;

/**
 * Shares the rider's GPS (browser geolocation) while enabled: the server offers orders to the nearest
 * rider, and applies it to orders they are delivering. Uploads at most every `minGapMs`.
 */
function useLiveLocation(enabled: boolean, minGapMs: number) {
  const qc = useQueryClient();
  const [state, setState] = useState<{ status: 'off' | 'waiting' | 'live' | 'error'; accuracy?: number; sentAt?: Date; message?: string }>({ status: 'off' });
  const last = useRef(0);
  const gap = useRef(minGapMs);
  gap.current = minGapMs;
  useEffect(() => {
    if (!enabled) {
      setState({ status: 'off' });
      return;
    }
    if (!('geolocation' in navigator)) {
      setState({ status: 'error', message: 'This device has no GPS access.' });
      return;
    }
    setState({ status: 'waiting' });
    let latest: GeolocationCoordinates | null = null;
    const send = (c: GeolocationCoordinates) => {
      last.current = Date.now();
      riderApi
        .location(c.latitude, c.longitude, c.accuracy)
        .then((r) => {
          setState({ status: 'live', accuracy: c.accuracy, sentAt: new Date() });
          // Reached a pinned door: the card switches to "customer told you've arrived".
          if (r.arrived) void qc.invalidateQueries({ queryKey: ['rider', 'orders'] });
        })
        .catch((e) => setState({ status: 'error', message: (e as Error).message }));
    };
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        latest = pos.coords;
        if (Date.now() - last.current >= gap.current) send(pos.coords); // throttle uploads
      },
      (err) => setState({ status: 'error', message: err.code === err.PERMISSION_DENIED ? 'Location permission denied. Allow location access to get nearby orders and share live tracking.' : err.message }),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    const beat = setInterval(() => {
      if (latest && Date.now() - last.current >= HEARTBEAT_MS) send(latest);
    }, HEARTBEAT_MS / 2);
    return () => {
      navigator.geolocation.clearWatch(id);
      clearInterval(beat);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
  return state;
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="safe-bottom max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] bg-white p-6 sm:max-w-sm sm:rounded-[2rem]">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-forest-900">{title}</h2>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full hover:bg-ivory-100" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const refreshRider = (qc: ReturnType<typeof useQueryClient>) => qc.invalidateQueries({ queryKey: ['rider'] });

function OtpSheet({ order, onClose }: { order: Order; onClose: () => void }) {
  const qc = useQueryClient();
  const [otp, setOtp] = useState('');
  const collect = order.paymentStatus === 'UNPAID' && order.paymentMethod !== 'ONLINE';
  const cod = collect && order.paymentMethod === 'COD';
  const [collected, setCollected] = useState(false);
  const [cash, setCash] = useState(String(order.total / 100));
  const [diffReason, setDiffReason] = useState('');
  const cashPaise = Math.round(Number(cash) * 100);
  const cashValid = cash.trim() !== '' && Number.isFinite(cashPaise) && cashPaise >= 0;
  const differs = cod && cashValid && cashPaise !== order.total;
  const deliver = useMutation({
    mutationFn: () =>
      riderApi.deliver(order.id, otp, cod ? { cashAmount: cashPaise / 100, cashDifferenceReason: differs ? diffReason.trim() : undefined } : { cashCollected: collected }),
    onSuccess: () => {
      void refreshRider(qc);
      onClose();
    },
  });
  const press = (d: string) => setOtp((o) => (o.length < DELIVERY_OTP_LENGTH ? o + d : o));
  return (
    <Sheet title="Delivery code" onClose={onClose}>
      <p className="mt-1 text-sm text-charcoal-500">
        Ask {order.customer.name.split(' ')[0]} for the {DELIVERY_OTP_LENGTH}-digit code shown in their order.
      </p>
      <div className="mt-5 flex justify-center gap-3" aria-live="polite">
        {Array.from({ length: DELIVERY_OTP_LENGTH }, (_, i) => (
          <span key={i} className={cn('grid size-14 place-items-center rounded-2xl border-2 font-mono text-2xl font-extrabold', otp[i] ? 'border-forest-700 bg-mint-50' : 'border-line')}>
            {otp[i] ?? ''}
          </span>
        ))}
      </div>
      <div className="mx-auto mt-5 grid max-w-[16rem] grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => (k === 'C' ? setOtp('') : k === '⌫' ? setOtp((o) => o.slice(0, -1)) : press(k))}
            className="h-12 rounded-2xl bg-ivory-100 text-lg font-extrabold transition active:scale-95 active:bg-ivory-200"
            aria-label={k === '⌫' ? 'Delete' : k === 'C' ? 'Clear' : k}
          >
            {k}
          </button>
        ))}
      </div>
      {cod && (
        <div className="mt-5 rounded-2xl bg-turmeric-100 p-3 text-sm">
          <label className="flex items-center justify-between gap-3 font-bold">
            Cash collected (₹)
            <input inputMode="decimal" aria-label="Cash collected" value={cash} onChange={(e) => setCash(e.target.value.replace(/[^\d.]/g, ''))} className="h-10 w-28 rounded-xl border border-line bg-white px-3 text-right font-mono" />
          </label>
          <p className="mt-1 text-xs text-charcoal-700">Order total {formatINR(order.total)}</p>
          {differs && (
            <input aria-label="Reason for the difference" value={diffReason} maxLength={200} onChange={(e) => setDiffReason(e.target.value)} placeholder="Why is it different? e.g. customer had no change" className="mt-2 h-10 w-full rounded-xl border border-line bg-white px-3" />
          )}
        </div>
      )}
      {collect && !cod && (
        <label className="mt-5 flex items-center gap-3 rounded-2xl bg-turmeric-100 p-3 text-sm font-bold">
          <input type="checkbox" checked={collected} onChange={(e) => setCollected(e.target.checked)} className="size-5 accent-forest-700" />
          Collected {formatINR(order.total)} ({order.paymentMethod === 'COD' ? 'cash' : 'UPI'})
        </label>
      )}
      {deliver.error && <p className="mt-3 text-center text-sm font-semibold text-tomato-500">{(deliver.error as Error).message}</p>}
      <Button size="lg" block className="mt-5" disabled={otp.length !== DELIVERY_OTP_LENGTH || (cod ? !cashValid || (differs && diffReason.trim().length < 3) : collect && !collected)} loading={deliver.isPending} onClick={() => deliver.mutate()}>
        Confirm delivery
      </Button>
    </Sheet>
  );
}

const FAIL_REASONS = ['Customer unreachable', 'Customer not at address', 'Wrong or incomplete address', 'Customer refused the order'];

/** "Can't deliver" (after pickup) or "Reject assignment" (before pickup), both with a reason. */
function ReasonSheet({ order, mode, onClose }: { order: Order; mode: 'fail' | 'reject'; onClose: () => void }) {
  const qc = useQueryClient();
  const [choice, setChoice] = useState(mode === 'fail' ? FAIL_REASONS[0]! : '');
  const [other, setOther] = useState('');
  const reason = choice === 'Other' ? other.trim() : choice;
  const run = useMutation({
    mutationFn: async (): Promise<unknown> => (mode === 'fail' ? riderApi.fail(order.id, reason) : riderApi.reject(order.id, reason || undefined)),
    onSuccess: () => {
      void refreshRider(qc);
      onClose();
    },
  });
  const options = mode === 'fail' ? [...FAIL_REASONS, 'Other'] : ['', 'Too far away', 'Vehicle problem', 'Already on another delivery', 'Other'];
  return (
    <Sheet title={mode === 'fail' ? 'Can’t deliver' : 'Reject order'} onClose={onClose}>
      <p className="mt-1 text-sm text-charcoal-500">
        {mode === 'fail' ? 'The store will be told right away and will contact the customer.' : 'The order goes back to the store to assign another rider.'}
      </p>
      <fieldset className="mt-4 space-y-2">
        <legend className="sr-only">Reason</legend>
        {options.map((r) => (
          <label key={r || 'none'} className={cn('flex items-center gap-3 rounded-2xl border p-3 text-sm font-bold', choice === r ? 'border-forest-700 bg-mint-50' : 'border-line')}>
            <input type="radio" name="reason" checked={choice === r} onChange={() => setChoice(r)} className="size-4 accent-forest-700" />
            {r || 'No reason'}
          </label>
        ))}
      </fieldset>
      {choice === 'Other' && (
        <input value={other} onChange={(e) => setOther(e.target.value)} maxLength={200} placeholder="What happened?" className="mt-3 h-12 w-full rounded-2xl border border-line px-4 text-sm" aria-label="Reason" autoFocus />
      )}
      {run.error && <p className="mt-3 text-sm font-semibold text-tomato-500">{(run.error as Error).message}</p>}
      <Button size="lg" block variant="danger" className="mt-5" disabled={mode === 'fail' && reason.length < 3} loading={run.isPending} onClick={() => run.mutate()}>
        {mode === 'fail' ? 'Report failed delivery' : 'Reject order'}
      </Button>
    </Sheet>
  );
}

const STEP_TONE: Record<string, string> = {
  ASSIGNED: 'bg-turmeric-100 text-[#6b4500]',
  ACCEPTED: 'bg-sky-100 text-[#1e4f78]',
  PICKED_UP: 'bg-peach-100 text-[#9a3f12]',
  OUT_FOR_DELIVERY: 'bg-lime-300 text-forest-900',
  DELIVERED: 'bg-forest-800 text-ivory-50',
  FAILED: 'bg-tomato-100 text-tomato-500',
};

function OrderCard({ order, onSheet }: { order: Order; onSheet: (s: { order: Order; kind: 'otp' | 'fail' | 'reject' }) => void }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(order.delivery.status === 'ASSIGNED');
  const onDone = () => refreshRider(qc);
  const accept = useMutation({ mutationFn: () => riderApi.accept(order.id), onSuccess: onDone });
  const [pickupCode, setPickupCode] = useState('');
  const pickup = useMutation({ mutationFn: () => riderApi.pickup(order.id, order.shop ? pickupCode : undefined), onSuccess: onDone });
  const start = useMutation({ mutationFn: () => riderApi.start(order.id), onSuccess: onDone });
  const arrived = useMutation({ mutationFn: () => riderApi.arrived(order.id), onSuccess: onDone });
  const address = [order.customer.house, order.customer.street, order.customer.landmark, order.customer.areaName, 'Lucknow'].filter(Boolean).join(', ');
  const toCollect = order.paymentStatus === 'UNPAID' && order.paymentMethod !== 'ONLINE';
  const step = order.delivery.status;
  const error = accept.error ?? pickup.error ?? start.error ?? arrived.error;
  const waitingForStore = step === 'ACCEPTED' && order.status === 'PENDING';
  /** Shop orders: collect from the shop once it has packed the order, with its pickup code. */
  const shop = order.shop;
  const waitingForShop = !!shop && step === 'ACCEPTED' && !shop.readyAt;

  return (
    <article className={cn('rounded-[1.5rem] bg-white p-4 shadow-soft', step === 'OUT_FOR_DELIVERY' && 'ring-2 ring-lime-300', step === 'ASSIGNED' && 'ring-2 ring-turmeric-400')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {order.route && order.route.of > 1 && (
            <p className="mb-1 inline-block whitespace-nowrap rounded-full bg-forest-800 px-2.5 py-0.5 text-[0.7rem] font-extrabold text-lime-300" data-testid="stop-chip">
              Stop {order.route.stop} of {order.route.of} · {order.route.kind === 'PICKUP' ? 'Collect' : 'Drop'}
            </p>
          )}
          <p className="font-mono text-sm font-bold text-charcoal-500">{order.orderNumber}</p>
          <p className="truncate text-lg font-extrabold">{order.customer.name}</p>
        </div>
        <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-extrabold uppercase', step ? STEP_TONE[step] : 'bg-ivory-200')}>
          {step ? DELIVERY_STATUS_LABELS[step] : ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>
      <p className="mt-2 flex gap-2 text-sm text-charcoal-700">
        <MapPin className="mt-0.5 size-4 shrink-0 text-tomato-500" /> {address}
      </p>
      {order.customer.instructions && <p className="mt-2 rounded-xl bg-ivory-100 p-2 text-sm">“{order.customer.instructions}”</p>}
      {shop && (step === 'ACCEPTED' || step === 'ASSIGNED') && (
        <div className="mt-2 rounded-2xl bg-mint-50 p-3 text-sm" data-testid="pickup-shop">
          <p className="font-bold text-forest-800">Collect from {shop.name}</p>
          <p className="text-charcoal-700">{shop.address}{shop.areaName ? `, ${shop.areaName}` : ''}</p>
          <div className="mt-2 flex gap-3 text-sm font-bold text-forest-700">
            <button type="button" onClick={() => openExternal(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${shop.address}, ${shop.areaName ?? ''}, Lucknow`)}&travelmode=two-wheeler`)} className="underline">Directions</button>
            <a href={`tel:+91${shop.phone}`} className="underline">Call shop</a>
          </div>
        </div>
      )}
      <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-ivory-100 px-3 py-2 text-sm">
        <span className="min-w-0 truncate">{order.deliverySlot ?? 'Today'}</span>
        <span className={cn('shrink-0 font-extrabold', toCollect ? 'text-tomato-500' : 'text-leaf-600')}>
          {toCollect ? `Collect ${formatINR(order.total)}` : order.paymentStatus === 'DEMO_PAID' ? 'Prepaid (demo)' : 'Prepaid'}
        </span>
      </div>
      <button type="button" onClick={() => setOpen((o) => !o)} className="mt-2 flex w-full items-center justify-between py-1 text-sm font-bold text-charcoal-500" aria-expanded={open}>
        {order.items.reduce((n, i) => n + i.quantity, 0)} items <ChevronDown className={cn('size-4 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <ul className="mb-2 space-y-1 text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-2">
              <span className="min-w-0">
                {i.productName} · {i.variantLabel}
              </span>
              <span className="font-bold">×{i.quantity}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 grid grid-cols-2 gap-2">
        {(step === 'PICKED_UP' || step === 'OUT_FOR_DELIVERY' || step === 'ACCEPTED') && (
          <>
            <Button variant="outline" icon={<Navigation className="size-4" />} onClick={() => openExternal(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=two-wheeler`)}>
              Navigate
            </Button>
            <a href={`tel:+91${order.customer.phone}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-mint-100 font-bold text-forest-800">
              <Phone className="size-4" /> Call
            </a>
          </>
        )}
        {step === 'ASSIGNED' && (
          <>
            <Button variant="outline" className="text-tomato-500" icon={<Ban className="size-4" />} onClick={() => onSheet({ order, kind: 'reject' })}>
              Reject
            </Button>
            <Button icon={<CheckCircle2 className="size-4" />} loading={accept.isPending} onClick={() => accept.mutate()}>
              Accept
            </Button>
          </>
        )}
        {step === 'ACCEPTED' && shop && (
          <>
            {!waitingForShop && (
              <input
                value={pickupCode}
                onChange={(e) => setPickupCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Shop's pickup code"
                aria-label="Pickup code from the shop"
                className="col-span-2 h-12 rounded-2xl border border-line px-4 text-center font-mono text-xl tracking-[0.4em]"
              />
            )}
            <Button className="col-span-2" size="lg" variant="lime" icon={<PackageCheck className="size-5" />} disabled={waitingForShop || pickupCode.length !== 4} loading={pickup.isPending} onClick={() => pickup.mutate()}>
              {waitingForShop ? `Waiting for ${shop.name} to pack it` : 'Collected from shop'}
            </Button>
            <button type="button" onClick={() => onSheet({ order, kind: 'reject' })} className="col-span-2 py-1 text-sm font-bold text-tomato-500">
              Reject this order
            </button>
          </>
        )}
        {step === 'ACCEPTED' && !shop && (
          <>
            <Button className="col-span-2" size="lg" variant="lime" icon={<PackageCheck className="size-5" />} disabled={waitingForStore} loading={pickup.isPending} onClick={() => pickup.mutate()}>
              {waitingForStore ? 'Waiting for the store to confirm' : 'Picked up from store'}
            </Button>
            <button type="button" onClick={() => onSheet({ order, kind: 'reject' })} className="col-span-2 py-1 text-sm font-bold text-tomato-500">
              Reject this order
            </button>
          </>
        )}
        {step === 'PICKED_UP' && (
          <Button className="col-span-2" size="lg" variant="lime" icon={<Bike className="size-5" />} loading={start.isPending} onClick={() => start.mutate()}>
            Start trip · out for delivery
          </Button>
        )}
        {step === 'OUT_FOR_DELIVERY' &&
          (order.delivery.arrivedAt ? (
            <p className="col-span-2 rounded-2xl bg-mint-100 p-2.5 text-center text-sm font-bold text-forest-800" data-testid="arrived-done">
              Customer told you’ve arrived
            </p>
          ) : (
            <div className="col-span-2">
              <Button block variant="lime" icon={<MapPinCheck className="size-5" />} loading={arrived.isPending} onClick={() => arrived.mutate()}>
                I’ve arrived
              </Button>
              <p className="mt-1 text-center text-xs text-charcoal-500">
                {order.customer.pinned ? 'Tells the customer. Happens by itself within 80 m of their pinned door.' : 'Tells the customer you’re at their door.'}
              </p>
            </div>
          ))}
        {step === 'OUT_FOR_DELIVERY' && (
          <Button className="col-span-2" size="lg" icon={<KeyRound className="size-5" />} disabled={order.delivery.otpLocked} onClick={() => onSheet({ order, kind: 'otp' })}>
            {order.delivery.otpLocked ? 'Code locked · call the store' : 'Deliver with code'}
          </Button>
        )}
        {(step === 'PICKED_UP' || step === 'OUT_FOR_DELIVERY') && (
          <button type="button" onClick={() => onSheet({ order, kind: 'fail' })} className="col-span-2 inline-flex items-center justify-center gap-1.5 py-1 text-sm font-bold text-tomato-500">
            <TriangleAlert className="size-4" /> Customer unreachable / can’t deliver
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm font-semibold text-tomato-500">{(error as Error).message}</p>}
    </article>
  );
}

function OnlineToggle({ online, onChange, pending, loc, onRoad }: { online: boolean; onChange: (v: boolean) => void; pending: boolean; loc: ReturnType<typeof useLiveLocation>; onRoad: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={online}
      disabled={pending}
      onClick={() => onChange(!online)}
      className={cn('flex w-full items-center gap-3 rounded-2xl p-3 text-left transition disabled:opacity-70', online ? 'bg-lime-300 text-forest-900' : 'bg-white/10')}
    >
      <span className={cn('relative grid size-10 place-items-center rounded-full', online ? 'bg-forest-900 text-lime-300' : 'bg-white/10')}>
        {online ? <Radio className="size-5" /> : <Power className="size-5" />}
        {loc.status === 'live' && <span className="absolute inset-0 animate-ping rounded-full bg-forest-900/30" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-extrabold">{online ? 'Online · available for orders' : 'Offline'}</span>
        <span className="block text-xs opacity-75">
          {!online
            ? 'Go online to receive deliveries. Your location is shared only while you are online.'
            : loc.status === 'live'
              ? `Sharing live location · GPS ±${Math.round(loc.accuracy ?? 0)} m · ${loc.sentAt?.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}`
              : loc.status === 'waiting'
                ? 'Getting GPS fix…'
                : loc.status === 'error'
                  ? loc.message
                  : onRoad
                    ? 'Customers see your location while you deliver'
                    : 'Nearby orders are offered to you first'}
        </span>
      </span>
    </button>
  );
}

/** Seconds left until `iso`, ticking every second. */
function useSecondsLeft(iso: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 1000));
}

/** One Google Maps route through every stop, in order. */
const tripUrl = (stops: string[]) => {
  const q = new URLSearchParams({ api: '1', destination: stops.at(-1) ?? '', travelmode: 'two-wheeler' });
  if (stops.length > 1) q.set('waypoints', stops.slice(0, -1).join('|'));
  return `https://www.google.com/maps/dir/?${q.toString()}`;
};

const distanceLabel = (d: number | null | undefined) => (d == null ? null :d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`);

function OrderSummary({ o }: { o: AvailableOrder }) {
  const distance = distanceLabel(o.distanceKm);
  return (
    <div className="min-w-0 flex-1">
      <p className="flex items-baseline justify-between gap-2">
        <span className="truncate font-mono text-sm font-bold">{o.orderNumber}</span>
        {distance && <span className="shrink-0 rounded-full bg-mint-100 px-2 py-0.5 text-xs font-extrabold text-forest-800">{distance} away</span>}
      </p>
      <p className="truncate text-sm text-charcoal-500">
        <MapPin className="mr-1 inline size-3.5" />
        {o.areaName} · {o.itemCount} item{o.itemCount === 1 ? '' : 's'} · {formatINR(o.total)}
        {o.paymentMethod === 'COD' ? ' · Cash' : ''}
      </p>
      {(o.deliverySlot || o.deliveryDate) && <p className="text-xs text-charcoal-400">{[o.deliveryDate, o.deliverySlot].filter(Boolean).join(' · ')}</p>}
      {o.fitsRoute && (
        <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-lime-300 px-2 py-0.5 text-[0.68rem] font-extrabold text-forest-900" data-testid="fits-route">
          <RouteIcon className="size-3" /> Fits your route · same slot, drop nearby
        </p>
      )}
      {o.pickup && (
        <p className="mt-1 truncate text-xs font-bold text-forest-700">
          Pick up at {o.pickup.shopName}{o.pickup.areaName ? ` (${o.pickup.areaName})` : ''} · {o.pickup.ready ? 'packed and ready' : 'being packed'}
        </p>
      )}
    </div>
  );
}

/** An order offered to this rider alone, with the time left before it passes to the next nearest. */
function OfferCard({ o, total, onDone }: { o: AvailableOrder; total: number; onDone: () => void }) {
  const left = useSecondsLeft(o.offer!.expiresAt);
  const accept = useMutation({ mutationFn: () => riderApi.claim(o.id), onSettled: onDone });
  const decline = useMutation({ mutationFn: () => riderApi.decline(o.id), onSettled: onDone });
  const expired = left === 0;
  useEffect(() => {
    if (expired) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expired]);
  const error = accept.error ?? decline.error;
  return (
    <article className="rounded-[1.5rem] bg-white p-4 shadow-soft ring-2 ring-lime-300" data-testid="rider-offer">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="rounded-full bg-lime-300 px-2.5 py-1 text-[0.68rem] font-extrabold uppercase text-forest-900">Offered to you</span>
        <span className="inline-flex items-center gap-1 font-mono text-sm font-extrabold tabular-nums text-forest-800" aria-live="polite">
          <Clock className="size-3.5" />
          {expired ? 'Passed on' : `${left}s`}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ivory-200" aria-hidden>
        <div className="h-full rounded-full bg-forest-700 transition-[width] duration-1000 ease-linear" style={{ width: `${total > 0 ? Math.min(100, (left / total) * 100) : 0}%` }} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <OrderSummary o={o} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="outline" className="text-tomato-500" icon={<Ban className="size-4" />} disabled={expired || accept.isPending} loading={decline.isPending} onClick={() => decline.mutate()}>
          Decline
        </Button>
        <Button icon={<CheckCircle2 className="size-4" />} disabled={expired || decline.isPending} loading={accept.isPending} onClick={() => accept.mutate()}>
          Accept
        </Button>
      </div>
      {error && <p className="mt-2 text-sm font-semibold text-tomato-500">{(error as Error).message}</p>}
    </article>
  );
}

function AvailableOrders({ online, loc }: { online: boolean; loc: ReturnType<typeof useLiveLocation> }) {
  const qc = useQueryClient();
  const { data, error } = useQuery({ queryKey: ['rider', 'available'], queryFn: riderApi.available, enabled: online, refetchInterval: online ? 10_000 : false });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['rider', 'available'] });
    void qc.invalidateQueries({ queryKey: ['rider', 'orders'] });
  };
  const claim = useMutation({ mutationFn: riderApi.claim, onSettled: refresh });
  if (!online) return null;
  const items: AvailableOrder[] = data?.items ?? [];
  const offers = items.filter((o) => o.offer);
  const open = items.filter((o) => !o.offer);
  return (
    <section className="mt-4 space-y-3" aria-labelledby="available-h">
      <h2 id="available-h" className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-charcoal-500">
        <PackageCheck className="size-4" /> Available to pick up
      </h2>
      {data && !data.locationKnown && loc.status !== 'live' && (
        <p className="rounded-2xl bg-turmeric-100 p-3 text-sm text-[#6b4500]">Turn on location to be offered orders near you first. You can still take open orders below.</p>
      )}
      {error && <p className="rounded-2xl bg-tomato-100 p-4 text-sm font-semibold text-tomato-500">{error instanceof ApiError ? error.message : 'Could not load orders'}</p>}
      {claim.error && <p className="rounded-2xl bg-tomato-100 p-4 text-sm font-semibold text-tomato-500">{(claim.error as Error).message}</p>}
      {offers.map((o) => (
        <OfferCard key={o.id} o={o} total={data?.offerSeconds ?? 45} onDone={refresh} />
      ))}
      {data && items.length === 0 && <p className="rounded-[1.5rem] bg-white p-6 text-center text-sm text-charcoal-500 shadow-soft">No orders waiting right now.</p>}
      {open.map((o) => (
        <article key={o.id} className="flex items-center gap-3 rounded-[1.5rem] bg-white p-4 shadow-soft">
          <OrderSummary o={o} />
          <Button size="sm" disabled={claim.isPending} onClick={() => claim.mutate(o.id)}>
            Take order
          </Button>
        </article>
      ))}
    </section>
  );
}

function Deliveries() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ['rider', 'me'], queryFn: riderApi.me });
  const { data, isLoading, error } = useQuery({ queryKey: ['rider', 'orders'], queryFn: riderApi.orders, refetchInterval: 15_000 });
  const [sheet, setSheet] = useState<{ order: Order; kind: 'otp' | 'fail' | 'reject' } | null>(null);
  const setOnline = useMutation({ mutationFn: riderApi.setOnline, onSuccess: () => qc.invalidateQueries({ queryKey: ['rider', 'me'] }) });
  const online = me.data?.isOnline ?? false;
  const onRoad = !!data?.some((o) => o.delivery.status === 'OUT_FOR_DELIVERY');
  // Shared while online: every 30 s for nearby offers, every 5 s on a trip for customer tracking.
  const loc = useLiveLocation(online, onRoad ? 5000 : 30_000);

  const current = data?.filter((o) => o.delivery.status === 'PICKED_UP' || o.delivery.status === 'OUT_FOR_DELIVERY') ?? [];
  const assigned = data?.filter((o) => o.delivery.status === 'ASSIGNED' || o.delivery.status === 'ACCEPTED') ?? [];
  /** Every stop of the trip in order (the API sorts orders by stop), for one Google Maps route. */
  const stops = (data ?? []).filter((o) => o.route).map((o) => o.route!);

  return (
    <>
      <div className="grain -mx-4 -mt-4 mb-4 bg-forest-900 px-4 pb-4 pt-1 text-ivory-50">
        <div className="relative z-10">
          <OnlineToggle online={online} onChange={(v) => setOnline.mutate(v)} pending={setOnline.isPending || me.isLoading} loc={loc} onRoad={onRoad} />
          {setOnline.error && <p className="mt-2 text-sm font-semibold text-tomato-100">{(setOnline.error as Error).message}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-wider text-charcoal-500">On the road</p>
          <p className="font-display text-3xl font-semibold">{current.length}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Assigned</p>
          <p className="font-display text-3xl font-semibold">{assigned.length}</p>
        </div>
      </div>
      {stops.length > 1 && (
        <div className="mt-3 flex items-center gap-3 rounded-[1.5rem] bg-forest-800 p-4 text-ivory-50" data-testid="trip-route">
          <RouteIcon className="size-6 shrink-0 text-lime-300" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-extrabold">{stops.length} orders on this trip</p>
            <p className="text-ivory-50/70">
              {stops.filter((x) => x.kind === 'PICKUP').length > 0 ? `Collect ${stops.filter((x) => x.kind === 'PICKUP').length}, then ` : ''}drop {stops.filter((x) => x.kind === 'DROP').length || stops.length}, nearest first.
            </p>
          </div>
          <Button size="sm" variant="lime" icon={<Navigation className="size-4" />} onClick={() => openExternal(tripUrl(stops.map((x) => x.navTo)))}>
            Navigate all
          </Button>
        </div>
      )}
      {isLoading && <div className="skeleton mt-3 h-48 rounded-[1.5rem]" />}
      {error && <p className="mt-3 rounded-2xl bg-tomato-100 p-4 text-sm font-semibold text-tomato-500">{error instanceof ApiError ? error.message : 'Could not load orders'}</p>}
      {current.length > 0 && (
        <section className="mt-4 space-y-3" aria-labelledby="current-h">
          <h2 id="current-h" className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-charcoal-500">
            <Bike className="size-4" /> Current delivery
          </h2>
          {current.map((o) => (
            <OrderCard key={o.id} order={o} onSheet={setSheet} />
          ))}
        </section>
      )}
      <AvailableOrders online={online} loc={loc} />
      <section className="mt-4 space-y-3" aria-labelledby="assigned-h">
        <h2 id="assigned-h" className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-charcoal-500">
          <Package className="size-4" /> Assigned to you
        </h2>
        {!isLoading && assigned.length === 0 && (
          <div className="rounded-[1.5rem] bg-white p-8 text-center shadow-soft">
            <Package className="mx-auto size-10 text-leaf-500" />
            <p className="mt-3 font-extrabold">No new assignments</p>
            <p className="text-sm text-charcoal-500">{online ? 'Take an order above, or wait for the store to assign one.' : 'Go online to see orders you can pick up.'}</p>
          </div>
        )}
        {assigned.map((o) => (
          <OrderCard key={o.id} order={o} onSheet={setSheet} />
        ))}
      </section>
      {sheet?.kind === 'otp' && <OtpSheet order={sheet.order} onClose={() => setSheet(null)} />}
      {(sheet?.kind === 'fail' || sheet?.kind === 'reject') && <ReasonSheet order={sheet.order} mode={sheet.kind} onClose={() => setSheet(null)} />}
    </>
  );
}

function HistoryTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ['rider', 'history', page], queryFn: () => riderApi.history(page) });
  return (
    <section className="space-y-3">
      <h1 className="font-display text-3xl font-semibold text-forest-900">History</h1>
      {isLoading && <div className="skeleton h-32 rounded-[1.5rem]" />}
      {data?.items.length === 0 && <p className="rounded-[1.5rem] bg-white p-8 text-center text-sm text-charcoal-500 shadow-soft">Completed deliveries will show here.</p>}
      <ul className="space-y-2">
        {data?.items.map((o) => (
          <li key={o.id} className="rounded-2xl bg-white p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-sm font-bold">{o.orderNumber}</p>
                <p className="truncate text-sm text-charcoal-500">
                  {o.customer.areaName} · {formatDate(o.delivery.deliveredAt ?? o.updatedAt)}
                </p>
              </div>
              <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-extrabold uppercase', o.delivery.status ? STEP_TONE[o.delivery.status] : '')}>
                {o.delivery.status ? DELIVERY_STATUS_LABELS[o.delivery.status] : ''}
              </span>
            </div>
            {o.delivery.status === 'FAILED' && o.delivery.failReason && <p className="mt-2 text-sm text-tomato-500">{o.delivery.failReason}</p>}
            {o.delivery.status === 'DELIVERED' && <p className="mt-2 text-sm font-bold text-leaf-600">Earned {formatINR(o.delivery.payout ?? 0)}</p>}
          </li>
        ))}
      </ul>
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Newer
          </Button>
          <span>
            {data.page} / {data.totalPages}
          </span>
          <Button size="sm" variant="ghost" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
            Older
          </Button>
        </div>
      )}
    </section>
  );
}

const shortDate = (ymd: string) => new Date(`${ymd}T00:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

function EarningsTab() {
  const { data, isLoading } = useQuery({ queryKey: ['rider', 'earnings'], queryFn: riderApi.earnings, refetchInterval: 60_000 });
  return (
    <section className="space-y-4">
      <h1 className="font-display text-3xl font-semibold text-forest-900">Earnings</h1>
      {isLoading && <div className="skeleton h-32 rounded-[1.5rem]" />}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-forest-800 p-4 text-ivory-50">
              <p className="text-xs font-bold uppercase tracking-wider text-lime-300">Today</p>
              <p className="font-display text-3xl font-semibold tabular-nums">{formatINR(data.today.amount)}</p>
              <p className="text-xs text-ivory-50/70">{data.today.deliveries} deliveries</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-soft">
              <p className="text-xs font-bold uppercase tracking-wider text-charcoal-500">This week</p>
              <p className="font-display text-3xl font-semibold tabular-nums">{formatINR(data.thisWeek.amount)}</p>
              <p className="text-xs text-charcoal-500">{data.thisWeek.deliveries} deliveries</p>
            </div>
          </div>
          <p className="rounded-2xl bg-ivory-200/60 p-3 text-sm text-charcoal-700">
            {data.payoutPerDelivery > 0 ? `Current rate: ${formatINR(data.payoutPerDelivery)} per delivery.` : 'The store has not set a per-delivery payout yet.'} Each delivery keeps the rate in force when it was completed.
          </p>
          <div className="rounded-[1.5rem] bg-white p-4 shadow-soft">
            <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wider text-charcoal-500">Daily</h2>
            {data.daily.length === 0 && <p className="text-sm text-charcoal-500">No deliveries in the last few weeks.</p>}
            <ul className="divide-y divide-line text-sm">
              {data.daily.map((d) => (
                <li key={d.date} className="flex justify-between py-2">
                  <span>{shortDate(d.date)}</span>
                  <span className="tabular-nums">
                    {d.deliveries} × · <strong>{formatINR(d.amount)}</strong>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[1.5rem] bg-white p-4 shadow-soft">
            <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wider text-charcoal-500">Weekly</h2>
            <ul className="divide-y divide-line text-sm">
              {data.weekly.map((w) => (
                <li key={w.weekStart} className="flex justify-between py-2">
                  <span>Week of {shortDate(w.weekStart)}</span>
                  <span className="tabular-nums">
                    {w.deliveries} × · <strong>{formatINR(w.amount)}</strong>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[1.5rem] bg-white p-4 shadow-soft">
            <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wider text-charcoal-500">Per delivery</h2>
            <ul className="divide-y divide-line text-sm">
              {data.deliveries.map((d) => (
                <li key={d.orderId} className="flex items-center justify-between gap-2 py-2">
                  <span className="min-w-0">
                    <span className="block font-mono font-bold">{d.orderNumber}</span>
                    <span className="block truncate text-xs text-charcoal-500">
                      {d.areaName} · {d.deliveredAt ? formatDate(d.deliveredAt) : ''}
                    </span>
                  </span>
                  <strong className="shrink-0 tabular-nums">{formatINR(d.payout)}</strong>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}

function NotificationsTab() {
  return (
    <section className="space-y-3">
      <h1 className="font-display text-3xl font-semibold text-forest-900">Notifications</h1>
      <NotificationList />
    </section>
  );
}

function ApprovalPending({ status }: { status: string | null | undefined }) {
  const rejected = status === 'REJECTED';
  return (
    <div className="rounded-[1.5rem] bg-white p-8 text-center shadow-soft">
      {rejected ? <Ban className="mx-auto size-10 text-tomato-500" /> : <Clock className="mx-auto size-10 text-turmeric-400" />}
      <p className="mt-3 font-display text-2xl font-semibold text-forest-900">{rejected ? 'Application not approved' : 'Waiting for approval'}</p>
      <p className="mt-1 text-sm text-charcoal-500">
        {rejected ? 'Fix the documents below, or contact the Brio Cart store if you think this is a mistake.' : 'Upload your documents below. You can receive orders once Brio Cart approves them.'}
      </p>
    </div>
  );
}

const TABS = [
  { to: '/rider', label: 'Deliveries', icon: Bike, end: true },
  { to: '/rider/history', label: 'History', icon: History },
  { to: '/rider/earnings', label: 'Earnings', icon: Wallet },
  { to: '/rider/cash', label: 'Cash', icon: Banknote },
  { to: '/rider/notifications', label: 'Alerts', icon: Bell },
  { to: '/rider/documents', label: 'Docs', icon: FileCheck },
];

/** Delivery-partner web app, built for phone-sized browsers. Route-guarded to riders in App.tsx. */
export default function RiderApp() {
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ['rider', 'me'], queryFn: riderApi.me });
  const isFetching = qc.isFetching({ queryKey: ['rider'] }) > 0;

  useEffect(() => {
    document.title = 'Brio Rider';
  }, []);

  const approved = me.data?.riderStatus === 'APPROVED';

  return (
    <div className="min-h-dvh bg-ivory-100 pb-24">
      <header className="safe-top grain sticky top-0 z-30 bg-forest-900 text-ivory-50">
        <div className="relative z-10 mx-auto flex max-w-lg items-center justify-between gap-2 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <BrioMark className="size-8 shrink-0" tone="ivory" />
            <div className="min-w-0 leading-tight">
              <p className="font-display text-lg font-semibold">Brio Rider</p>
              <p className="truncate text-xs text-ivory-50/60">{user?.name}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <NotificationBell tone="dark" />
            <button type="button" onClick={() => void refreshRider(qc)} className="grid size-10 place-items-center rounded-full hover:bg-white/10" aria-label="Refresh">
              <RefreshCw className={cn('size-5', isFetching && 'animate-spin')} />
            </button>
            <button type="button" onClick={() => logout.mutate()} className="grid size-10 place-items-center rounded-full hover:bg-white/10" aria-label="Sign out">
              <LogOut className="size-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-4">
        {approved && <NewBookingAlert online={me.data?.isOnline ?? false} />}
        {approved && <PushPrompt className="mb-4" text="Get new bookings on your phone with a ring, even when this app is closed or your screen is off." />}
        {me.isLoading ? (
          <div className="grid min-h-[40vh] place-items-center text-leaf-600">
            <Spinner className="size-8" />
          </div>
        ) : !approved ? (
          <>
            <ApprovalPending status={me.data?.riderStatus} />
            <VerificationPanel className="mt-4" />
          </>
        ) : (
          <Routes>
            <Route index element={<Deliveries />} />
            <Route path="history" element={<HistoryTab />} />
            <Route path="earnings" element={<EarningsTab />} />
            <Route path="cash" element={<CashTab />} />
            <Route path="notifications" element={<NotificationsTab />} />
            <Route path="documents" element={<section className="space-y-3"><h1 className="font-display text-3xl font-semibold text-forest-900">Documents</h1><VerificationPanel /></section>} />
            <Route path="*" element={<Navigate to="/rider" replace />} />
          </Routes>
        )}
      </main>

      {approved && (
        <nav aria-label="Rider navigation" className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-lg">
            {TABS.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => cn('flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[0.7rem] font-bold', isActive ? 'text-forest-800' : 'text-charcoal-400')}>
                <Icon className="size-[1.35rem]" /> {label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}