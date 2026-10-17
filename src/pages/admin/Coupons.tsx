import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Tag } from 'lucide-react';
import { formatINR } from '@shared/core';
import { adminApi, type AdminCoupon, type CouponPayload } from '@/api/admin';
import { ApiError } from '@/api/client';
import { Card, PageHeader, Toggle } from '@/components/admin/kit';
import { SelectField, TextField } from '@/components/forms/Field';
import { Button } from '@/components/ui/Button';
import { cn, formatDate } from '@/utils';

const toForm = (c?: AdminCoupon) => ({
  code: c?.code ?? '',
  description: c?.description ?? '',
  type: (c?.type ?? 'FLAT') as 'FLAT' | 'PERCENT',
  value: c ? String(c.type === 'FLAT' ? c.value / 100 : c.value) : '',
  minOrderAmount: c ? String(c.minOrderAmount / 100) : '0',
  maxDiscount: c?.maxDiscount ? String(c.maxDiscount / 100) : '',
  endsAt: c?.endsAt ? c.endsAt.slice(0, 10) : '',
  usageLimit: c?.usageLimit ? String(c.usageLimit) : '',
  isActive: c?.isActive ?? true,
});

function CouponForm({ c, onDone }: { c?: AdminCoupon; onDone: () => void }) {
  const qc = useQueryClient();
  const [v, setV] = useState(toForm(c));
  const save = useMutation({
    mutationFn: () => {
      const payload: CouponPayload = {
        code: v.code,
        description: v.description || null,
        type: v.type,
        value: Number(v.value),
        minOrderAmount: Number(v.minOrderAmount) || 0,
        maxDiscount: v.maxDiscount ? Number(v.maxDiscount) : null,
        endsAt: v.endsAt ? new Date(`${v.endsAt}T23:59:59+05:30`).toISOString() : null,
        usageLimit: v.usageLimit ? Number(v.usageLimit) : null,
        isActive: v.isActive,
      };
      return adminApi.saveCoupon(payload, c?.id);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      onDone();
    },
  });
  const f = save.error instanceof ApiError ? save.error.details?.fields : undefined;
  return (
    <Card title={c ? `Edit ${c.code}` : 'New coupon'} className="mb-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Code" value={v.code} onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} error={f?.code} placeholder="FRESH50" />
        <SelectField label="Type" value={v.type} onChange={(e) => setV({ ...v, type: e.target.value as 'FLAT' | 'PERCENT' })}>
          <option value="FLAT">Flat ₹ off</option>
          <option value="PERCENT">% off</option>
        </SelectField>
        <TextField label={v.type === 'FLAT' ? 'Discount (₹)' : 'Discount (%)'} type="number" min={1} value={v.value} onChange={(e) => setV({ ...v, value: e.target.value })} error={f?.value} />
        <TextField label="Minimum order (₹)" type="number" min={0} value={v.minOrderAmount} onChange={(e) => setV({ ...v, minOrderAmount: e.target.value })} />
        {v.type === 'PERCENT' && <TextField label="Max discount (₹)" optional type="number" min={0} value={v.maxDiscount} onChange={(e) => setV({ ...v, maxDiscount: e.target.value })} />}
        <TextField label="Valid until" optional type="date" value={v.endsAt} onChange={(e) => setV({ ...v, endsAt: e.target.value })} />
        <TextField label="Total uses allowed" optional type="number" min={1} value={v.usageLimit} onChange={(e) => setV({ ...v, usageLimit: e.target.value })} />
        <TextField label="Description" optional value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} className="sm:col-span-2" />
      </div>
      {save.error && !f && <p className="mt-3 text-sm font-semibold text-tomato-500">{(save.error as Error).message}</p>}
      <div className="mt-4 flex items-center gap-3">
        <Button loading={save.isPending} disabled={!v.code || !v.value} onClick={() => save.mutate()}>
          Save coupon
        </Button>
        <Button variant="ghost" onClick={onDone}>Cancel</Button>
        <label className="ml-auto flex items-center gap-2 text-sm font-bold">
          <Toggle checked={v.isActive} label="Active" onChange={(isActive) => setV({ ...v, isActive })} /> Active
        </label>
      </div>
    </Card>
  );
}

export default function Coupons() {
  const { data } = useQuery({ queryKey: ['admin', 'coupons'], queryFn: adminApi.coupons });
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <>
      <PageHeader title="Coupons" subtitle="Customers enter codes at checkout. Discounts are calculated and limited on the server." actions={<Button icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>New coupon</Button>} />
      {editing === 'new' && <CouponForm onDone={() => setEditing(null)} />}
      {editing && editing !== 'new' && <CouponForm c={data?.find((c) => c.id === editing)} onDone={() => setEditing(null)} />}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((c) => {
          const expired = c.endsAt && new Date(c.endsAt) < new Date();
          const exhausted = c.usageLimit !== null && c.usedCount >= c.usageLimit;
          return (
            <button key={c.id} type="button" onClick={() => setEditing(c.id)} className="relative overflow-hidden rounded-3xl border-2 border-dashed border-leaf-500/50 bg-white p-5 text-left transition hover:border-leaf-500">
              <span className="absolute -left-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-ivory-100" />
              <span className="absolute -right-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-ivory-100" />
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 font-mono text-lg font-extrabold tracking-wider text-forest-800">
                  <Tag className="size-4" /> {c.code}
                </span>
                <span className={cn('rounded-full px-2 py-0.5 text-[0.65rem] font-extrabold uppercase', !c.isActive || expired || exhausted ? 'bg-ivory-200 text-charcoal-500' : 'bg-leaf-500 text-white')}>
                  {!c.isActive ? 'Off' : expired ? 'Expired' : exhausted ? 'Used up' : 'Live'}
                </span>
              </div>
              <p className="mt-2 font-display text-2xl font-semibold">
                {c.type === 'FLAT' ? `${formatINR(c.value)} off` : `${c.value}% off`}
                {c.maxDiscount ? <span className="text-base font-normal text-charcoal-500"> up to {formatINR(c.maxDiscount)}</span> : null}
              </p>
              <p className="mt-1 text-sm text-charcoal-500">
                {c.minOrderAmount ? `On orders above ${formatINR(c.minOrderAmount)}` : 'No minimum order'}
                {c.endsAt && ` · until ${formatDate(c.endsAt, false)}`}
              </p>
              <p className="mt-2 text-xs font-bold text-charcoal-500">
                Used {c.usedCount}
                {c.usageLimit ? ` / ${c.usageLimit}` : ''} times
              </p>
            </button>
          );
        })}
        {data?.length === 0 && editing !== 'new' && <p className="text-sm text-charcoal-500">No coupons yet.</p>}
      </div>
    </>
  );
}
