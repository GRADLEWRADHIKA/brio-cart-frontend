import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, KeyRound } from 'lucide-react';
import { orderApi } from '@/api/endpoints';
import { useAuth } from '@/hooks/useAuth';
import { useGuestOrders } from '@/store/guest-orders';
import { cn } from '@/utils';

const HIDDEN_KEY = 'briocart.code-popup.minimised';
const readHidden = (): string[] => {
  try {
    return JSON.parse(sessionStorage.getItem(HIDDEN_KEY) ?? '[]');
  } catch {
    return [];
  }
};

/**
 * Pops up the 4-digit delivery code as soon as an order is out for delivery, on any page, for the
 * signed-in customer and for guest orders placed on this device. It can be folded into a small tab.
 */
export function DeliveryCodePopup() {
  const { user } = useAuth();
  const guest = useGuestOrders((s) => s.orders);
  const refs = guest.slice(0, 10).map((o) => ({ orderNumber: o.orderNumber, key: o.accessKey }));
  const enabled = (!!user && user.role === 'CUSTOMER') || refs.length > 0;
  const { data } = useQuery({
    queryKey: ['active-codes', user?.id ?? null, refs.map((r) => r.orderNumber).join(',')],
    queryFn: () => orderApi.activeCodes(refs),
    enabled,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const [hidden, setHidden] = useState<string[]>(readHidden);
  useEffect(() => {
    try {
      sessionStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden));
    } catch {
      /* private mode */
    }
  }, [hidden]);

  const codes = data ?? [];
  if (!enabled || codes.length === 0) return null;
  const open = codes.filter((c) => !hidden.includes(`${c.orderNumber}:${c.code}`));

  if (open.length === 0) {
    return (
      <button
        type="button"
        onClick={() => setHidden([])}
        className="fixed bottom-24 right-4 z-[60] inline-flex items-center gap-2 rounded-full bg-forest-800 px-4 py-2.5 text-sm font-bold text-ivory-50 shadow-lift lg:bottom-6"
        aria-label="Show your delivery code"
      >
        <KeyRound className="size-4 text-lime-300" /> Delivery code
      </button>
    );
  }
  return (
    <div className="fixed inset-x-4 bottom-24 z-[60] space-y-2 sm:left-auto sm:right-4 sm:w-80 lg:bottom-6" role="dialog" aria-label="Your delivery code" data-testid="delivery-code-popup">
      {open.map((c) => (
        <section key={c.orderNumber} className="rounded-[1.5rem] bg-forest-800 p-5 text-ivory-50 shadow-lift">
          <div className="flex items-start justify-between gap-2">
            <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-lime-300">
              <KeyRound className="size-4" /> Your order is on the way
            </p>
            <button type="button" onClick={() => setHidden((h) => [...h, `${c.orderNumber}:${c.code}`])} className="grid size-8 place-items-center rounded-full hover:bg-white/10" aria-label="Fold the delivery code">
              <ChevronDown className="size-4" />
            </button>
          </div>
          <p className="mt-2 text-sm text-ivory-50/80">Give this code to {c.riderName ?? 'the rider'} when your order arrives:</p>
          <p className={cn('mt-1 font-mono text-5xl font-bold tracking-[0.3em]')} data-testid="popup-code">{c.code}</p>
          <p className="mt-2 text-xs text-ivory-50/70">
            Order{' '}
            <Link to={`/orders/${c.orderNumber}${c.accessKey ? `?key=${encodeURIComponent(c.accessKey)}` : ''}`} className="font-mono font-bold underline">
              {c.orderNumber}
            </Link>
            {c.sellerName ? ` · ${c.sellerName}` : ''}. Never share it on the phone.
          </p>
        </section>
      ))}
    </div>
  );
}
