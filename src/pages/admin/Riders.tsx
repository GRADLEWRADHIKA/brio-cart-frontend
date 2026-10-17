import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bike, Plus } from 'lucide-react';
import { adminApi } from '@/api/admin';
import { ApiError } from '@/api/client';
import { Card, PageHeader, Toggle } from '@/components/admin/kit';
import { usePermission } from '@/auth/guards';
import { cn } from '@/utils';
import { TextField } from '@/components/forms/Field';
import { Button } from '@/components/ui/Button';

export default function Riders() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin', 'riders'], queryFn: () => adminApi.riders() });
  // Creating and deactivating riders is user management (super admin); admins see the roster.
  const canManage = usePermission('user:manage');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', vehicleNumber: '', password: '' });
  const create = useMutation({
    mutationFn: () => adminApi.createRider({ ...form, vehicleNumber: form.vehicleNumber || undefined }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'riders'] });
      setAdding(false);
      setForm({ name: '', phone: '', vehicleNumber: '', password: '' });
    },
  });
  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => adminApi.updateRider(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'riders'] }),
  });
  const fields = create.error instanceof ApiError ? create.error.details?.fields : undefined;

  return (
    <>
      <PageHeader
        title="Delivery partners"
        subtitle="Riders sign up at /rider/register (or are added here), then sign in at /rider on their phone to accept orders, share live location and confirm deliveries with the customer’s code."
        actions={canManage ? <Button icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>Add rider</Button> : undefined}
      />
      {adding && canManage && (
        <Card title="New delivery partner" className="mb-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={fields?.name} />
            <TextField label="Mobile number" prefix="+91" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={fields?.phone} />
            <TextField label="Vehicle number" optional placeholder="UP32 AB 1234" value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value.toUpperCase() })} />
            <TextField label="Temporary password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={fields?.password} hint="Share it privately with the rider." />
          </div>
          {create.error && !fields && <p className="mt-3 text-sm font-semibold text-tomato-500">{(create.error as Error).message}</p>}
          <div className="mt-4 flex gap-2">
            <Button loading={create.isPending} onClick={() => create.mutate()}>Create rider</Button>
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((r) => (
          <Card key={r.id}>
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-full bg-forest-800 text-lime-300">
                <Bike className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold">{r.name}</p>
                <p className="text-sm text-charcoal-500">+91 {r.phone}</p>
              </div>
              {canManage ? (
                <Toggle checked={r.isActive} label={`${r.name} active`} onChange={(isActive) => toggle.mutate({ id: r.id, isActive })} />
              ) : (
                !r.isActive && <span className="text-xs font-bold text-charcoal-400">Inactive</span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[0.68rem] font-extrabold uppercase tracking-wider">
              <span className={cn('rounded-full px-2 py-0.5', r.riderStatus === 'APPROVED' ? 'bg-mint-100 text-forest-800' : r.riderStatus === 'PENDING' ? 'bg-turmeric-100 text-[#6b4500]' : 'bg-tomato-100 text-tomato-500')}>
                {r.riderStatus === 'APPROVED' ? 'Approved' : r.riderStatus === 'PENDING' ? 'Pending approval' : 'Rejected'}
              </span>
              <span className={cn('rounded-full px-2 py-0.5', r.isOnline ? 'bg-lime-300 text-forest-900' : 'bg-ivory-200 text-charcoal-500')}>{r.isOnline ? 'Online' : 'Offline'}</span>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              {r.vehicleNumber ? <span className="rounded border border-charcoal-900/20 bg-turmeric-100 px-1.5 py-0.5 font-mono text-xs font-bold">{r.vehicleNumber}</span> : <span className="text-charcoal-400">No vehicle no.</span>}
              <span className="font-bold">{r.activeOrders} active order{r.activeOrders === 1 ? '' : 's'}</span>
            </div>
          </Card>
        ))}
        {data?.length === 0 && !adding && <p className="text-sm text-charcoal-500">No delivery partners yet. Add your first rider to start assigning orders.</p>}
      </div>
    </>
  );
}
