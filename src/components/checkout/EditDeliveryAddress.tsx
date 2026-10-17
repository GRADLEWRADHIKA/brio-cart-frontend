import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { orderApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import type { Order } from '@/types';
import { TextField } from '@/components/forms/Field';
import { Button } from '@/components/ui/Button';

/** Lets the customer correct house/street/landmark/instructions until delivery. The rider is notified. */
export function EditDeliveryAddress({ order, accessKey, onSaved }: { order: Order; accessKey?: string; onSaved: (o: Order) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    house: order.customer.house,
    street: order.customer.street,
    landmark: order.customer.landmark ?? '',
    instructions: order.customer.instructions ?? '',
  });
  const save = useMutation({
    mutationFn: () => orderApi.updateAddress(order.orderNumber, form, accessKey),
    onSuccess: (o) => {
      onSaved(o);
      setOpen(false);
    },
  });
  const fields = save.error instanceof ApiError ? save.error.details?.fields : undefined;

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-forest-700 underline-offset-2 hover:underline">
        <Pencil className="size-3.5" /> Edit address
      </button>
    );
  }
  return (
    <form
      className="mt-3 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <TextField label="House / building" value={form.house} onChange={(e) => setForm({ ...form, house: e.target.value })} error={fields?.house} />
      <TextField label="Street / area" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} error={fields?.street} />
      <TextField label="Landmark" optional value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} error={fields?.landmark} />
      <TextField label="Delivery instructions" optional value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} error={fields?.instructions} />
      <p className="text-xs text-charcoal-500">The delivery area ({order.customer.areaName}) can’t be changed here. Your rider will be notified.</p>
      {save.error && !fields && <p className="text-sm font-semibold text-tomato-500">{(save.error as Error).message}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={save.isPending}>
          Save address
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
