import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bike, CheckCircle2, ChevronDown, KeyRound, LogOut, MapPin, Navigation, Package, Phone, Radio, RefreshCw, X } from 'lucide-react';
import { formatINR, ORDER_STATUS_LABELS } from '@shared/core';
import { riderApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import type { Order } from '@/types';
import { BrioMark } from '@/components/ui/Brand';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/misc';
import { cn, openExternal } from '@/utils';

/** Shares the rider's GPS while enabled; the server applies it to orders they are delivering. */
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

function OtpSheet({ order, onClose }: { order: Order; onClose: () => void }) {
  const qc = useQueryClient();
  const [otp, setOtp] = useState('');
  const collect = order.paymentStatus === 'UNPAID' && order.paymentMethod !== 'ONLINE';
  const [collected, setCollected] = useState(false);
  const deliver = useMutation({
    mutationFn: () => riderApi.deliver(order.id, otp, collected),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rider', 'orders'] });
      onClose();
    },
  });
  const press = (d: string) => setOtp((o) => (o.length < 4 ? o + d : o));
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label="Confirm delivery">
      <div className="safe-bottom w-full rounded-t-[2rem] bg-white p-6 sm:max-w-sm sm:rounded-[2rem]">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-forest-900">Delivery code</h2>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full hover:bg-ivory-100" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-1 text-sm text-charcoal-500">Ask {order.customer.name.split(' ')[0]} for the 4-digit code shown in their order.</p>
        <div className="mt-5 flex justify-center gap-3" aria-live="polite">
          {Array.from({ length: 4 }, (_, i) => (
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
        <Button size="lg" block className="mt-5" disabled={otp.length !== 4 || (collect && !collected)} loading={deliver.isPending} onClick={() => deliver.mutate()}>
          Confirm delivery
        </Button>
      </div>
    </div>
  );
}

function OrderCard({ order, onDeliver }: { order: Order; onDeliver: () => void }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const pickup = useMutation({ mutationFn: () => riderApi.pickup(order.id), onSuccess: () => qc.invalidateQueries({ queryKey: ['rider', 'orders'] }) });
  const address = [order.customer.house, order.customer.street, order.customer.landmark, order.customer.areaName, 'Lucknow'].filter(Boolean).join(', ');
  const toCollect = order.paymentStatus === 'UNPAID' && order.paymentMethod !== 'ONLINE';
  const onRoad = order.status === 'OUT_FOR_DELIVERY';
  const done = order.status === 'DELIVERED';

  return (
    <article className={cn('rounded-[1.5rem] bg-white p-4 shadow-soft', onRoad && 'ring-2 ring-lime-300', done && 'opacity-70')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-sm font-bold text-charcoal-500">{order.orderNumber}</p>
          <p className="truncate text-lg font-extrabold">{order.customer.name}</p>
        </div>
        <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-extrabold uppercase', onRoad ? 'bg-lime-300 text-forest-900' : done ? 'bg-forest-800 text-ivory-50' : 'bg-turmeric-100 text-[#6b4500]')}>
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>
      <p className="mt-2 flex gap-2 text-sm text-charcoal-700">
        <MapPin className="mt-0.5 size-4 shrink-0 text-tomato-500" /> {address}
      </p>
      {order.customer.instructions && <p className="mt-2 rounded-xl bg-ivory-100 p-2 text-sm">“{order.customer.instructions}”</p>}
      <div className="mt-3 flex items-center justify-between rounded-2xl bg-ivory-100 px-3 py-2 text-sm">
        <span>{order.deliverySlot ?? 'Today'}</span>
        <span className={cn('font-extrabold', toCollect ? 'text-tomato-500' : 'text-leaf-600')}>
          {toCollect ? `Collect ${formatINR(order.total)}` : order.paymentStatus === 'DEMO_PAID' ? 'Prepaid (demo)' : 'Prepaid'}
        </span>
      </div>
      <button type="button" onClick={() => setOpen((o) => !o)} className="mt-2 flex w-full items-center justify-between py-1 text-sm font-bold text-charcoal-500" aria-expanded={open}>
        {order.items.reduce((n, i) => n + i.quantity, 0)} items <ChevronDown className={cn('size-4 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <ul className="mb-2 space-y-1 text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between">
              <span>
                {i.productName} · {i.variantLabel}
              </span>
              <span className="font-bold">×{i.quantity}</span>
            </li>
          ))}
        </ul>
      )}
      {!done && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button variant="outline" icon={<Navigation className="size-4" />} onClick={() => openExternal(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=two-wheeler`)}>
            Navigate
          </Button>
          <a href={`tel:+91${order.customer.phone}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-mint-100 font-bold text-forest-800">
            <Phone className="size-4" /> Call
          </a>
          {onRoad ? (
            <Button className="col-span-2" size="lg" icon={<KeyRound className="size-5" />} onClick={onDeliver}>
              Deliver with code
            </Button>
          ) : (
            <Button className="col-span-2" size="lg" variant="lime" icon={<Bike className="size-5" />} loading={pickup.isPending} onClick={() => pickup.mutate()}>
              Picked up · start trip
            </Button>
          )}
        </div>
      )}
      {pickup.error && <p className="mt-2 text-sm font-semibold text-tomato-500">{(pickup.error as Error).message}</p>}
    </article>
  );
}

export default function RiderApp() {
  const { user, loading, logout } = useAuth();
  const [sharing, setSharing] = useState(() => {
    try {
      return localStorage.getItem('brio.rider.sharing') === '1';
    } catch {
      return false;
    }
  });
  const [delivering, setDelivering] = useState<Order | null>(null);
  const loc = useLiveLocation(sharing && !!user);
  const { data, isLoading, error, refetch, isFetching } = useQuery({ queryKey: ['rider', 'orders'], queryFn: riderApi.orders, enabled: !!user, refetchInterval: 15_000 });

  useEffect(() => {
    document.title = 'Brio Rider';
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('brio.rider.sharing', sharing ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [sharing]);

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-forest-900 text-lime-300">
        <Spinner className="size-8" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login?next=/rider" replace />;
  if (user.role !== 'RIDER' && user.role !== 'ADMIN') {
    return <div className="grid min-h-dvh place-items-center p-8 text-center">This screen is for Brio Cart delivery partners only.</div>;
  }

  const active = data?.filter((o) => o.status !== 'DELIVERED') ?? [];
  const delivered = data?.filter((o) => o.status === 'DELIVERED') ?? [];
  const onRoad = active.some((o) => o.status === 'OUT_FOR_DELIVERY');

  return (
    <div className="min-h-dvh bg-ivory-100 pb-10">
      <header className="safe-top grain sticky top-0 z-30 bg-forest-900 text-ivory-50">
        <div className="relative z-10 mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <BrioMark className="size-8" tone="ivory" />
            <div className="leading-tight">
              <p className="font-display text-lg font-semibold">Brio Rider</p>
              <p className="text-xs text-ivory-50/60">{user.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => refetch()} className="grid size-10 place-items-center rounded-full hover:bg-white/10" aria-label="Refresh">
              <RefreshCw className={cn('size-5', isFetching && 'animate-spin')} />
            </button>
            <button type="button" onClick={() => logout.mutate()} className="grid size-10 place-items-center rounded-full hover:bg-white/10" aria-label="Sign out">
              <LogOut className="size-5" />
            </button>
          </div>
        </div>
        <div className="relative z-10 mx-auto max-w-lg px-4 pb-4">
          <button
            type="button"
            role="switch"
            aria-checked={sharing}
            onClick={() => setSharing((s) => !s)}
            className={cn('flex w-full items-center gap-3 rounded-2xl p-3 text-left transition', sharing ? 'bg-lime-300 text-forest-900' : 'bg-white/10')}
          >
            <span className={cn('relative grid size-10 place-items-center rounded-full', sharing ? 'bg-forest-900 text-lime-300' : 'bg-white/10')}>
              <Radio className="size-5" />
              {loc.status === 'live' && <span className="absolute inset-0 animate-ping rounded-full bg-forest-900/30" />}
            </span>
            <span className="flex-1">
              <span className="block font-extrabold">{sharing ? 'Sharing live location' : 'Live location off'}</span>
              <span className="text-xs opacity-75">
                {loc.status === 'live'
                  ? `GPS ±${Math.round(loc.accuracy ?? 0)} m · sent ${loc.sentAt?.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}`
                  : loc.status === 'waiting'
                    ? 'Getting GPS fix…'
                    : loc.status === 'error'
                      ? loc.message
                      : onRoad
                        ? 'Turn on so customers can track you'
                        : 'Customers see your location only while delivering'}
              </span>
            </span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-3 px-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4 shadow-soft">
            <p className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Active</p>
            <p className="font-display text-3xl font-semibold">{active.length}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-soft">
            <p className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Delivered today</p>
            <p className="font-display text-3xl font-semibold">{delivered.length}</p>
          </div>
        </div>
        {isLoading && <div className="skeleton h-48 rounded-[1.5rem]" />}
        {error && <p className="rounded-2xl bg-tomato-100 p-4 text-sm font-semibold text-tomato-500">{error instanceof ApiError ? error.message : 'Could not load orders'}</p>}
        {!isLoading && active.length === 0 && (
          <div className="rounded-[1.5rem] bg-white p-8 text-center shadow-soft">
            <Package className="mx-auto size-10 text-leaf-500" />
            <p className="mt-3 font-extrabold">No deliveries assigned</p>
            <p className="text-sm text-charcoal-500">New orders appear here automatically.</p>
          </div>
        )}
        {active.map((o) => (
          <OrderCard key={o.id} order={o} onDeliver={() => setDelivering(o)} />
        ))}
        {delivered.length > 0 && (
          <>
            <p className="flex items-center gap-2 pt-3 text-sm font-extrabold text-charcoal-500">
              <CheckCircle2 className="size-4 text-leaf-500" /> Delivered today
            </p>
            {delivered.map((o) => (
              <OrderCard key={o.id} order={o} onDeliver={() => undefined} />
            ))}
          </>
        )}
      </main>
      {delivering && <OtpSheet order={delivering} onClose={() => setDelivering(null)} />}
    </div>
  );
}
