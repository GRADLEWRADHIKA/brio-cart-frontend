import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatINR } from '@shared/core';
import { riderApi } from '@/api/endpoints';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/misc';
import { CashLedger } from '@/components/cash/CashLedger';

/** Rider: cash collected at the door, what has been handed in, and what is still owed. */
export function CashTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['rider', 'cash'], queryFn: riderApi.cash, refetchInterval: 60_000 });
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const handover = useMutation({
    mutationFn: () => riderApi.handover(Number(amount), note.trim() || undefined),
    onSuccess: () => {
      setAmount('');
      setNote('');
      void qc.invalidateQueries({ queryKey: ['rider', 'cash'] });
    },
  });
  if (isLoading || !data) return <div className="grid place-items-center py-16"><Spinner /></div>;
  const declarable = data.summary.balance - data.summary.pending;
  const n = Number(amount);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">Cash in hand</h1>
      <CashLedger data={data} />
      {declarable > 0 && (
        <form
          className="rounded-[1.5rem] bg-white p-4 shadow-soft"
          onSubmit={(e) => {
            e.preventDefault();
            handover.mutate();
          }}
        >
          <p className="text-sm font-extrabold">I handed cash to the store</p>
          <p className="text-xs text-charcoal-500">Up to {formatINR(declarable)}. The store confirms it when counted.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input inputMode="decimal" aria-label="Amount handed in" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} placeholder="₹" className="h-11 w-28 rounded-xl border border-line px-3" />
            <input aria-label="Note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="h-11 min-w-0 flex-1 rounded-xl border border-line px-3" />
            <Button type="submit" disabled={!(n > 0) || n * 100 > declarable} loading={handover.isPending}>Submit</Button>
          </div>
          {handover.error && <p className="mt-2 text-sm font-semibold text-tomato-500">{(handover.error as Error).message}</p>}
        </form>
      )}
    </div>
  );
}
