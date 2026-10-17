import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, PackageSearch } from 'lucide-react';
import { buildWhatsAppUrl, formatINR } from '@shared/core';
import { useGuestOrders } from '@/store/guest-orders';
import { useAuth } from '@/hooks/useAuth';
import { useContact } from '@/hooks/useStoreInfo';
import { TextField } from '@/components/forms/Field';
import { Button, ButtonLink } from '@/components/ui/Button';
import { WhatsAppIcon } from '@/components/ui/Brand';
import { formatDate, openExternal } from '@/utils';

export default function TrackPage() {
  const orders = useGuestOrders((s) => s.orders);
  const { user } = useAuth();
  const { whatsapp } = useContact();
  const navigate = useNavigate();
  const [number, setNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    document.title = 'Track your order — Brio Cart';
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = number.trim().toUpperCase();
    if (!/^BC-\d{6}-[A-Z0-9]{5}$/.test(n)) {
      setError('Order numbers look like BC-261014-ABCDE');
      return;
    }
    navigate(`/orders/${n}`);
  };

  return (
    <div className="container-page max-w-3xl py-10 sm:py-14">
      <span className="grid size-14 place-items-center rounded-2xl bg-mint-100 text-forest-700">
        <PackageSearch className="size-7" />
      </span>
      <h1 className="mt-5 font-display text-4xl font-semibold text-forest-900 sm:text-5xl">Track your order</h1>
      <p className="mt-2 text-charcoal-500">Status updates come straight from the Brio Cart team.</p>

      <form onSubmit={submit} className="mt-8 flex flex-col gap-3 rounded-[1.75rem] border border-line bg-white p-5 sm:flex-row sm:items-end">
        <TextField label="Order number" placeholder="BC-261014-ABCDE" value={number} onChange={(e) => { setNumber(e.target.value); setError(null); }} error={error ?? undefined} className="flex-1" autoCapitalize="characters" />
        <Button type="submit" size="lg">Track</Button>
      </form>
      <p className="mt-3 text-sm text-charcoal-500">
        For privacy, order details open on the device you ordered from{user ? ' or in your account' : ''}. Otherwise,{' '}
        <button type="button" className="font-bold text-forest-700 underline" onClick={() => openExternal(buildWhatsAppUrl(whatsapp, `Hello Brio Cart, I'd like an update on order ${number.trim().toUpperCase() || '…'}`))}>
          ask us on WhatsApp
        </button>
        .
      </p>

      {user && (
        <ButtonLink to="/account/orders" variant="secondary" className="mt-6">
          View my order history
        </ButtonLink>
      )}

      {orders.length > 0 && (
        <section className="mt-10" aria-labelledby="device-orders">
          <h2 id="device-orders" className="font-display text-2xl font-semibold text-forest-900">Orders placed on this device</h2>
          <ul className="mt-4 divide-y divide-line rounded-[1.75rem] border border-line bg-white">
            {orders.map((o) => (
              <li key={o.orderNumber}>
                <Link to={`/orders/${o.orderNumber}`} className="flex items-center gap-3 p-4 hover:bg-ivory-50">
                  <span className="flex-1">
                    <span className="block font-mono font-bold">{o.orderNumber}</span>
                    <span className="text-sm text-charcoal-500">{formatDate(o.createdAt)}</span>
                  </span>
                  <span className="font-bold tabular-nums">{formatINR(o.total)}</span>
                  <ChevronRight className="size-5 text-charcoal-400" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!orders.length && !user && (
        <button type="button" onClick={() => openExternal(buildWhatsAppUrl(whatsapp))} className="mt-10 flex items-center gap-2 text-sm font-bold text-[#13843f]">
          <WhatsAppIcon className="size-5" /> Placed your order on WhatsApp? Message us for an update.
        </button>
      )}
    </div>
  );
}
