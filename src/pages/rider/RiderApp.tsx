import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Bell, Bike, CheckCircle2, ChevronDown, Clock, History, KeyRound, LogOut, MapPin, Navigation, Package, PackageCheck, Phone, Power, Radio, RefreshCw, TriangleAlert, Wallet, X } from 'lucide-react';
import { DELIVERY_OTP_LENGTH, DELIVERY_STATUS_LABELS, formatINR, ORDER_STATUS_LABELS } from '@shared/core';
import { riderApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import type { Order } from '@/types';
import { BrioMark } from '@/components/ui/Brand';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/misc';
import { NotificationBell, NotificationList } from '@/components/notifications/Notifications';
import { cn, formatDate, openExternal } from '@/utils';

/** Shares the rider's GPS (browser geolocation) while enabled; the server applies it to orders they are delivering. */
function useLiveLocation(enabled: boolean) {
  const [state, setState] = useState<{ status: 'off' | 'waiting' | 'live' | 'error'; accuracy?: number; sentAt?: Date; message?: string }>({ status: 'off' });
  const last = useRef(0);
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
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - last.current < 5000) return; // throttle uploads
        last.current = now;
        riderApi
          .location(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy)
          .then(() => setState({ status: 'live', accuracy: pos.coords.accuracy, sentAt: new Date() }))
          .catch((e) => setState({ status: 'error', message: (e as Error).message }));
      },
      (err) => setState({ status: 'error', message: err.code === err.PERMISSION_DENIED ? 'Location permission denied. Allow location access to share live tracking.' : err.message }),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
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
  const [collected, setCollected] = useState(false);
  const deliver = useMutation({
    mutationFn: () => riderApi.deliver(order.id, otp, collected),
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
      {collect && (
        <label className="mt-5 flex items-center gap-3 rounded-2xl bg-turmeric-100 p-3 text-sm font-bold">
          <input type="checkbox" checked={collected} onChange={(e) => setCollected(e.target.checked)} className="size-5 accent-forest-700" />
          Collected {formatINR(order.total)} ({order.paymentMethod === 'COD' ? 'cash' : 'UPI'})
        </label>
      )}
      {deliver.error && <p className="mt-3 text-center text-sm font-semibold text-tomato-500">{(deliver.error as Error).message}</p>}
      <Button size="lg" block className="mt-5" disabled={otp.length !== DELIVERY_OTP_LENGTH || (collect && !collected)} loading={deliver.isPending} onClick={() => deliver.mutate()}>
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
  const pickup = useMutation({ mutationFn: () => riderApi.pickup(order.id), onSuccess: onDone });
  const start = useMutation({ mutationFn: () => riderApi.start(order.id), onSuccess: onDone });
  const address = [order.customer.house, order.customer.street, order.customer.landmark, order.customer.areaName, 'Lucknow'].filter(Boolean).join(', ');
  const toCollect = order.paymentStatus === 'UNPAID' && order.paymentMethod !== 'ONLINE';
  const step = order.delivery.status;
  const error = accept.error ?? pickup.error ?? start.error;
  const waitingForStore = step === 'ACCEPTED' && order.status === 'PENDING';

  return (
    <article className={cn('rounded-[1.5rem] bg-white p-4 shadow-soft', step === 'OUT_FOR_DELIVERY' && 'ring-2 ring-lime-300', step === 'ASSIGNED' && 'ring-2 ring-turmeric-400')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
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
        {step === 'ACCEPTED' && (
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
            ? 'Go online to receive deliveries'
            : loc.status === 'live'
              ? `Sharing live location · GPS ±${Math.round(loc.accuracy ?? 0)} m · ${loc.sentAt?.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}`
              : loc.status === 'waiting'
                ? 'Getting GPS fix…'
                : loc.status === 'error'
                  ? loc.message
                  : onRoad
                    ? 'Location is shared while you deliver'
                    : 'Customers see your location only while you deliver'}
        </span>
      </span>
    </button>
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
  // Reuses the live-tracking GPS upload: only while online and on a trip.
  const loc = useLiveLocation(online && onRoad);

  const current = data?.filter((o) => o.delivery.status === 'PICKED_UP' || o.delivery.status === 'OUT_FOR_DELIVERY') ?? [];
  const assigned = data?.filter((o) => o.delivery.status === 'ASSIGNED' || o.delivery.status === 'ACCEPTED') ?? [];

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
      <section className="mt-4 space-y-3" aria-labelledby="assigned-h">
        <h2 id="assigned-h" className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-charcoal-500">
          <Package className="size-4" /> Assigned to you
        </h2>
        {!isLoading && assigned.length === 0 && (
          <div className="rounded-[1.5rem] bg-white p-8 text-center shadow-soft">
            <Package className="mx-auto size-10 text-leaf-500" />
            <p className="mt-3 font-extrabold">No new assignments</p>
            <p className="text-sm text-charcoal-500">{online ? 'New orders appear here automatically.' : 'Go online so the store can assign you orders.'}</p>
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
        {rejected ? 'Please contact the Brio Cart store if you think this is a mistake.' : 'The store will review your details. You can receive orders once you’re approved.'}
      </p>
    </div>
  );
}

const TABS = [
  { to: '/rider', label: 'Deliveries', icon: Bike, end: true },
  { to: '/rider/history', label: 'History', icon: History },
  { to: '/rider/earnings', label: 'Earnings', icon: Wallet },
  { to: '/rider/notifications', label: 'Alerts', icon: Bell },
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
        {me.isLoading ? (
          <div className="grid min-h-[40vh] place-items-center text-leaf-600">
            <Spinner className="size-8" />
          </div>
        ) : !approved ? (
          <ApprovalPending status={me.data?.riderStatus} />
        ) : (
          <Routes>
            <Route index element={<Deliveries />} />
            <Route path="history" element={<HistoryTab />} />
            <Route path="earnings" element={<EarningsTab />} />
            <Route path="notifications" element={<NotificationsTab />} />
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
