import { Check, ChefHat, ClipboardCheck, Home, Package, Truck, XCircle } from 'lucide-react';
import { ORDER_PROGRESS, ORDER_STATUS_LABELS, type OrderStatus } from '@shared/core';
import type { Order } from '@/types';
import { cn, formatDate } from '@/utils';

const ICONS: Record<OrderStatus, typeof Check> = {
  PENDING: ClipboardCheck,
  CONFIRMED: Package,
  PREPARING: ChefHat,
  OUT_FOR_DELIVERY: Truck,
  DELIVERED: Home,
  CANCELLED: XCircle,
};

const DESCRIPTIONS: Record<OrderStatus, string> = {
  PENDING: 'We’ve received your order and will confirm it shortly.',
  CONFIRMED: 'Your order is confirmed for delivery.',
  PREPARING: 'Your groceries are being sorted, cleaned and packed.',
  OUT_FOR_DELIVERY: 'Your order is on its way.',
  DELIVERED: 'Delivered. Enjoy your fresh groceries!',
  CANCELLED: 'This order was cancelled.',
};

export function StatusPill({ status }: { status: OrderStatus }) {
  const tone: Record<OrderStatus, string> = {
    PENDING: 'bg-turmeric-100 text-[#7a4f00]',
    CONFIRMED: 'bg-sky-100 text-[#1e4f78]',
    PREPARING: 'bg-peach-100 text-[#9a3f12]',
    OUT_FOR_DELIVERY: 'bg-mint-100 text-forest-700',
    DELIVERED: 'bg-forest-800 text-ivory-50',
    CANCELLED: 'bg-tomato-100 text-tomato-500',
  };
  return <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider', tone[status])}>{ORDER_STATUS_LABELS[status]}</span>;
}

/** Status timeline driven entirely by the backend's status events (no simulated tracking). */
export function OrderStatusTracker({ order }: { order: Order }) {
  const reached = new Map(order.events.map((e) => [e.status, e.at]));
  if (order.status === 'CANCELLED') {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-tomato-100 p-4 text-tomato-500">
        <XCircle className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-extrabold">Order cancelled</p>
          <p className="text-sm">{order.events.find((e) => e.status === 'CANCELLED')?.note ?? DESCRIPTIONS.CANCELLED}</p>
        </div>
      </div>
    );
  }
  const currentIndex = ORDER_PROGRESS.indexOf(order.status);
  return (
    <ol className="relative" aria-label="Order progress">
      {ORDER_PROGRESS.map((s, i) => {
        const Icon = ICONS[s];
        const done = i <= currentIndex;
        const current = i === currentIndex;
        return (
          <li key={s} className="relative flex gap-4 pb-6 last:pb-0" aria-current={current ? 'step' : undefined}>
            {i < ORDER_PROGRESS.length - 1 && (
              <span aria-hidden className={cn('absolute left-[1.1rem] top-10 h-[calc(100%-2.5rem)] w-0.5 rounded-full', i < currentIndex ? 'bg-leaf-500' : 'bg-line')} />
            )}
            <span
              className={cn(
                'relative grid size-9 shrink-0 place-items-center rounded-full transition',
                done ? 'bg-forest-800 text-lime-300' : 'bg-ivory-200 text-charcoal-400',
                current && 'ring-4 ring-lime-300/60',
              )}
            >
              <Icon className="size-[1.1rem]" />
            </span>
            <div className="pt-1">
              <p className={cn('font-extrabold', done ? 'text-forest-900' : 'text-charcoal-400')}>{ORDER_STATUS_LABELS[s]}</p>
              {current && <p className="text-sm text-charcoal-500">{DESCRIPTIONS[s]}</p>}
              {reached.get(s) && <p className="text-xs text-charcoal-400">{formatDate(reached.get(s)!)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
