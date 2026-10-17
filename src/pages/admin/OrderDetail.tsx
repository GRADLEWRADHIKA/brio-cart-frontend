import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bike, Phone, Sparkles, Star } from 'lucide-react';
import { LiveTracking } from '@/components/checkout/LiveTracking';
import { buildWhatsAppUrl, formatINR, ORDER_STATUS_LABELS, ORDER_TRANSITIONS, type OrderStatus } from '@shared/core';
import { adminApi } from '@/api/admin';
import { Card, PageHeader } from '@/components/admin/kit';
import { OrderStatusTracker, StatusPill } from '@/components/checkout/OrderStatusTracker';
import { Button } from '@/components/ui/Button';
import { ProductImage } from '@/components/ui/misc';
import { WhatsAppIcon } from '@/components/ui/Brand';
import { formatDate, openExternal } from '@/utils';

export default function OrderDetail() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const { data: o, isLoading, error } = useQuery({ queryKey: ['admin', 'order', id], queryFn: () => adminApi.order(id) });
  const onDone = (order: Awaited<ReturnType<typeof adminApi.order>>) => {
    qc.setQueryData(['admin', 'order', id], order);
    void qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
    void qc.invalidateQueries({ queryKey: ['admin', 'summary'] });
    setNote('');
  };
  const status = useMutation({ mutationFn: (s: OrderStatus) => adminApi.setStatus(id, s, note || undefined), onSuccess: onDone });
  const payment = useMutation({ mutationFn: (p: 'PAID' | 'UNPAID') => adminApi.setPayment(id, p), onSuccess: onDone });
  const riders = useQuery({ queryKey: ['admin', 'riders'], queryFn: adminApi.riders });
  const settings = useQuery({ queryKey: ['admin', 'settings'], queryFn: adminApi.settings });
  const assign = useMutation({ mutationFn: (riderId: string | null) => adminApi.assignRider(id, riderId), onSuccess: onDone });
  const demoTrip = useMutation({ mutationFn: () => adminApi.demoTrip(id), onSuccess: onDone });

  if (isLoading) return <div className="skeleton h-80 rounded-3xl" />;
  if (error || !o) return <p className="text-tomato-500">{(error as Error)?.message ?? 'Not found'}</p>;
  const next = ORDER_TRANSITIONS[o.status];

  return (
    <>
      <Link to="/admin/orders" className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-forest-700"><ArrowLeft className="size-4" /> Orders</Link>
      <PageHeader title={o.orderNumber} subtitle={`Placed ${formatDate(o.createdAt)}`} actions={<StatusPill status={o.status} />} />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          {(o.status === 'OUT_FOR_DELIVERY' || o.status === 'PREPARING' || o.status === 'CONFIRMED') && <LiveTracking order={o} />}
          <Card title="Update status">
            {next.length === 0 ? (
              <p className="text-sm text-charcoal-500">This order is {ORDER_STATUS_LABELS[o.status].toLowerCase()} — no further changes.</p>
            ) : (
              <>
                <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Optional note shown to the customer (e.g. reason for cancellation)" className="mb-3 h-11 w-full rounded-2xl border border-line px-4 text-sm" aria-label="Status note" />
                <div className="flex flex-wrap gap-2">
                  {next.map((s) => (
                    <Button
                      key={s}
                      variant={s === 'CANCELLED' ? 'outline' : 'primary'}
                      className={s === 'CANCELLED' ? 'text-tomato-500' : undefined}
                      loading={status.isPending && status.variables === s}
                      onClick={() => (s !== 'CANCELLED' || window.confirm('Cancel this order? Tracked stock will be restored.')) && status.mutate(s)}
                    >
                      Mark as {ORDER_STATUS_LABELS[s]}
                    </Button>
                  ))}
                </div>
              </>
            )}
            {status.error && <p className="mt-2 text-sm font-semibold text-tomato-500">{(status.error as Error).message}</p>}
          </Card>

          <Card title={`Items (${o.items.length})`}>
            <ul className="divide-y divide-line">
              {o.items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-3">
                  <ProductImage src={i.imageUrl} alt="" className="size-12 shrink-0 rounded-xl bg-ivory-100" />
                  <span className="flex-1">
                    <span className="block font-bold">{i.productName}</span>
                    <span className="text-sm text-charcoal-500">{i.variantLabel} · {i.quantity} × {formatINR(i.unitPrice)}</span>
                  </span>
                  <span className="font-bold tabular-nums">{formatINR(i.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatINR(o.subtotal)}</dd></div>
              {o.discount > 0 && (
                <div className="flex justify-between text-leaf-600">
                  <dt>Discount{o.couponCode ? ` (${o.couponCode})` : ''}</dt>
                  <dd className="tabular-nums">−{formatINR(o.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between"><dt>Delivery</dt><dd className="tabular-nums">{o.deliveryFee ? formatINR(o.deliveryFee) : 'Free'}</dd></div>
              <div className="flex justify-between text-base font-extrabold"><dt>Total</dt><dd className="tabular-nums">{formatINR(o.total)}</dd></div>
            </dl>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Customer">
            <p className="font-bold">{o.customer.name}</p>
            <p className="text-sm">+91 {o.customer.phone}</p>
            <p className="mt-2 text-sm text-charcoal-700">
              {o.customer.house}, {o.customer.street}{o.customer.landmark && `, ${o.customer.landmark}`}<br />{o.customer.areaName}
            </p>
            {o.customer.instructions && <p className="mt-2 rounded-xl bg-ivory-100 p-2 text-sm">“{o.customer.instructions}”</p>}
            <p className="mt-2 text-sm"><span className="font-bold">Slot:</span> {o.deliverySlot ?? '—'}</p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="whatsapp" icon={<WhatsAppIcon className="size-4" />} onClick={() => openExternal(buildWhatsAppUrl(o.customer.phone, `Namaste ${o.customer.name}, this is Brio Cart about your order ${o.orderNumber}.`))}>
                WhatsApp
              </Button>
              <a href={`tel:+91${o.customer.phone}`} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-mint-100 px-4 text-sm font-bold text-forest-800"><Phone className="size-4" /> Call</a>
            </div>
          </Card>
          <Card title="Delivery partner">
            {['DELIVERED', 'CANCELLED'].includes(o.status) ? (
              <p className="flex items-center gap-2 text-sm"><Bike className="size-4" /> {o.rider?.name ?? 'No rider recorded'}</p>
            ) : (
              <>
                <select
                  value={o.rider?.id ?? ''}
                  onChange={(e) => assign.mutate(e.target.value || null)}
                  className="h-11 w-full rounded-2xl border border-line bg-white px-3 text-sm font-bold"
                  aria-label="Assign delivery partner"
                >
                  <option value="">Unassigned</option>
                  {riders.data?.filter((r) => r.isActive).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} · {r.activeOrders} active
                    </option>
                  ))}
                </select>
                {riders.data?.length === 0 && <p className="mt-2 text-xs text-charcoal-500">Add riders under Delivery partners.</p>}
                {assign.error && <p className="mt-2 text-sm font-semibold text-tomato-500">{(assign.error as Error).message}</p>}
                {settings.data?.demoMode && (
                  <Button size="sm" variant="secondary" className="mt-3 w-full" icon={<Sparkles className="size-4" />} loading={demoTrip.isPending} onClick={() => demoTrip.mutate()}>
                    Run demo delivery
                  </Button>
                )}
                {demoTrip.error && <p className="mt-2 text-sm font-semibold text-tomato-500">{(demoTrip.error as Error).message}</p>}
              </>
            )}
          </Card>
          {o.rating && (
            <Card title="Customer rating">
              <p className="flex items-center gap-0.5 text-turmeric-400" aria-label={`${o.rating.stars} of 5 stars`}>
                {Array.from({ length: 5 }, (_, i) => <Star key={i} className={i < o.rating!.stars ? 'size-5 fill-current' : 'size-5 text-ivory-300'} />)}
              </p>
              {o.rating.comment && <p className="mt-2 text-sm">“{o.rating.comment}”</p>}
            </Card>
          )}
          <Card title="Payment">
            <p className="font-bold">{o.paymentMethodLabel}</p>
            {o.paymentStatus === 'DEMO_PAID' ? (
              <p className="mt-1 rounded-xl bg-turmeric-100 p-2 text-xs font-bold text-[#6b4500]">Demo payment — no money was received. Collect payment before delivery for real orders.</p>
            ) : (
              <>
                <p className="text-sm text-charcoal-500">Status: {o.paymentStatus}</p>
                <Button size="sm" variant="secondary" className="mt-3" loading={payment.isPending} onClick={() => payment.mutate(o.paymentStatus === 'PAID' ? 'UNPAID' : 'PAID')}>
                  Mark as {o.paymentStatus === 'PAID' ? 'unpaid' : 'paid'}
                </Button>
              </>
            )}
          </Card>
          <Card title="Timeline">
            <OrderStatusTracker order={o} />
            <ul className="mt-4 space-y-1 border-t border-line pt-3 text-xs text-charcoal-500">
              {o.events.map((e, i) => (
                <li key={i}>{formatDate(e.at)} · {ORDER_STATUS_LABELS[e.status]}{e.note ? ` — ${e.note}` : ''}</li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
