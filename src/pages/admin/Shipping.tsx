import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PackageCheck, Truck } from 'lucide-react';
import { formatINR, SHIPPING_STATUS_LABELS } from '@shared/core';
import { adminApi } from '@/api/admin';
import { Card, PageHeader } from '@/components/admin/kit';
import { StatusPill } from '@/components/checkout/OrderStatusTracker';
import { Button } from '@/components/ui/Button';
import type { Order } from '@/types';
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

/** One courier order and the next step for it. */
function CourierOrder({ o }: { o: Order }) {
  const qc = useQueryClient();
  const s = o.shipping!;
  const [quote, setQuote] = useState({ fee: '', eta: s.eta ?? '', courierName: s.courierName ?? '', note: s.note ?? '' });
  const [ship, setShip] = useState({ courierName: s.courierName ?? '', trackingNumber: '' });
  const done = () => void qc.invalidateQueries({ queryKey: ['admin', 'shipping'] });
  const setQ = useMutation({ mutationFn: () => adminApi.shippingQuote(o.id, { fee: Number(quote.fee), eta: quote.eta, courierName: quote.courierName || undefined, note: quote.note || undefined }), onSuccess: done });
  const doShip = useMutation({ mutationFn: () => adminApi.shippingShip(o.id, ship), onSuccess: done });
  const delivered = useMutation({ mutationFn: () => adminApi.shippingDelivered(o.id), onSuccess: done });
  const err = (setQ.error ?? doShip.error ?? delivered.error) as Error | null;
  const canQuote = (o.status === 'CONFIRMED' || o.status === 'PREPARING') && (s.status === 'AWAITING_QUOTE' || s.status === 'QUOTED');

  return (
    <Card className="space-y-3" data-testid="courier-order">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to={`/admin/orders/${o.id}`} className="font-mono font-bold text-forest-700 hover:underline">{o.orderNumber}</Link>
          <p className="text-xs text-charcoal-500">Placed {formatDate(o.createdAt)} · {o.shop?.name ?? 'Brio Cart'}{o.shop?.readyAt ? ' · packed' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
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
          <label className="text-xs font-bold">Shipping (₹)<input type="number" min="0" step="1" required value={quote.fee} onChange={(e) => setQuote({ ...quote, fee: e.target.value })} className={input} placeholder={s.status === 'QUOTED' ? String(o.deliveryFee / 100) : ''} /></label>
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

      {s.status === 'QUOTED' && (o.status === 'CONFIRMED' || o.status === 'PREPARING') && (
        <form
          className="grid gap-2 rounded-2xl border border-line p-3 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            doShip.mutate();
          }}
        >
          <label className="text-xs font-bold">Courier<input required value={ship.courierName} maxLength={60} onChange={(e) => setShip({ ...ship, courierName: e.target.value })} className={input} placeholder="Delhivery, India Post…" /></label>
          <label className="text-xs font-bold">Tracking number<input required value={ship.trackingNumber} maxLength={60} onChange={(e) => setShip({ ...ship, trackingNumber: e.target.value })} className={input} /></label>
          <Button type="submit" size="sm" className="self-end" icon={<Truck className="size-4" />} loading={doShip.isPending}>Mark shipped</Button>
        </form>
      )}

      {s.status === 'SHIPPED' && (
        <Button size="sm" icon={<PackageCheck className="size-4" />} loading={delivered.isPending} onClick={() => window.confirm(`Mark ${o.orderNumber} delivered? Cash on delivery is recorded as collected.`) && delivered.mutate()}>
          Mark delivered
        </Button>
      )}
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
        {data?.map((o) => <CourierOrder key={o.id} o={o} />)}
        {data && data.length === 0 && <p className="rounded-3xl bg-white p-8 text-center text-charcoal-500">No courier orders here.</p>}
      </div>
    </>
  );
}
