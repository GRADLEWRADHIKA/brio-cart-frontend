import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bike, CheckCircle2, KeyRound, PackageCheck, Phone, XCircle } from 'lucide-react';
import { DELIVERY_STATUS_LABELS, formatINR } from '@shared/core';
import { shopApi, type ShopOrder } from '@/api/shop';
import { Card, PageHeader } from '@/components/admin/kit';
import { OrderStatusTracker, StatusPill } from '@/components/checkout/OrderStatusTracker';
import { Button } from '@/components/ui/Button';
import { ProductImage } from '@/components/ui/misc';
import { eventLabel, formatDate } from '@/utils';
import { ShippingCard } from '@/components/checkout/ShippingCard';

/** What the shop should do next, in one sentence. */
function nextStep(o: ShopOrder) {
  if (o.status === 'PENDING') return 'Check you have everything, then accept or reject this order.';
  if (o.shipping && o.status === 'PREPARING' && o.readyAt) return 'Packed. Brio Cart books the courier and adds the tracking number.';
  if (o.shipping && (o.status === 'CONFIRMED' || o.status === 'PREPARING')) return 'This order goes by courier. Pack it and mark it ready; Brio Cart sets shipping and books the courier.';
  if (o.shipping && o.status === 'OUT_FOR_DELIVERY') return 'Shipped with the courier. Brio Cart marks it delivered.';
  if (o.status === 'CONFIRMED') return 'Start preparing, or mark the order ready once it is packed.';
  if (o.status === 'PREPARING' && !o.readyAt) return 'Pack the order, then mark it ready for pickup.';
  if (o.status === 'PREPARING') return o.rider ? `${o.rider.name} is coming to collect it. Give them the pickup code.` : 'Waiting for a rider to take it. Give the pickup code to the rider who collects it.';
  if (o.status === 'OUT_FOR_DELIVERY') return 'The rider has collected it and is on the way to the customer.';
  if (o.status === 'DELIVERED') return 'Delivered. This order counts towards your earnings.';
  return 'This order was cancelled.';
}

