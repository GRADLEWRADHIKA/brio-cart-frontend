import { useEffect, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, MapPin, PackageSearch, Phone, Wallet } from 'lucide-react';
import { buildWhatsAppUrl, composeWhatsAppOrderMessage, formatINR } from '@shared/core';
import { orderApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import { useGuestOrders } from '@/store/guest-orders';
import { useContact } from '@/hooks/useStoreInfo';
import { OrderStatusTracker, StatusPill } from '@/components/checkout/OrderStatusTracker';
import { LiveTracking } from '@/components/checkout/LiveTracking';
import { RateOrder } from '@/components/checkout/RateOrder';
import { OrderExtras } from '@/components/account/OrderExtras';
import { useReorder } from '@/hooks/useReorder';
import { EditDeliveryAddress } from '@/components/checkout/EditDeliveryAddress';
import { CreditCard, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState, ProductImage } from '@/components/ui/misc';
import { WhatsAppIcon } from '@/components/ui/Brand';
import { formatDate, openExternal } from '@/utils';

function Confetti() {
  // A light shower of leaves for the moment the order is confirmed by the server.
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 18 }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className="absolute size-4 motion-safe:animate-[leaf-fall_3.2s_ease-in_forwards] motion-reduce:hidden"
          style={{ left: `${(i * 53) % 100}%`, top: '-8%', animationDelay: `${(i % 6) * 0.18}s`, color: ['#c8e86b', '#3d9a62', '#f4b52c', '#ffffff'][i % 4] }}
        >
          <path d="M2 18C2 8 8 2 18 2C18 12 12 18 2 18Z" fill="currentColor" />
        </svg>
      ))}
      <style>{`@keyframes leaf-fall{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(420px) rotate(320deg);opacity:0}}`}</style>
    </div>
  );
}

