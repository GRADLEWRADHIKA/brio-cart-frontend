import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, MapPin, Truck } from 'lucide-react';
import { formatINR, SHIPPING_STATUS_LABELS } from '@shared/core';
import { orderApi } from '@/api/endpoints';
import type { Order } from '@/types';
import { cn } from '@/utils';

/** The courier's own scans (Shiprocket), for orders booked through it. Customer pages only. */
function CourierTracking({ order, accessKey }: { order: Order; accessKey?: string }) {
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: ['courier-tracking', order.orderNumber], queryFn: () => orderApi.courierTracking(order.orderNumber, accessKey), enabled: open, staleTime: 5 * 60_000 });
  return (
    <div className="mt-3">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="btn-outline h-9 px-4 text-sm">
        <MapPin className="size-4" /> {open ? 'Hide tracking' : 'Track shipment'}
      </button>
      {open && (
        <div className="mt-3 rounded-2xl bg-ivory-100 p-3 text-sm">
          {q.isLoading ? (
            <p className="text-charcoal-500">Checking with the courier…</p>
          ) : !q.data ? (
            <p className="text-charcoal-700">Live tracking isn’t available for this shipment. Use the tracking number on the courier’s website.</p>
          ) : (
            <>
              {q.data.status && <p className="font-bold text-charcoal-900">{q.data.status}{q.data.etd ? ` · expected ${q.data.etd.slice(0, 10)}` : ''}</p>}
              <ol className="mt-2 space-y-2 border-l-2 border-mint-200 pl-3">
                {q.data.steps.slice(0, 12).map((s, i) => (
                  <li key={i}>
                    <span className="block font-semibold text-charcoal-900">{s.status}</span>
                    <span className="text-xs text-charcoal-500">{s.at}{s.location ? ` · ${s.location}` : ''}</span>
                  </li>
                ))}
              </ol>
              {q.data.url && (
                <a href={q.data.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-bold text-forest-700 underline underline-offset-2">
                  Open courier tracking <ExternalLink className="size-3.5" />
                </a>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Courier delivery outside the city: where it goes, the shipping cost and date once set, and tracking. */
export function ShippingCard({ order, className, accessKey, tracking }: { order: Order; className?: string; accessKey?: string; /** Show the courier's live tracking (customer pages). */ tracking?: boolean }) {
  const s = order.shipping;
  if (!s) return null;
  const quoted = s.status && s.status !== 'AWAITING_QUOTE';
  return (
    <section className={cn('rounded-[1.75rem] border border-line bg-white p-5', className)} aria-label="Courier delivery" data-testid="shipping-card">
      <h2 className="flex items-center gap-2 font-sans text-base font-extrabold text-forest-900">
        <Truck className="size-5 text-leaf-600" aria-hidden /> Courier delivery
      </h2>
      <p className="mt-1 text-sm text-charcoal-700">
        To {s.city}, {s.stateName} {s.pincode} · <span className="font-bold">{SHIPPING_STATUS_LABELS[s.status ?? ''] ?? s.status}</span>
      </p>
      {!quoted ? (
        <p className="mt-3 rounded-2xl bg-ivory-100 p-3 text-sm text-charcoal-700">
          {order.status === 'PENDING' ? 'The shop will confirm your order first.' : 'Your order is confirmed. We’ll notify you shortly with the shipping cost, delivery date and other details.'}
        </p>
      ) : (
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-charcoal-500">Shipping</dt><dd className="font-bold tabular-nums">{formatINR(order.deliveryFee)}</dd></div>
          {s.eta && <div><dt className="text-charcoal-500">Expected by</dt><dd className="font-bold">{s.eta}</dd></div>}
          {s.courierName && <div><dt className="text-charcoal-500">Courier</dt><dd className="font-bold">{s.courierName}</dd></div>}
          {s.trackingNumber && <div><dt className="text-charcoal-500">Tracking number</dt><dd className="font-mono font-bold">{s.trackingNumber}</dd></div>}
          <div className="sm:col-span-2"><dt className="text-charcoal-500">{order.paymentStatus === 'PAID' ? 'Total (paid)' : 'Total to pay on delivery'}</dt><dd className="text-lg font-extrabold tabular-nums">{formatINR(order.total)}</dd></div>
        </dl>
      )}
      {tracking && s.trackingNumber && (s.status === 'SHIPPED' || s.status === 'DELIVERED') && <CourierTracking order={order} accessKey={accessKey} />}
      {s.note && <p className="mt-3 text-sm text-charcoal-700">“{s.note}”</p>}
    </section>
  );
}
