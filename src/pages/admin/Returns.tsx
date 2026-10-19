import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatINR, REFUND_METHOD_LABELS, REFUND_METHODS, type RefundMethod } from '@shared/core';
import { adminApi } from '@/api/admin';
import { Card, PageHeader } from '@/components/admin/kit';
import { Button } from '@/components/ui/Button';
import type { ReturnRequestRow } from '@/types';
import { formatDate } from '@/utils';

/** Approve (with a store-credit or cash refund) or reject a return. Exported for tests. */
export function ReturnDecision({ r }: { r: ReturnRequestRow }) {
  const qc = useQueryClient();
  const [method, setMethod] = useState<RefundMethod>('STORE_CREDIT');
  const [amount, setAmount] = useState(String((r.orderTotal ?? 0) / 100));
  const [note, setNote] = useState('');
  const m = useMutation({
    mutationFn: (approve: boolean) => adminApi.decideReturn(r.id, approve ? { approve, refundMethod: method, refundAmount: Number(amount), note: note.trim() || undefined } : { approve, note: note.trim() || undefined }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'returns'] }),
  });
  const max = (r.orderTotal ?? 0) / 100;
  const badAmount = !(Number(amount) > 0) || Number(amount) > max;
  return (
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <select aria-label="Refund as" value={method} onChange={(e) => setMethod(e.target.value as RefundMethod)} className="h-9 rounded-full border border-line bg-white px-3 text-sm font-bold">
        {REFUND_METHODS.map((x) => <option key={x} value={x}>{REFUND_METHOD_LABELS[x]}</option>)}
      </select>
      <input aria-label="Refund amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} className="h-9 w-28 rounded-full border border-line px-3 text-sm" />
      <input aria-label="Note to customer" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Note to customer" className="h-9 min-w-0 flex-1 rounded-full border border-line px-3 text-sm" />
      <Button size="sm" disabled={badAmount} loading={m.isPending && m.variables} onClick={() => m.mutate(true)}>Approve</Button>
      <Button size="sm" variant="outline" loading={m.isPending && !m.variables} onClick={() => m.mutate(false)}>Reject</Button>
      {badAmount && <p className="w-full text-xs font-semibold text-tomato-500">Refund must be between ₹0.01 and {formatINR(max * 100)}.</p>}
      {m.error && <p className="w-full text-xs font-semibold text-tomato-500">{(m.error as Error).message}</p>}
    </div>
  );
}

export default function Returns() {
  const [status, setStatus] = useState('PENDING');
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'returns', status], queryFn: () => adminApi.returns(status || undefined), refetchInterval: 60_000 });
  return (
    <>
      <PageHeader
        title="Returns"
        actions={
          <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-full border border-line bg-white px-4 text-sm font-bold">
            <option value="PENDING">Waiting</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="">All</option>
          </select>
        }
      />
      {isLoading && <div className="skeleton h-40 rounded-3xl" />}
      <div className="space-y-3">
        {data?.map((r) => (
          <Card key={r.id}>
            <p className="text-sm"><span className="font-bold">{r.orderNumber}</span> · {r.customer?.name} · {formatINR(r.orderTotal ?? 0)} · {formatDate(r.createdAt)}</p>
            <p className="mt-1">{r.reason}</p>
            {r.status === 'PENDING' ? (
              <ReturnDecision r={r} />
            ) : (
              <p className="mt-2 text-sm text-charcoal-700">
                {r.status === 'APPROVED' ? `Approved: ${formatINR(r.refundAmount ?? 0)} ${r.refundMethod ? REFUND_METHOD_LABELS[r.refundMethod].toLowerCase() : ''}` : 'Rejected'}
                {r.adminNote && ` · “${r.adminNote}”`}
              </p>
            )}
          </Card>
        ))}
        {data?.length === 0 && <p className="rounded-3xl border border-line bg-white p-8 text-center text-charcoal-500">No return requests here.</p>}
      </div>
    </>
  );
}
