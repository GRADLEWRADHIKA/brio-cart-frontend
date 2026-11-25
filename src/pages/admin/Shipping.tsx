import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, MapPin, PackageCheck, Rocket, Truck } from 'lucide-react';
import { formatINR, SHIPPING_STATUS_LABELS } from '@shared/core';
import { adminApi, type CourierRate, type ShippingOrder } from '@/api/admin';
import { Card, PageHeader } from '@/components/admin/kit';
import { StatusPill } from '@/components/checkout/OrderStatusTracker';
import { Button } from '@/components/ui/Button';
import { cn, formatDate } from '@/utils';

const TABS = [
  { key: undefined, label: 'All' },
  { key: 'AWAITING_QUOTE', label: 'Set shipping' },
  { key: 'QUOTED', label: 'To ship' },
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'DELIVERED', label: 'Delivered' },
] as const;

const input = 'h-10 w-full rounded-2xl border border-line bg-white px-3 text-sm';
const today = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);

/** Shiprocket couriers for the order's PIN code; picking one fills the shipping cost and courier. */
function ShiprocketRates({ orderId, onPick, picked }: { orderId: string; onPick: (r: CourierRate) => void; picked: number | null }) {
  const [weight, setWeight] = useState('1');
  const rates = useMutation({ mutationFn: () => adminApi.shippingRates(orderId, Number(weight) || 1) });
  return (
    <div className="rounded-2xl border border-line p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-bold">Weight (kg)<input type="number" min="0.05" max="100" step="0.05" value={weight} onChange={(e) => setWeight(e.target.value)} className={cn(input, 'w-28')} /></label>
        <Button size="sm" variant="secondary" icon={<Rocket className="size-4" />} loading={rates.isPending} disabled={!(Number(weight) > 0)} onClick={() => rates.mutate()}>
          Get Shiprocket rates
        </Button>
      </div>
      {rates.error && <p className="mt-2 text-sm font-semibold text-tomato-500" role="alert">{(rates.error as Error).message}</p>}
      {rates.data && rates.data.length === 0 && <p className="mt-2 text-sm text-charcoal-500">No courier serves this PIN code for that weight.</p>}
      {rates.data && rates.data.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {rates.data.map((r) => (
            <li key={r.courierId}>
              <button
                type="button"
                onClick={() => onPick(r)}
                className={cn('flex w-full flex-wrap items-center gap-x-3 gap-y-0.5 rounded-xl border px-3 py-2 text-left text-sm transition', picked === r.courierId ? 'border-forest-800 bg-mint-100' : 'border-line bg-white hover:border-forest-800/40')}
              >
                <span className="font-bold">{r.courierName}</span>
                {r.recommended && <span className="rounded-full bg-lime-300 px-2 py-0.5 text-[0.7rem] font-extrabold uppercase text-forest-900">Recommended</span>}
                <span className="ml-auto font-bold tabular-nums">{formatINR(r.fee)}</span>
                <span className="w-full text-xs text-charcoal-500">
                  {r.etd ? `Delivery by ${r.etd}` : ''}
                  {r.etd && r.days != null ? ' · ' : ''}
                  {r.days != null ? `${r.days} day${r.days === 1 ? '' : 's'}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {rates.data && rates.data.length > 0 && <p className="mt-2 text-xs text-charcoal-500">Click a courier to use its rate and name in the shipping form above.</p>}
    </div>
  );
}

/** The courier's own tracking for an order booked with Shiprocket. */
function ShiprocketTracking({ orderId }: { orderId: string }) {
  const { data, isLoading, error } = useQuery({ queryKey: ['admin', 'shipping', 'tracking', orderId], queryFn: () => adminApi.shippingTracking(orderId) });
  if (isLoading) return <div className="skeleton h-20 rounded-2xl" />;
  if (error) return <p className="text-sm font-semibold text-tomato-500">{(error as Error).message}</p>;
  if (!data) return <p className="rounded-xl bg-ivory-100 p-3 text-sm text-charcoal-700">No tracking from the courier yet.</p>;
  return (
    <div className="rounded-2xl border border-line p-3 text-sm">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-bold">{data.status ?? 'In transit'}</span>
        {data.etd && <span className="text-charcoal-500">Expected {data.etd}</span>}
        {data.url && (
          <a href={data.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 font-bold text-forest-700 hover:underline">
            Courier tracking page <ExternalLink className="size-3.5" />
          </a>
        )}
      </p>
      {data.steps.length > 0 ? (
        <ol className="mt-3 space-y-2 border-l-2 border-line pl-4">
          {data.steps.map((st, i) => (
            <li key={i}>
              <p className="font-semibold">{st.status}</p>
              <p className="text-xs text-charcoal-500">
                {st.at}
                {st.location && <> · <MapPin className="inline size-3" /> {st.location}</>}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 text-charcoal-500">No scans yet.</p>
      )}
    </div>
  );
}

/** One courier order and the next step for it. */
function CourierOrder({ o, shiprocket }: { o: ShippingOrder; shiprocket: boolean }) {
  const qc = useQueryClient();
  const s = o.shipping!;
  const [quote, setQuote] = useState({ fee: '', eta: s.eta ?? '', courierName: s.courierName ?? '', note: s.note ?? '' });
  const [ship, setShip] = useState({ courierName: s.courierName ?? '', trackingNumber: '' });
  /** Courier picked from the Shiprocket rates: booked with that one instead of Shiprocket's recommendation. */
  const [picked, setPicked] = useState<{ courierId: number; courierName: string } | null>(null);
  const [box, setBox] = useState({ weightKg: '1', lengthCm: '20', breadthCm: '15', heightCm: '10' });
  const [tracking, setTracking] = useState(false);
  const done = () => void qc.invalidateQueries({ queryKey: ['admin', 'shipping'] });
  const setQ = useMutation({ mutationFn: () => adminApi.shippingQuote(o.id, { fee: Number(quote.fee), eta: quote.eta, courierName: quote.courierName || undefined, note: quote.note || undefined }), onSuccess: done });
  const doShip = useMutation({ mutationFn: () => adminApi.shippingShip(o.id, ship), onSuccess: done });
  const book = useMutation({
    mutationFn: () =>
      adminApi.shippingShiprocket(o.id, {
        weightKg: Number(box.weightKg),
        lengthCm: Number(box.lengthCm),
        breadthCm: Number(box.breadthCm),
        heightCm: Number(box.heightCm),
        courierId: picked?.courierId,
      }),
    onSuccess: done,
  });
  const delivered = useMutation({ mutationFn: () => adminApi.shippingDelivered(o.id), onSuccess: done });
  const err = (setQ.error ?? doShip.error ?? book.error ?? delivered.error) as Error | null;
  const canQuote = (o.status === 'CONFIRMED' || o.status === 'PREPARING') && (s.status === 'AWAITING_QUOTE' || s.status === 'QUOTED');
  const canShip = s.status === 'QUOTED' && (o.status === 'CONFIRMED' || o.status === 'PREPARING');
  const boxOk = Number(box.weightKg) >= 0.05 && [box.lengthCm, box.breadthCm, box.heightCm].every((v) => Number(v) >= 1);

  const pickRate = (r: CourierRate) => {
    setQuote({ ...quote, fee: String(r.fee / 100), courierName: r.courierName });
    setPicked({ courierId: r.courierId, courierName: r.courierName });
  };

  return (
    <Card className="space-y-3" data-testid="courier-order">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to={`/admin/orders/${o.id}`} className="font-mono font-bold text-forest-700 hover:underline">{o.orderNumber}</Link>
          <p className="text-xs text-charcoal-500">Placed {formatDate(o.createdAt)} · {o.shop?.name ?? 'Brio Cart'}{o.shop?.readyAt ? ' · packed' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {o.shiprocket && <span className="rounded-full bg-mint-100 px-2.5 py-0.5 text-xs font-extrabold text-forest-800">Shiprocket</span>}
          <span className="rounded-full bg-ivory-200 px-2.5 py-0.5 text-xs font-extrabold">{SHIPPING_STATUS_LABELS[s.status ?? ''] ?? s.status}</span>
          <StatusPill status={o.status} />
        </div>
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <p>
          <span className="font-bold">{o.customer.name}</span> · +91 {o.customer.phone}
          <br />
          {o.customer.house}, {o.customer.street}
          {o.customer.landmark ? `, ${o.customer.landmark}` : ''}
          <br />
          {s.city}, {s.stateName} {s.pincode}
        </p>
        <p>
          {o.items.map((i) => `${i.productName} (${i.variantLabel}) ×${i.quantity}`).join(', ')}
          <br />
          Items {formatINR(o.subtotal)}{o.discount ? ` − ${formatINR(o.discount)}` : ''}
        </p>
        <p>
          Shipping {s.status === 'AWAITING_QUOTE' ? 'not set' : formatINR(o.deliveryFee)}
          <br />
          <span className="font-bold">Total {formatINR(o.total)}</span> · {o.paymentMethodLabel}
          {s.eta && <><br />Expected by {s.eta}</>}
          {s.trackingNumber && <><br />{s.courierName} · {s.trackingNumber}</>}
        </p>
      </div>

      {o.status === 'PENDING' && <p className="rounded-xl bg-ivory-100 p-3 text-sm text-charcoal-700">Waiting for the shop to confirm. You set shipping once it does.</p>}

      {canQuote && (
        <form
          className="grid gap-2 rounded-2xl bg-ivory-100 p-3 sm:grid-cols-[8rem_10rem_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            setQ.mutate();
          }}
        >
          <label className="text-xs font-bold">Shipping (₹)<input type="number" min="0" step="0.01" required value={quote.fee} onChange={(e) => setQuote({ ...quote, fee: e.target.value })} className={input} placeholder={s.status === 'QUOTED' ? String(o.deliveryFee / 100) : ''} /></label>
          <label className="text-xs font-bold">Delivery by<input type="date" required min={today()} value={quote.eta} onChange={(e) => setQuote({ ...quote, eta: e.target.value })} className={input} /></label>
          <label className="text-xs font-bold">Courier and note (optional)
            <span className="flex gap-2">
              <input value={quote.courierName} maxLength={60} onChange={(e) => setQuote({ ...quote, courierName: e.target.value })} placeholder="Courier" className={input} />
              <input value={quote.note} maxLength={300} onChange={(e) => setQuote({ ...quote, note: e.target.value })} placeholder="Note to customer" className={input} />
            </span>
          </label>
          <Button type="submit" size="sm" className="self-end" loading={setQ.isPending} disabled={quote.fee === '' || !quote.eta}>{s.status === 'QUOTED' ? 'Update' : 'Set shipping'}</Button>
        </form>
      )}
      {canQuote && shiprocket && <ShiprocketRates orderId={o.id} onPick={pickRate} picked={picked?.courierId ?? null} />}

      {canShip && (
        <div className={cn('grid gap-3', shiprocket && 'lg:grid-cols-2')}>
          {shiprocket && (
            <form
              className="grid gap-2 rounded-2xl border border-line p-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (window.confirm(`Book ${o.orderNumber} with Shiprocket${picked ? ` (${picked.courierName})` : ''}? This assigns the courier, requests pickup and marks the order shipped.`)) book.mutate();
              }}
            >
              <p className="text-sm font-extrabold">Book with Shiprocket</p>
              <div className="grid grid-cols-4 gap-2">
                <label className="text-xs font-bold">Weight (kg)<input type="number" required min="0.05" max="100" step="0.05" value={box.weightKg} onChange={(e) => setBox({ ...box, weightKg: e.target.value })} className={input} /></label>
                <label className="text-xs font-bold">L (cm)<input type="number" required min="1" max="300" step="1" value={box.lengthCm} onChange={(e) => setBox({ ...box, lengthCm: e.target.value })} className={input} /></label>
                <label className="text-xs font-bold">B (cm)<input type="number" required min="1" max="300" step="1" value={box.breadthCm} onChange={(e) => setBox({ ...box, breadthCm: e.target.value })} className={input} /></label>
                <label className="text-xs font-bold">H (cm)<input type="number" required min="1" max="300" step="1" value={box.heightCm} onChange={(e) => setBox({ ...box, heightCm: e.target.value })} className={input} /></label>
              </div>
              <p className="text-xs text-charcoal-500">
                Courier: {picked ? <><span className="font-bold">{picked.courierName}</span> <button type="button" className="font-bold text-forest-700 underline" onClick={() => setPicked(null)}>use recommended</button></> : 'Shiprocket’s recommended (or pick one from the rates above)'}
              </p>
              <Button type="submit" size="sm" icon={<Rocket className="size-4" />} loading={book.isPending} disabled={!boxOk}>Book with Shiprocket</Button>
            </form>
          )}
          <form
            className="grid gap-2 rounded-2xl border border-line p-3 sm:grid-cols-[1fr_1fr_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              doShip.mutate();
            }}
          >
            {shiprocket && <p className="text-sm font-extrabold sm:col-span-3">Or booked yourself</p>}
            <label className="text-xs font-bold">Courier<input required value={ship.courierName} maxLength={60} onChange={(e) => setShip({ ...ship, courierName: e.target.value })} className={input} placeholder="Delhivery, India Post…" /></label>
            <label className="text-xs font-bold">Tracking number<input required value={ship.trackingNumber} maxLength={60} onChange={(e) => setShip({ ...ship, trackingNumber: e.target.value })} className={input} /></label>
            <Button type="submit" size="sm" className="self-end" icon={<Truck className="size-4" />} loading={doShip.isPending}>Mark shipped</Button>
          </form>
        </div>
      )}

      {s.status === 'SHIPPED' && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" icon={<PackageCheck className="size-4" />} loading={delivered.isPending} onClick={() => window.confirm(`Mark ${o.orderNumber} delivered? Cash on delivery is recorded as collected.`) && delivered.mutate()}>
            Mark delivered
          </Button>
          {o.shiprocket && shiprocket && (
            <Button size="sm" variant="secondary" icon={<MapPin className="size-4" />} aria-expanded={tracking} onClick={() => setTracking(!tracking)}>
              {tracking ? 'Hide tracking' : 'Track'}
            </Button>
          )}
        </div>
      )}
      {s.status === 'SHIPPED' && tracking && o.shiprocket && shiprocket && <ShiprocketTracking orderId={o.id} />}
      {err && <p className="text-sm font-semibold text-tomato-500" role="alert">{err.message}</p>}
    </Card>
  );
}

/** Super admin: orders going outside the city by courier. */
export default function Shipping() {
  const [status, setStatus] = useState<string | undefined>('AWAITING_QUOTE');
  const { data, isLoading, error } = useQuery({ queryKey: ['admin', 'shipping', status], queryFn: () => adminApi.shippingOrders(status), refetchInterval: 60_000 });
  return (
    <>
      <PageHeader title="Courier orders" subtitle="Orders outside the city. After the shop confirms, set the shipping cost and date (added to the order, paid on delivery), then book the courier and add the tracking number." />
      {data && !data.shiprocket && (
        <p className="mb-4 rounded-2xl border border-dashed border-line bg-ivory-50 p-3 text-sm text-charcoal-700">
          Shiprocket isn’t set up, so rates and booking are entered by hand. Add SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD to the server .env to get courier rates and book from here.
        </p>
      )}
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.label} type="button" onClick={() => setStatus(t.key)} className={cn('shrink-0 rounded-full px-4 py-2 text-sm font-bold', status === t.key ? 'bg-forest-800 text-ivory-50' : 'border border-line bg-white')}>
            {t.label}
          </button>
        ))}
      </div>
      {error && <p className="mb-4 text-sm font-semibold text-tomato-500">{(error as Error).message}</p>}
      {isLoading && <div className="skeleton h-40 rounded-3xl" />}
      <div className="space-y-4">
        {data?.items.map((o) => <CourierOrder key={o.id} o={o} shiprocket={data.shiprocket} />)}
        {data && data.items.length === 0 && <p className="rounded-3xl bg-white p-8 text-center text-charcoal-500">No courier orders here.</p>}
      </div>
    </>
  );
}
