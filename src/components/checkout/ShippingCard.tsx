import { Truck } from 'lucide-react';
import { formatINR, SHIPPING_STATUS_LABELS } from '@shared/core';
import type { Order } from '@/types';
import { cn } from '@/utils';

/** Courier delivery outside the city: where it goes, the shipping cost and date once set, and tracking. */
export function ShippingCard({ order, className }: { order: Order; className?: string }) {
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
          <div className="sm:col-span-2"><dt className="text-charcoal-500">Total to pay on delivery</dt><dd className="text-lg font-extrabold tabular-nums">{formatINR(order.total)}</dd></div>
        </dl>
      )}
      {s.note && <p className="mt-3 text-sm text-charcoal-700">“{s.note}”</p>}
    </section>
  );
}
