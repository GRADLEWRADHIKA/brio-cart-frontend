import { formatINR } from '@shared/core';
import type { RiderCash } from '@/types';
import { cn, formatDate } from '@/utils';

/** Totals plus the merged list of cash collections (+) and hand-overs (−), newest first. */
export function CashLedger({ data, action }: { data: RiderCash; action?: (id: string) => React.ReactNode }) {
  const rows = [
    ...data.orders.map((o) => ({ key: `o-${o.id}`, at: o.deliveredAt ?? '', label: `Collected · ${o.orderNumber}`, amount: o.cashCollected, note: o.cashDifferenceReason ? `Total ${formatINR(o.total)} · ${o.cashDifferenceReason}` : null, pending: false, id: null as string | null })),
    ...data.settlements.map((s) => ({ key: `s-${s.id}`, at: s.createdAt, label: s.status === 'PENDING' ? 'Handed in · awaiting confirmation' : 'Handed in · received', amount: -s.amount, note: s.note, pending: s.status === 'PENDING', id: s.id })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const s = data.summary;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Collected', s.collected],
          ['Handed in', s.handedIn],
          ['Awaiting confirmation', s.pending],
          ['Balance owed', s.balance],
        ].map(([label, v]) => (
          <div key={label as string} className={cn('rounded-2xl p-4', label === 'Balance owed' ? 'bg-forest-800 text-ivory-50' : 'border border-line bg-white')}>
            <p className="text-[0.68rem] font-extrabold uppercase tracking-wider opacity-70">{label}</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{formatINR(v as number)}</p>
          </div>
        ))}
      </div>
      <ol className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span className="min-w-0">
              <span className="block font-bold">{r.label}</span>
              <span className="block text-xs text-charcoal-500">{r.at ? formatDate(r.at) : ''}{r.note ? ` · ${r.note}` : ''}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className={cn('font-bold tabular-nums', r.amount < 0 ? 'text-forest-700' : 'text-charcoal-900', r.pending && 'opacity-60')}>
                {r.amount < 0 ? `− ${formatINR(-r.amount)}` : `+ ${formatINR(r.amount)}`}
              </span>
              {r.pending && r.id && action?.(r.id)}
            </span>
          </li>
        ))}
        {rows.length === 0 && <li className="p-6 text-center text-sm text-charcoal-500">No cash recorded yet.</li>}
      </ol>
    </>
  );
}
