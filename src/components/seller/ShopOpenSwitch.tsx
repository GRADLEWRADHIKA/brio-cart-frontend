import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarOff, Palmtree, Power, Store } from 'lucide-react';
import { shopApi, type MyShop } from '@/api/shop';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/forms/Field';
import { cn, reopensLabel } from '@/utils';

const MAX_DAYS = 90;
/** yyyy-mm-dd in India time, for date inputs. */
const istDay = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

/**
 * The shop owner's main switch: open or closed for orders, plus holiday mode (closed until a date,
 * then reopened automatically). Customers see the note and when the shop opens again.
 */
export function ShopOpenSwitch({ shop, className }: { shop: Pick<MyShop, 'isOpen' | 'closedUntil' | 'closedNote'>; className?: string }) {
  const qc = useQueryClient();
  const [planning, setPlanning] = useState(false);
  const tomorrow = istDay(new Date(Date.now() + 86_400_000));
  const [day, setDay] = useState(tomorrow);
  const [time, setTime] = useState('09:00');
  const [note, setNote] = useState('');
  const set = useMutation({
    mutationFn: (v: { isOpen: boolean; closedUntil?: string | null; closedNote?: string | null }) => shopApi.setOpen(v.isOpen, { closedUntil: v.closedUntil, closedNote: v.closedNote }),
    onSuccess: (s) => {
      qc.setQueryData(['seller', 'me'], s);
      void qc.invalidateQueries({ queryKey: ['seller', 'summary'] });
      setPlanning(false);
    },
  });
  const onHoliday = !shop.isOpen && !!shop.closedUntil;
  // The owner picks a day and time in India time.
  const until = new Date(`${day}T${time || '09:00'}:00+05:30`);

  return (
    <section
      className={cn('overflow-hidden rounded-3xl border-2 p-5 transition-colors', shop.isOpen ? 'border-leaf-500/40 bg-mint-50' : 'border-line bg-ivory-100', className)}
      aria-labelledby="shop-open-title"
      data-testid="shop-open-switch"
    >
      <div className="flex flex-wrap items-center gap-4">
        <span className={cn('grid size-14 shrink-0 place-items-center rounded-2xl', shop.isOpen ? 'bg-leaf-500 text-white' : 'bg-charcoal-400/25 text-charcoal-600')}>
          {onHoliday ? <Palmtree className="size-7" /> : <Store className="size-7" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="shop-open-title" className="font-display text-2xl font-semibold">
            {shop.isOpen ? 'Open for orders' : onHoliday ? 'On holiday' : 'Closed'}
          </h2>
          <p className="text-sm text-charcoal-600">
            {shop.isOpen
              ? 'Customers can order your products right now.'
              : onHoliday
                ? `Reopens by itself ${reopensLabel(shop.closedUntil!)}.${shop.closedNote ? ` Customers see: “${shop.closedNote}”` : ''}`
                : 'Customers can see your products but can’t order until you open again.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={shop.isOpen}
          aria-label="Shop open for orders"
          disabled={set.isPending}
          onClick={() => set.mutate({ isOpen: !shop.isOpen })}
          className={cn(
            'relative h-14 w-28 shrink-0 rounded-full transition disabled:opacity-60',
            shop.isOpen ? 'bg-leaf-500' : 'bg-charcoal-400/40',
          )}
        >
          <span className={cn('absolute top-1.5 left-1.5 grid size-11 place-items-center rounded-full bg-white shadow-md transition-transform duration-300', shop.isOpen && 'translate-x-14')}>
            <Power className={cn('size-5', shop.isOpen ? 'text-leaf-600' : 'text-charcoal-400')} />
          </span>
          <span className={cn('absolute inset-y-0 flex items-center text-xs font-extrabold uppercase text-white', shop.isOpen ? 'left-4' : 'right-3.5 text-charcoal-600')}>{shop.isOpen ? 'Open' : 'Closed'}</span>
        </button>
      </div>

      {!planning && (
        <div className="mt-4 flex flex-wrap gap-2">
          {onHoliday ? (
            <Button size="sm" variant="outline" icon={<CalendarOff className="size-4" />} onClick={() => setPlanning(true)}>
              Change holiday
            </Button>
          ) : (
            <Button size="sm" variant="outline" icon={<Palmtree className="size-4" />} onClick={() => setPlanning(true)}>
              Go on holiday
            </Button>
          )}
        </div>
      )}

      {planning && (
        <form
          className="mt-4 grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            set.mutate({ isOpen: false, closedUntil: until.toISOString(), closedNote: note.trim() || null });
          }}
        >
          <TextField label="Reopen on" type="date" required min={tomorrow} max={istDay(new Date(Date.now() + MAX_DAYS * 86_400_000))} value={day} onChange={(e) => setDay(e.target.value)} />
          <TextField label="At" type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
          <TextField label="Note for customers" optional maxLength={120} placeholder="e.g. Closed for Diwali, back soon" value={note} onChange={(e) => setNote(e.target.value)} className="sm:col-span-2" />
          <p className="text-sm text-charcoal-500 sm:col-span-2">Your shop closes now and opens again by itself {Number.isNaN(until.getTime()) ? 'on the day you pick' : reopensLabel(until.toISOString())}. You can open it early at any time.</p>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit" loading={set.isPending} icon={<Palmtree className="size-4" />}>
              Start holiday
            </Button>
            <Button variant="ghost" onClick={() => setPlanning(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
      {set.error && <p className="mt-3 text-sm font-semibold text-tomato-500">{(set.error as Error).message}</p>}
    </section>
  );
}
