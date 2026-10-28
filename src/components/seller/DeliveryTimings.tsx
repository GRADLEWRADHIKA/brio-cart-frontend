import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Plus, X } from 'lucide-react';
import { shopApi, type MyShop } from '@/api/shop';
import { useStoreInfo } from '@/hooks/useStoreInfo';
import { Card } from '@/components/admin/kit';
import { Button } from '@/components/ui/Button';

const MAX = 6;

const clock = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  return { h, text: `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}`, ampm: h < 12 ? 'AM' : 'PM' };
};

/** "17:00" + "19:00" → "Evening, 5:00 – 7:00 PM", in the same style as the standard slots. */
export function timingLabel(from: string, to: string) {
  const a = clock(from);
  const b = clock(to);
  const part = a.h < 12 ? 'Morning' : a.h < 17 ? 'Afternoon' : a.h < 21 ? 'Evening' : 'Night';
  return a.ampm === b.ampm ? `${part}, ${a.text} – ${b.text} ${b.ampm}` : `${part}, ${a.text} ${a.ampm} – ${b.text} ${b.ampm}`;
}

/**
 * The shop's own delivery timings. Customers buying from the shop see these next to the standard
 * Brio Cart slots and can pick either.
 */
export function DeliveryTimings({ shop }: { shop: MyShop }) {
  const qc = useQueryClient();
  const { data: store } = useStoreInfo();
  const [slots, setSlots] = useState(shop.deliverySlots);
  const [from, setFrom] = useState('17:00');
  const [to, setTo] = useState('19:00');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setSlots(shop.deliverySlots), [shop.deliverySlots]);

  const save = useMutation({
    mutationFn: shopApi.setDeliverySlots,
    onSuccess: (s) => {
      qc.setQueryData(['seller', 'me'], s);
      setError(null);
    },
    onError: (e) => {
      setError((e as Error).message);
      setSlots(shop.deliverySlots);
    },
  });
  const commit = (next: string[]) => {
    setSlots(next);
    save.mutate(next);
  };

  const add = () => {
    if (to <= from) return setError('The end time must be after the start time.');
    const label = timingLabel(from, to);
    const taken = [...slots, ...(store?.settings.deliverySlots ?? [])].some((x) => x.toLowerCase() === label.toLowerCase());
    if (taken) return setError(`“${label}” is already on the list.`);
    commit([...slots, label]);
  };

  return (
    <Card title="Delivery timings" className="mb-6">
      <p className="text-sm text-charcoal-500">
        Customers can always choose a standard Brio Cart slot. Add your own timings and they see those too, and can pick whichever suits them for your order.
      </p>
      <p className="mt-4 text-xs font-extrabold uppercase tracking-wide text-charcoal-500">Standard slots</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {store?.settings.deliverySlots.map((s) => (
          <li key={s} className="rounded-full bg-ivory-100 px-3 py-1.5 text-sm font-semibold text-charcoal-700">{s}</li>
        ))}
      </ul>
      <p className="mt-4 text-xs font-extrabold uppercase tracking-wide text-charcoal-500">Your timings</p>
      {slots.length ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {slots.map((s) => (
            <li key={s} className="inline-flex items-center gap-1.5 rounded-full bg-mint-100 py-1.5 pl-3 pr-1.5 text-sm font-semibold text-forest-800">
              <Clock className="size-3.5" /> {s}
              <button type="button" aria-label={`Remove ${s}`} disabled={save.isPending} onClick={() => commit(slots.filter((x) => x !== s))} className="grid size-6 place-items-center rounded-full hover:bg-white/70">
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-charcoal-500">None yet: your customers get the standard slots only.</p>
      )}
      {slots.length < MAX && (
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label className="text-sm font-bold">
            From
            <input type="time" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block h-10 rounded-2xl border border-line px-3" />
          </label>
          <label className="text-sm font-bold">
            To
            <input type="time" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block h-10 rounded-2xl border border-line px-3" />
          </label>
          <Button type="button" size="sm" variant="secondary" icon={<Plus className="size-4" />} loading={save.isPending} onClick={add}>
            Add {from && to > from ? timingLabel(from, to) : 'timing'}
          </Button>
        </div>
      )}
      {error && <p className="mt-2 text-sm font-semibold text-tomato-500" role="alert">{error}</p>}
      {save.isSuccess && !error && <p className="mt-2 text-sm font-semibold text-forest-700" role="status">Saved.</p>}
    </Card>
  );
}
