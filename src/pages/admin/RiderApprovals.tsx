import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bike, Check, X } from 'lucide-react';
import type { RiderStatus } from '@shared/core';
import { adminApi, type AdminRider } from '@/api/admin';
import { Card, PageHeader } from '@/components/admin/kit';
import { Button } from '@/components/ui/Button';
import { cn, formatDate } from '@/utils';

function Applicant({ r }: { r: AdminRider }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'riders'] });
  const approve = useMutation({ mutationFn: () => adminApi.approveRider(r.id), onSuccess: refresh });
  const reject = useMutation({ mutationFn: () => adminApi.rejectRider(r.id, reason || undefined), onSuccess: refresh });
  const error = approve.error ?? reject.error;
  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-forest-800 text-lime-300">
          <Bike className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold">{r.name}</p>
          <p className="text-sm text-charcoal-500">+91 {r.phone}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        {r.vehicleNumber ? <span className="rounded border border-charcoal-900/20 bg-turmeric-100 px-1.5 py-0.5 font-mono text-xs font-bold">{r.vehicleNumber}</span> : <span className="text-charcoal-400">No vehicle no.</span>}
        <span className="text-xs text-charcoal-500">Applied {formatDate(r.createdAt, false)}</span>
      </div>
      {r.riderStatus === 'PENDING' && (
        <>
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Reason (only if rejecting)" className="mt-4 h-10 w-full rounded-2xl border border-line px-3 text-sm" aria-label={`Rejection reason for ${r.name}`} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="outline" className="text-tomato-500" icon={<X className="size-4" />} loading={reject.isPending} onClick={() => reject.mutate()}>
              Reject
            </Button>
            <Button icon={<Check className="size-4" />} loading={approve.isPending} onClick={() => approve.mutate()}>
              Approve
            </Button>
          </div>
        </>
      )}
      {r.riderStatus === 'REJECTED' && (
        <Button size="sm" variant="secondary" className="mt-4" loading={approve.isPending} onClick={() => approve.mutate()}>
          Approve after all
        </Button>
      )}
      {error && <p className="mt-2 text-sm font-semibold text-tomato-500">{(error as Error).message}</p>}
    </Card>
  );
}

/** Super admin: riders who signed up at /rider/register wait here until approved. */
export default function RiderApprovals() {
  const [status, setStatus] = useState<RiderStatus>('PENDING');
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'riders', status], queryFn: () => adminApi.riders(status), refetchInterval: 30_000 });
  const pill = (active: boolean) => cn('shrink-0 rounded-full px-4 py-2 text-sm font-bold transition', active ? 'bg-forest-800 text-ivory-50' : 'bg-white text-charcoal-700 ring-1 ring-line');
  return (
    <>
      <PageHeader title="Rider approvals" subtitle="New delivery partners can’t receive orders until you approve them." />
      <div className="mb-4 flex gap-2">
        <button type="button" className={pill(status === 'PENDING')} onClick={() => setStatus('PENDING')}>Pending</button>
        <button type="button" className={pill(status === 'REJECTED')} onClick={() => setStatus('REJECTED')}>Rejected</button>
      </div>
      {isLoading && <div className="skeleton h-40 rounded-3xl" />}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data?.map((r) => <Applicant key={r.id} r={r} />)}</div>
      {data?.length === 0 && <p className="text-sm text-charcoal-500">{status === 'PENDING' ? 'No riders are waiting for approval.' : 'No rejected applications.'}</p>}
    </>
  );
}
