import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus } from 'lucide-react';
import { adminApi, type AdminArea } from '@/api/admin';
import { ApiError } from '@/api/client';
import { Card, PageHeader, Toggle } from '@/components/admin/kit';
import { TextField } from '@/components/forms/Field';
import { Button } from '@/components/ui/Button';

function AreaRow({ a, onDone }: { a?: AdminArea; onDone?: () => void }) {
  const qc = useQueryClient();
  const [v, setV] = useState({ name: a?.name ?? '', pincode: a?.pincode ?? '', isActive: a?.isActive ?? true, sortOrder: a?.sortOrder ?? 0, lat: a?.lat ?? null, lng: a?.lng ?? null });
  const save = useMutation({
    mutationFn: (next: typeof v) => adminApi.saveArea({ ...next, pincode: next.pincode || null }, a?.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'areas'] });
      void qc.invalidateQueries({ queryKey: ['store'] });
      onDone?.();
    },
  });
  const fields = save.error instanceof ApiError ? save.error.details?.fields : undefined;
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-line p-4">
      <MapPin className="mb-3 size-5 text-leaf-600" />
      <TextField label="Locality" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} error={fields?.name} className="min-w-44 flex-1" />
      <TextField label="PIN code" optional inputMode="numeric" maxLength={6} value={v.pincode} onChange={(e) => setV({ ...v, pincode: e.target.value })} error={fields?.pincode} className="w-32" />
      <TextField label="Map lat" optional type="number" step="0.0001" value={v.lat ?? ''} onChange={(e) => setV({ ...v, lat: e.target.value === '' ? null : Number(e.target.value) })} className="w-32" />
      <TextField label="Map lng" optional type="number" step="0.0001" value={v.lng ?? ''} onChange={(e) => setV({ ...v, lng: e.target.value === '' ? null : Number(e.target.value) })} className="w-32" />
      <label className="mb-3 flex items-center gap-2 text-sm font-bold">
        <Toggle checked={v.isActive} label={`Deliver to ${v.name}`} onChange={(isActive) => { const n = { ...v, isActive }; setV(n); if (a) save.mutate(n); }} /> Delivering
      </label>
      <Button size="sm" className="mb-1.5" loading={save.isPending} onClick={() => save.mutate(v)}>{a ? 'Save' : 'Add area'}</Button>
      {save.error && !fields && <p className="w-full text-sm font-semibold text-tomato-500">{(save.error as Error).message}</p>}
    </div>
  );
}

export default function Areas() {
  const { data } = useQuery({ queryKey: ['admin', 'areas'], queryFn: adminApi.areas });
  const [adding, setAdding] = useState(false);
  return (
    <>
      <PageHeader title="Delivery areas" subtitle="Orders are accepted only for active localities. Changes apply immediately at checkout." actions={<Button icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>Add area</Button>} />
      <Card>
        <div className="space-y-3">
          {adding && <AreaRow onDone={() => setAdding(false)} />}
          {data?.map((a) => <AreaRow key={a.id} a={a} />)}
        </div>
      </Card>
    </>
  );
}