export default function OrderPage() {
  const { orderNumber = '' } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const justPlaced = (location.state as { justPlaced?: boolean } | null)?.justPlaced;
  const deviceKey = useGuestOrders((s) => s.keyFor(orderNumber));
  const key = params.get('key') ?? deviceKey;
  const { whatsapp, phoneDisplay } = useContact();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', orderNumber, key],
    queryFn: () => orderApi.get(orderNumber, key ?? undefined),
    // Fast polling while the rider is on the road, gentle polling otherwise.
    refetchInterval: (q) => {
      const st = q.state.data?.status;
      if (!st || st === 'DELIVERED' || st === 'CANCELLED') return st ? false : 30_000;
      return st === 'OUT_FOR_DELIVERY' ? 4_000 : 15_000;
    },
  });
  const navigate = useNavigate();
  const reorder = useReorder();
  const cancel = useMutation({
    mutationFn: () => orderApi.cancel(orderNumber, key ?? undefined),
    onSuccess: (o) => qc.setQueryData(['order', orderNumber, key], o),
  });

  useEffect(() => {
    document.title = `Order ${orderNumber} — Brio Cart`;
  }, [orderNumber]);

  if (isLoading) {
    return (
      <div className="container-page max-w-4xl space-y-4 py-12" aria-busy>
        <div className="skeleton h-40 rounded-[2rem]" />
        <div className="skeleton h-72 rounded-[2rem]" />
      </div>
    );
  }
  if (error || !order) {
    const auth = error instanceof ApiError && (error.status === 401 || error.status === 404);
    return (
      <EmptyState
        className="min-h-[50vh] justify-center"
        icon={<PackageSearch className="size-10" strokeWidth={1.5} />}
        title={auth ? 'We couldn’t open this order' : 'Something went wrong'}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <ButtonLink to="/login">Sign in</ButtonLink>
            <ButtonLink to="/track" variant="outline">
              Track an order
            </ButtonLink>
          </div>
        }
      >
        {auth ? 'Sign in to the account that placed it, or open the link from the device you ordered on.' : (error as Error)?.message}
      </EmptyState>
    );
  }

  const share = () =>
    openExternal(
      buildWhatsAppUrl(
        whatsapp,
        composeWhatsAppOrderMessage({
          orderNumber: order.orderNumber,
          customerName: order.customer.name,
          area: order.customer.areaName,
          deliverySlot: order.deliverySlot ?? undefined,
          paymentMethod: order.paymentMethodLabel,
          lines: order.items.map((i) => ({ name: i.productName, variantLabel: i.variantLabel, quantity: i.quantity, unitPrice: i.unitPrice })),
          subtotal: order.subtotal,
          deliveryFee: order.deliveryFee,
          discount: order.discount,
          total: order.total,
        }),
      ),
    );

  return (
    <div className="container-page max-w-5xl py-8 sm:py-12">
      <section className="grain relative overflow-hidden rounded-[2rem] bg-forest-900 p-6 text-ivory-50 sm:p-10">
        {justPlaced && <Confetti />}
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
          <div>
            {justPlaced ? (
              <>
                <span className="grid size-14 place-items-center rounded-full bg-lime-300 text-forest-900">
                  <Check className="size-7" strokeWidth={3} />
                </span>
                <h1 className="mt-5 font-display text-4xl font-medium sm:text-5xl">Order placed, thank you!</h1>
                <p className="mt-2 max-w-lg text-ivory-50/70">
                  Your order has been received by Brio Cart. We’ll confirm it shortly and deliver {order.deliverySlot ? `tomorrow, ${order.deliverySlot.replace(/^Morning,\s*/, '')}` : 'soon'}.
                </p>
              </>
            ) : (
              <>
                <p className="eyebrow text-lime-300">Order details</p>
                <h1 className="mt-2 font-display text-4xl font-medium sm:text-5xl">Order {order.orderNumber}</h1>
                <p className="mt-2 text-ivory-50/70">Placed {formatDate(order.createdAt)}</p>
              </>
            )}
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-wider text-ivory-50/60">Order number</p>
            <p className="mt-1 flex items-center gap-2 font-mono text-xl font-bold tracking-wider" data-testid="order-number">
              {order.orderNumber}
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(order.orderNumber);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="grid size-8 place-items-center rounded-full hover:bg-white/10"
                aria-label="Copy order number"
              >
                {copied ? <Check className="size-4 text-lime-300" /> : <Copy className="size-4" />}
              </button>
            </p>
            <div className="mt-2">
              <StatusPill status={order.status} />
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          {order.paymentMethod === 'ONLINE' && order.paymentStatus === 'UNPAID' && order.status !== 'CANCELLED' && (
            <div className="flex flex-wrap items-center gap-4 rounded-[1.75rem] border-2 border-dashed border-turmeric-400 bg-turmeric-100 p-5">
              <CreditCard className="size-7 text-[#7a4f00]" />
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-forest-900">Payment pending</p>
                <p className="text-sm text-charcoal-700">Complete payment to confirm your order.</p>
              </div>
              <Button onClick={() => navigate(`/pay/${order.orderNumber}${key ? `?key=${encodeURIComponent(key)}` : ''}`)}>Pay {formatINR(order.total)}</Button>
            </div>
          )}
          <LiveTracking order={order} />
          <RateOrder order={order} accessKey={key ?? undefined} queryKey={['order', orderNumber, key]} />
          <OrderExtras order={order} accessKey={key} />
          <section className="rounded-[1.75rem] border border-line bg-white p-5 sm:p-7" aria-labelledby="items-h">
            <h2 id="items-h" className="font-display text-2xl font-semibold text-forest-900">
              Items ({order.items.length})
            </h2>
            <ul className="mt-4 divide-y divide-line">
              {order.items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-3">
                  <ProductImage src={i.imageUrl} alt="" className="size-14 shrink-0 rounded-xl bg-ivory-100 p-1" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{i.productName}</span>
                    <span className="text-sm text-charcoal-500">
                      {i.variantLabel} · {i.quantity} × {formatINR(i.unitPrice)}
                    </span>
                  </span>
                  <span className="font-bold tabular-nums">{formatINR(i.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-dashed border-line pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-charcoal-500">Subtotal</dt><dd className="font-bold tabular-nums">{formatINR(order.subtotal)}</dd></div>
              {order.discount > 0 && <div className="flex justify-between text-leaf-600"><dt>Discount</dt><dd className="font-bold">−{formatINR(order.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-charcoal-500">Delivery</dt><dd className="font-bold tabular-nums">{order.deliveryFee ? formatINR(order.deliveryFee) : 'FREE'}</dd></div>
              <div className="flex items-baseline justify-between pt-2"><dt className="font-bold">Total</dt><dd className="text-2xl font-extrabold tabular-nums">{formatINR(order.total)}</dd></div>
            </dl>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.75rem] border border-line bg-white p-5">
              <h2 className="flex items-center gap-2 font-sans text-sm font-extrabold uppercase tracking-wider text-charcoal-500"><MapPin className="size-4" /> Delivering to</h2>
              <p className="mt-3 font-bold">{order.customer.name}</p>
              <p className="text-sm text-charcoal-700">
                {order.customer.house}, {order.customer.street}
                {order.customer.landmark && `, ${order.customer.landmark}`}
                <br />
                {order.customer.areaName}, Lucknow
              </p>
              <p className="mt-1 text-sm text-charcoal-500">+91 {order.customer.phone}</p>
              {order.customer.instructions && <p className="mt-2 rounded-xl bg-ivory-100 p-2 text-sm">“{order.customer.instructions}”</p>}
              {!['DELIVERED', 'CANCELLED'].includes(order.status) && (
                <EditDeliveryAddress order={order} accessKey={key ?? undefined} onSaved={(o) => qc.setQueryData(['order', orderNumber, key], o)} />
              )}
            </div>
            <div className="rounded-[1.75rem] border border-line bg-white p-5">
              <h2 className="flex items-center gap-2 font-sans text-sm font-extrabold uppercase tracking-wider text-charcoal-500"><Wallet className="size-4" /> Payment</h2>
              <p className="mt-3 font-bold">{order.paymentMethodLabel}</p>
              <p className="text-sm text-charcoal-700">{order.paymentStatus === 'PAID' ? 'Paid' : order.paymentStatus === 'DEMO_PAID' ? 'Paid (demo payment — no money charged)' : order.paymentMethod === 'ONLINE' ? 'Awaiting online payment' : `Pay ${formatINR(order.total)} on delivery`}</p>
              {order.deliverySlot && (
                <>
                  <h3 className="mt-4 text-sm font-extrabold uppercase tracking-wider text-charcoal-500">Slot</h3>
                  <p className="font-bold">{order.deliverySlot}</p>
                </>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-[1.75rem] border border-line bg-white p-5 sm:p-6" aria-labelledby="track-h">
            <h2 id="track-h" className="mb-5 font-display text-2xl font-semibold text-forest-900">Order status</h2>
            <OrderStatusTracker order={order} />
            <p className="mt-5 text-xs text-charcoal-500">Status updates come from our team as your order progresses. This page refreshes automatically.</p>
          </section>
          <section className="rounded-[1.75rem] bg-[#f3fbf5] p-5">
            <p className="text-sm font-bold text-forest-900">Questions about this order?</p>
            <Button variant="whatsapp" block className="mt-3" icon={<WhatsAppIcon className="size-5" />} onClick={share}>
              Share order on WhatsApp
            </Button>
            <a href={`tel:+91${whatsapp.replace(/\D/g, '').slice(-10)}`} className="mt-3 flex items-center justify-center gap-2 text-sm font-bold text-forest-700">
              <Phone className="size-4" /> {phoneDisplay}
            </a>
          </section>
          {order.canCancel && (
            <Button
              variant="ghost"
              block
              loading={cancel.isPending}
              onClick={() => window.confirm('Cancel this order?') && cancel.mutate()}
              className="text-tomato-500 hover:bg-tomato-100"
            >
              Cancel order
            </Button>
          )}
          {cancel.error && <p className="text-center text-sm font-semibold text-tomato-500">{(cancel.error as Error).message}</p>}
          {(order.status === 'DELIVERED' || order.status === 'CANCELLED') && (
            <Button block icon={<RotateCcw className="size-4" />} loading={reorder.isPending} onClick={() => reorder.mutate(order)}>
              Order again
            </Button>
          )}
          <ButtonLink to="/shop" variant="outline" block>
            Continue shopping
          </ButtonLink>
          <p className="text-center text-xs text-charcoal-500">
            <Link to="/track" className="underline">All orders on this device</Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
