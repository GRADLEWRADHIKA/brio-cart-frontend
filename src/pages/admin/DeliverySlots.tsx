import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { adminApi, type AdminSlot } from '@/api/admin';
import { ApiError } from '@/api/client';
import { Card, PageHeader, Toggle } from '@/components/admin/kit';
import { TextField } from '@/components/forms/Field';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const blank: Omit<AdminSlot, 'id'> = { label: '', start: '09:00', end: '11:00', capacity: 20, days: '1111111', isActive: true, sortOrder: 0 };

/** One slot: time window, capacity and the weekdays it runs. Exported for tests. */
export function SlotRow({ slot, onDone }: { slot?: AdminSlot; onDone?: () => void }) {
  const qc = useQueryClient();
  const [v, setV] = useState<Omit<AdminSlot, 'id'>>(slot ?? blank);
  const save = useMutation({
    mutationFn: (next: Omit<AdminSlot, 'id'>) => adminApi.saveSlot(next, slot?.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'slots'] });
      onDone?.();
    },
  });
  const fields = save.error instanceof ApiError ? save.error.details?.fields : undefined;
  const invalid = v.end <= v.start || !(v.capacity > 0);
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-line p-4">
      <TextField label="From" type="time" value={v.start} onChange={(e) => setV({ ...v, start: e.target.value })} error={fields?.start} className="w-32" />
      <TextField label="To" type="time" value={v.end} onChange={(e) => setV({ ...v, end: e.target.value })} error={fields?.end ?? (v.end <= v.start ? 'End must be after start' : undefined)} className="w-32" />
      <TextField label="Orders per slot" type="number" min={1} value={v.capacity} onChange={(e) => setV({ ...v, capacity: Number(e.target.value) })} error={fields?.capacity} className="w-36" />
      <TextField label="Label" optional value={v.label} maxLength={40} onChange={(e) => setV({ ...v, label: e.target.value })} placeholder="e.g. Morning" className="w-40" />
      <div className="mb-1 flex flex-wrap gap-1" role="group" aria-label="Days">
        {DAYS.map((d, i) => (
          <button key={d} type="button" aria-pressed={v.days[i] === '1'} onClick={() => setV({ ...v, days: v.days.split('').map((c, j) => (j === i ? (c === '1' ? '0' : '1') : c)).join('') })} className={cn('rounded-full px-2.5 py-1 text-xs font-bold', v.days[i] === '1' ? 'bg-forest-800 text-ivory-50' : 'bg-ivory-100 text-charcoal-500')}>
            {d}
          </button>
        ))}
      </div>
      <label className="mb-3 flex items-center gap-2 text-sm font-bold"><Toggle checked={v.isActive} label="Slot enabled" onChange={(isActive) => setV({ ...v, isActive })} /> Enabled</label>
      <Button size="sm" className="mb-1.5" disabled={invalid} loading={save.isPending} onClick={() => save.mutate(v)}>{slot ? 'Save' : 'Add slot'}</Button>
      {save.error && !fields && <p className="w-full text-sm font-semibold text-tomato-500">{(save.error as Error).message}</p>}
    </div>
  );
}

function Cutoff({ value }: { value: string | null }) {
  const qc = useQueryClient();
  const [v, setV] = useState(value ?? '');
  const save = useMutation({ mutationFn: () => adminApi.saveCutoff(v || null), onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'slots'] }) });
  return (
    <div className="flex flex-wrap items-end gap-3">
      <TextField label="Daily cut-off for today's slots" optional type="time" value={v} onChange={(e) => setV(e.target.value)} hint="After this time customers can only book from tomorrow. Blank = no cut-off." className="w-64" />
      <Button size="sm" variant="outline" className="mb-6" loading={save.isPending} onClick={() => save.mutate()}>Save cut-off</Button>
      {save.error && <p className="w-full text-sm font-semibold text-tomato-500">{(save.error as Error).message}</p>}
    </div>
  );
}

export default function DeliverySlots() {
  const { data } = useQuery({ queryKey: ['admin', 'slots'], queryFn: adminApi.slots });
  const [adding, setAdding] = useState(false);
  return (
    <>
      <PageHeader title="Delivery slots" subtitle="Customers pick one of these at checkout. Full or past slots can't be booked." actions={<Button icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>Add slot</Button>} />
      <Card className="mb-4">{data && <Cutoff key={data.cutoff ?? ''} value={data.cutoff} />}</Card>
      <Card>
        <div className="space-y-3">
          {adding && <SlotRow onDone={() => setAdding(false)} />}
          {data?.slots.map((s) => <SlotRow key={s.id + s.isActive} slot={s} />)}
          {data?.slots.length === 0 && !adding && <p className="text-sm text-charcoal-500">No slots yet. Checkout uses the slot labels in Store settings until you add one.</p>}
        </div>
      </Card>
    </>
  );
}
