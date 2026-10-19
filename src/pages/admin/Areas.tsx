import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus } from 'lucide-react';
import { adminApi, type AdminArea } from '@/api/admin';
import { ApiError } from '@/api/client';
import { Card, PageHeader, Toggle } from '@/components/admin/kit';
import { TextField } from '@/components/forms/Field';
import { Button } from '@/components/ui/Button';
import { usePermission } from '@/auth/guards';

function AreaRow({ a, onDone }: { a?: AdminArea; onDone?: () => void }) {
  const qc = useQueryClient();
  const canFees = usePermission('fee:manage');
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
      {a && canFees && <AreaFees a={a} />}
    </div>
  );
}

const rupeesOrNull = (v: string) => (v.trim() === '' ? null : Number(v));
const shown = (p: number | null) => (p === null ? '' : String(p / 100));

/** Super admin: this area's minimum order, delivery fee and free-delivery threshold. Blank = store default. */
function AreaFees({ a }: { a: AdminArea }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ minOrderAmount: shown(a.minOrderAmount), deliveryFee: shown(a.deliveryFee), freeDeliveryThreshold: shown(a.freeDeliveryThreshold) });
  const save = useMutation({
    mutationFn: () => adminApi.saveAreaFees(a.id, { minOrderAmount: rupeesOrNull(f.minOrderAmount), deliveryFee: rupeesOrNull(f.deliveryFee), freeDeliveryThreshold: rupeesOrNull(f.freeDeliveryThreshold) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'areas'] });
      void qc.invalidateQueries({ queryKey: ['store'] });
    },
  });
  const fields = save.error instanceof ApiError ? save.error.details?.fields : undefined;
  return (
    <div className="flex w-full flex-wrap items-end gap-3 border-t border-line pt-3">
      <TextField label="Minimum order (₹)" optional type="number" min={0} step="0.01" value={f.minOrderAmount} onChange={(e) => setF({ ...f, minOrderAmount: e.target.value })} error={fields?.minOrderAmount} className="w-40" />
      <TextField label="Delivery fee (₹)" optional type="number" min={0} step="0.01" value={f.deliveryFee} onChange={(e) => setF({ ...f, deliveryFee: e.target.value })} error={fields?.deliveryFee} className="w-40" />
      <TextField label="Free delivery from (₹)" optional type="number" min={0} step="0.01" value={f.freeDeliveryThreshold} onChange={(e) => setF({ ...f, freeDeliveryThreshold: e.target.value })} error={fields?.freeDeliveryThreshold} className="w-44" />
      <Button size="sm" variant="outline" className="mb-1.5" loading={save.isPending} onClick={() => save.mutate()}>Save fees</Button>
      <p className="w-full text-xs text-charcoal-500">Leave blank to use the store-wide setting.</p>
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
