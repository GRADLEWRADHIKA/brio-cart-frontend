import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatINR } from '@shared/core';
import { adminApi } from '@/api/admin';
import { Card, PageHeader, td, th } from '@/components/admin/kit';
import { Button } from '@/components/ui/Button';
import { CashLedger } from '@/components/cash/CashLedger';

function RiderLedger({ riderId }: { riderId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin', 'settlements', riderId], queryFn: () => adminApi.riderCash(riderId), refetchInterval: 60_000 });
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const refresh = () => void qc.invalidateQueries({ queryKey: ['admin', 'settlements'] });
  const receive = useMutation({ mutationFn: (id: string) => adminApi.receiveSettlement(id), onSuccess: refresh });
  const record = useMutation({
    mutationFn: () => adminApi.recordSettlement(riderId, Number(amount), note.trim() || undefined),
    onSuccess: () => {
      setAmount('');
      setNote('');
      refresh();
    },
  });
  if (!data) return <div className="skeleton h-32 rounded-2xl" />;
  const open = data.summary.balance - data.summary.pending;
  return (
    <div className="mt-4">
      <CashLedger
        data={data}
        action={(id) => (
          <Button size="sm" loading={receive.isPending && receive.variables === id} onClick={() => receive.mutate(id)}>Mark received</Button>
        )}
      />
      {open > 0 && (
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); record.mutate(); }}>
          <input inputMode="decimal" aria-label="Amount received" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} placeholder={`₹ up to ${open / 100}`} className="h-9 w-36 rounded-full border border-line px-3 text-sm" />
          <input aria-label="Note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="h-9 min-w-0 flex-1 rounded-full border border-line px-3 text-sm" />
          <Button size="sm" type="submit" disabled={!(Number(amount) > 0) || Number(amount) * 100 > open} loading={record.isPending}>Record cash received</Button>
        </form>
      )}
      {(record.error || receive.error) && <p className="mt-2 text-sm font-semibold text-tomato-500">{((record.error ?? receive.error) as Error).message}</p>}
    </div>
  );
}

/** Per-rider cash collected, handed in and owed, with the settlement ledger. */
export default function Settlements() {
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'settlements'], queryFn: adminApi.settlements, refetchInterval: 60_000 });
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <PageHeader title="Rider cash" subtitle="Cash on delivery collected by riders and handed in to the store" />
      {isLoading && <div className="skeleton h-40 rounded-3xl" />}
      <Card className="overflow-x-auto p-0 sm:p-0">
        <table className="w-full min-w-[40rem] text-sm">
          <thead><tr><th className={th}>Rider</th><th className={th}>Collected</th><th className={th}>Handed in</th><th className={th}>Awaiting</th><th className={th}>Owed</th><th className={th} /></tr></thead>
          <tbody className="divide-y divide-line">
            {data?.map((r) => (
              <tr key={r.id}>
                <td className={td}><span className="font-bold">{r.name}</span><span className="block text-xs text-charcoal-500">+91 {r.phone}</span></td>
                <td className={`${td} tabular-nums`}>{formatINR(r.collected)}</td>
                <td className={`${td} tabular-nums`}>{formatINR(r.handedIn)}</td>
                <td className={`${td} tabular-nums`}>{formatINR(r.pending)}</td>
                <td className={`${td} font-bold tabular-nums`}>{formatINR(r.balance)}</td>
                <td className={td}><Button size="sm" variant="outline" onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? 'Close' : 'Ledger'}</Button></td>
              </tr>
            ))}
            {data?.length === 0 && <tr><td className={td} colSpan={6}>No riders yet.</td></tr>}
          </tbody>
        </table>
      </Card>
      {open && (
        <Card className="mt-4" title={`Ledger · ${data?.find((r) => r.id === open)?.name ?? ''}`}>
          <RiderLedger riderId={open} />
        </Card>
      )}
    </>
  );
}