export default function SellerOrderDetail() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const { data: o, isLoading, error } = useQuery({ queryKey: ['seller', 'order', id], queryFn: () => shopApi.order(id), refetchInterval: 20_000 });
  const onDone = (order: ShopOrder) => {
    qc.setQueryData(['seller', 'order', id], order);
    void qc.invalidateQueries({ queryKey: ['seller', 'orders'] });
    void qc.invalidateQueries({ queryKey: ['seller', 'summary'] });
    setRejecting(false);
  };
  const accept = useMutation({ mutationFn: () => shopApi.accept(id), onSuccess: onDone });
  const reject = useMutation({ mutationFn: () => shopApi.reject(id, reason), onSuccess: onDone });
  const preparing = useMutation({ mutationFn: () => shopApi.preparing(id), onSuccess: onDone });
  const ready = useMutation({ mutationFn: () => shopApi.ready(id), onSuccess: onDone });
  const newPickup = useMutation({ mutationFn: () => shopApi.newPickupCode(id), onSuccess: onDone });
  const newDelivery = useMutation({ mutationFn: () => shopApi.newDeliveryCode(id), onSuccess: onDone });
  const actionError = [accept, reject, preparing, ready, newPickup, newDelivery].find((m) => m.error)?.error as Error | undefined;

  if (isLoading) return <div className="skeleton h-80 rounded-3xl" />;
  if (error || !o) return <p className="text-tomato-500">{(error as Error)?.message ?? 'Not found'}</p>;
  const hidden = o.status === 'PENDING';

  return (
    <>
      <Link to="/seller/orders" className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-forest-700"><ArrowLeft className="size-4" /> Orders</Link>
      <PageHeader title={o.orderNumber} subtitle={`Placed ${formatDate(o.createdAt)}`} actions={<StatusPill status={o.status} />} />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card title="What to do">
            <p className="text-sm text-charcoal-700">{nextStep(o)}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {o.status === 'PENDING' && (
                <>
                  <Button icon={<CheckCircle2 className="size-4" />} loading={accept.isPending} onClick={() => accept.mutate()}>Accept order</Button>
                  <Button variant="outline" className="text-tomato-500" icon={<XCircle className="size-4" />} onClick={() => setRejecting(true)}>Reject</Button>
                </>
              )}
              {o.status === 'CONFIRMED' && (
                <>
                  <Button variant="secondary" loading={preparing.isPending} onClick={() => preparing.mutate()}>Start preparing</Button>
                  <Button icon={<PackageCheck className="size-4" />} loading={ready.isPending} onClick={() => ready.mutate()}>Packed: ready for pickup</Button>
                  <Button variant="outline" className="text-tomato-500" onClick={() => setRejecting(true)}>Reject</Button>
                </>
              )}
              {o.status === 'PREPARING' && !o.readyAt && (
                <Button icon={<PackageCheck className="size-4" />} loading={ready.isPending} onClick={() => ready.mutate()}>Packed: ready for pickup</Button>
              )}
            </div>
            {rejecting && (
              <div className="mt-4 rounded-2xl bg-tomato-100/60 p-4">
                <label className="text-sm font-bold" htmlFor="reject-reason">Why can’t you fulfil it? The customer sees this.</label>
                <input
                  id="reject-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={200}
                  placeholder="e.g. Paneer sold out today"
                  className="mt-2 h-11 w-full rounded-2xl border border-line bg-white px-4 text-sm"
                />
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" className="text-tomato-500" loading={reject.isPending} disabled={reason.trim().length < 3} onClick={() => reject.mutate()}>Reject order</Button>
                  <Button variant="ghost" onClick={() => setRejecting(false)}>Keep it</Button>
                </div>
              </div>
            )}
            {actionError && <p className="mt-3 text-sm font-semibold text-tomato-500" role="alert">{actionError.message}</p>}
          </Card>

          <ShippingCard order={o} />
          {o.pickupCode && (
            <section className="rounded-3xl bg-forest-800 p-6 text-ivory-50" aria-label="Pickup code">
              <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-lime-300"><KeyRound className="size-4" /> Pickup code</p>
              <p className="mt-2 font-mono text-5xl font-bold tracking-[0.3em]" data-testid="pickup-code">{o.pickupCode}</p>
              <p className="mt-2 text-sm text-ivory-50/75">Hand the bag over only to the rider who types this code. Never share it on the phone.</p>
              {o.pickupCodeLocked && <p className="mt-2 text-sm font-bold text-turmeric-400">Too many wrong tries: issue a new code.</p>}
              <Button size="sm" variant="secondary" className="mt-3" loading={newPickup.isPending} onClick={() => newPickup.mutate()}>Issue a new pickup code</Button>
            </section>
          )}

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
              <div className="flex justify-between"><dt>Item sales</dt><dd className="tabular-nums">{formatINR(o.earnings.itemsTotal)}</dd></div>
              <div className="flex justify-between text-charcoal-500"><dt>Brio Cart commission ({o.earnings.commissionPercent}%)</dt><dd className="tabular-nums">−{formatINR(o.earnings.commission)}</dd></div>
              <div className="flex justify-between text-base font-extrabold"><dt>Your earnings</dt><dd className="tabular-nums">{formatINR(o.earnings.net)}</dd></div>
            </dl>
            <p className="mt-2 text-xs text-charcoal-500">Delivery fees and coupon discounts are Brio Cart’s and don’t change your earnings. Earnings count once the order is delivered.</p>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Customer">
            <p className="font-bold">{o.customer.name}</p>
            {hidden ? (
              <p className="mt-1 text-sm text-charcoal-500">{o.customer.areaName}. The phone number and address appear when you accept.</p>
            ) : (
              <>
                <p className="text-sm">+91 {o.customer.phone}</p>
                <p className="mt-2 text-sm text-charcoal-700">
                  {o.customer.house}, {o.customer.street}{o.customer.landmark && `, ${o.customer.landmark}`}<br />{o.customer.areaName}
                </p>
                {o.status !== 'CANCELLED' && o.status !== 'DELIVERED' && (
                  <a href={`tel:+91${o.customer.phone}`} className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-mint-100 px-4 text-sm font-bold text-forest-800"><Phone className="size-4" /> Call</a>
                )}
              </>
            )}
            {o.customer.instructions && <p className="mt-2 rounded-xl bg-ivory-100 p-2 text-sm">“{o.customer.instructions}”</p>}
            <p className="mt-2 text-sm"><span className="font-bold">Slot:</span> {o.deliverySlot ?? '—'}</p>
            <p className="text-sm"><span className="font-bold">Payment:</span> {o.paymentMethodLabel}</p>
          </Card>
          <Card title="Rider">
            {o.rider ? (
              <>
                <p className="flex items-center gap-2 font-bold"><Bike className="size-4" /> {o.rider.name}</p>
                {o.rider.vehicleNumber && <p className="text-sm text-charcoal-500">{o.rider.vehicleNumber}</p>}
                {o.delivery.status && <p className="mt-2 inline-block rounded-full bg-mint-100 px-2.5 py-0.5 text-xs font-extrabold uppercase text-forest-800">{DELIVERY_STATUS_LABELS[o.delivery.status]}</p>}
              </>
            ) : (
              <p className="text-sm text-charcoal-500">{o.status === 'PENDING' ? 'Riders see the order once you accept it.' : 'No rider yet. Online riders can take it from their available orders.'}</p>
            )}
            {o.status === 'OUT_FOR_DELIVERY' && (o.delivery.otpLocked || !o.delivery.otpExpiresAt) && (
              <div className="mt-3 rounded-xl bg-ivory-100 p-2 text-xs text-charcoal-700">
                {o.delivery.otpLocked ? 'The rider is locked out after wrong delivery codes.' : 'The delivery code has expired.'}
                <Button size="sm" variant="outline" className="mt-2 w-full" loading={newDelivery.isPending} onClick={() => newDelivery.mutate()}>Issue a new delivery code</Button>
              </div>
            )}
          </Card>
          <Card title="Timeline">
            <OrderStatusTracker order={o} />
            <ul className="mt-4 space-y-1 border-t border-line pt-3 text-xs text-charcoal-500">
              {o.events.map((e, i) => (
                <li key={i}>{formatDate(e.at)} · {eventLabel(e.status)}{e.note ? ` — ${e.note}` : ''}</li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
