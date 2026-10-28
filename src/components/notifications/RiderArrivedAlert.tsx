import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { BellRing, Bike, Phone, X } from 'lucide-react';
import { orderApi } from '@/api/endpoints';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationActions, useNotificationList } from '@/hooks/useNotifications';
import { usePush } from '@/hooks/usePush';
import { Button } from '@/components/ui/Button';
import { playAlert } from '@/utils/alertSound';
import { cn } from '@/utils';
import type { Order } from '@/types';

/** Alerts older than this are history, not news: no pop-up. Seen-ness is per order, shared with the order page. */
const FRESH_MS = 30 * 60_000;
const SEEN_KEY = 'brio:arrived-seen';

function seen(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}
function markSeen(id: string) {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen(), id].slice(-20)));
  } catch {
    /* private mode */
  }
}

/** The pop-up itself: who is at the door, the delivery code, and a call button. */
export function ArrivedPopup({ order, onClose }: { order: Pick<Order, 'orderNumber' | 'rider' | 'deliveryOtp'>; onClose: () => void }) {
  const ok = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    playAlert('arrived');
    ok.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const name = order.rider?.name ?? 'Your rider';
  return (
    <div className="fixed inset-0 z-[90] grid place-items-end bg-forest-950/50 p-4 backdrop-blur-[2px] sm:place-items-center" role="alertdialog" aria-modal="true" aria-labelledby="arrived-title" aria-describedby="arrived-body">
      <div className="safe-bottom w-full max-w-sm animate-pop rounded-[2rem] bg-white p-6 text-center shadow-2xl">
        <button type="button" onClick={onClose} className="float-right -mr-2 -mt-2 grid size-9 place-items-center rounded-full hover:bg-ivory-100" aria-label="Close">
          <X className="size-5" />
        </button>
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-lime-300 text-forest-900">
          <Bike className="size-8" />
        </span>
        <h2 id="arrived-title" className="mt-4 font-display text-2xl font-semibold text-forest-900">
          Your rider has arrived
        </h2>
        <p id="arrived-body" className="mt-1 text-charcoal-700">
          {name} is at your door with order <span className="font-mono font-bold">{order.orderNumber}</span>.
        </p>
        {order.deliveryOtp && (
          <div className="mt-4 rounded-2xl bg-mint-100 p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-forest-700">Your delivery code</p>
            <p className="mt-1 font-mono text-4xl font-extrabold tracking-[0.3em] text-forest-900" data-testid="arrived-code">
              {order.deliveryOtp}
            </p>
            <p className="mt-1 text-xs text-forest-700">Tell the rider this code when they hand over your order.</p>
          </div>
        )}
        <div className={cn('mt-5 grid gap-2', order.rider?.phone ? 'grid-cols-2' : 'grid-cols-1')}>
          {order.rider?.phone && (
            <a href={`tel:+91${order.rider.phone}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-mint-100 font-bold text-forest-800">
              <Phone className="size-4" /> Call rider
            </a>
          )}
          <Button ref={ok} size="lg" onClick={onClose}>
            OK, coming
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Signed-in customers, anywhere on the site: pops up the moment a "rider has arrived" alert comes
 * in (polled), once per alert. Guests see it on the order page instead (OrderPage).
 */
export function RiderArrivedWatcher() {
  const { user } = useAuth();
  const isCustomer = user?.role === 'CUSTOMER';
  const { data } = useNotificationList(1, 10, isCustomer);
  const { markRead } = useNotificationActions();
  const { pathname } = useLocation();
  const [current, setCurrent] = useState<{ id: string; orderId: string; orderNumber: string } | null>(null);

  useEffect(() => {
    if (current || !data) return;
    const fresh = data.items.find(
      (n) => n.type === 'RIDER_ARRIVED' && !n.readAt && n.orderId && n.orderNumber && Date.now() - new Date(n.createdAt).getTime() < FRESH_MS && !seen().includes(n.orderId),
    );
    // The order page shows its own pop-up (useArrivedPopup).
    if (fresh && pathname !== `/orders/${fresh.orderNumber}`) setCurrent({ id: fresh.id, orderId: fresh.orderId!, orderNumber: fresh.orderNumber! });
  }, [data, current, pathname]);

  const order = useQuery({ queryKey: ['order', current?.orderNumber], queryFn: () => orderApi.get(current!.orderNumber), enabled: !!current });
  if (!current || !order.data || order.data.status !== 'OUT_FOR_DELIVERY') return null;
  const close = () => {
    markSeen(current.orderId);
    markRead.mutate(current.id);
    setCurrent(null);
  };
  return <ArrivedPopup order={order.data} onClose={close} />;
}

/** Guests and anyone on the order page: shows the pop-up once when this order's rider arrives. */
export function useArrivedPopup(order: Order | undefined) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const arrivedAt = order?.delivery.arrivedAt;
  useEffect(() => {
    if (!order || !arrivedAt || order.status !== 'OUT_FOR_DELIVERY') return;
    if (seen().includes(order.id)) return;
    markSeen(order.id);
    setOpen(true);
  }, [order, arrivedAt]);
  const close = () => {
    setOpen(false);
    void qc.invalidateQueries({ queryKey: ['notifications'] });
  };
  return open && order ? <ArrivedPopup order={order} onClose={close} /> : null;
}

/** "Turn on alerts" card: asks once from a tap, then hides. */
export function PushPrompt({ tone = 'light', className, text }: { tone?: 'light' | 'dark'; className?: string; text: string }) {
  const { user } = useAuth();
  const { state, busy, enable } = usePush();
  const [error, setError] = useState<string | null>(null);
  // Push is tied to an account; guests get the in-page pop-up only.
  if (!user || state === 'on' || state === 'unsupported') return null;
  const dark = tone === 'dark';
  return (
    <div className={cn('flex items-start gap-3 rounded-2xl p-3 text-sm', dark ? 'bg-white/10 text-ivory-50' : 'bg-turmeric-100 text-[#5a3b00]', className)} data-testid="push-prompt">
      <BellRing className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        {state === 'blocked' ? (
          <p>Alerts are blocked for this site. Allow notifications for it in your browser settings to get alerts when the app is closed.</p>
        ) : (
          <>
            <p>{text}</p>
            <Button size="sm" variant={dark ? 'lime' : 'primary'} className="mt-2" loading={busy} onClick={() => void enable().catch((e: Error) => setError(e.message))}>
              Turn on alerts
            </Button>
          </>
        )}
        {error && <p className="mt-1 font-semibold text-tomato-500">{error}</p>}
      </div>
    </div>
  );
}
