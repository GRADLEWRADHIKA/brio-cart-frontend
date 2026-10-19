import { useQuery } from '@tanstack/react-query';
import { formatINR, REFUND_METHOD_LABELS } from '@shared/core';
import { accountApi } from '@/api/endpoints';
import { cn, formatDate } from '@/utils';

const REASONS: Record<string, string> = { REFUND: 'Refund', ORDER_PAYMENT: 'Used on order', ORDER_CANCELLED: 'Order cancelled, credit returned' };

/** Store credit balance with its ledger, and the customer's return requests. */
export function CreditTab() {
  const wallet = useQuery({ queryKey: ['account', 'wallet'], queryFn: accountApi.wallet });
  const returns = useQuery({ queryKey: ['account', 'returns'], queryFn: accountApi.returns });
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-[1.75rem] border border-line bg-white p-5 sm:p-7">
        <h2 className="font-display text-2xl font-semibold text-forest-900">Store credit</h2>
        <p className="mt-2 font-display text-4xl font-semibold tabular-nums">{formatINR(wallet.data?.balance ?? 0)}</p>
        <p className="text-sm text-charcoal-500">Use it at checkout on your next order.</p>
        <ol className="mt-4 divide-y divide-line">
          {wallet.data?.entries.map((e) => (
            <li key={e.id} className="flex justify-between gap-3 py-2 text-sm">
              <span>{REASONS[e.reason] ?? e.reason}{e.orderNumber && ` · ${e.orderNumber}`}<span className="block text-xs text-charcoal-500">{formatDate(e.createdAt)}</span></span>
              <span className={cn('font-bold tabular-nums', e.delta < 0 ? 'text-tomato-500' : 'text-leaf-600')}>{e.delta < 0 ? `− ${formatINR(-e.delta)}` : `+ ${formatINR(e.delta)}`}</span>
            </li>
          ))}
          {wallet.data?.entries.length === 0 && <li className="py-3 text-sm text-charcoal-500">No store credit yet.</li>}
        </ol>
      </section>
      <section className="rounded-[1.75rem] border border-line bg-white p-5 sm:p-7">
        <h2 className="font-display text-2xl font-semibold text-forest-900">Returns</h2>
        <ol className="mt-3 divide-y divide-line">
          {returns.data?.map((r) => (
            <li key={r.id} className="py-3 text-sm">
              <span className="font-bold">{r.orderNumber}</span> · {r.status === 'PENDING' ? 'Waiting for the store' : r.status === 'APPROVED' ? 'Approved' : 'Not approved'}
              {r.status === 'APPROVED' && r.refundAmount != null && r.refundMethod && <span> · {formatINR(r.refundAmount)} {REFUND_METHOD_LABELS[r.refundMethod].toLowerCase()}</span>}
              <span className="block text-charcoal-500">{r.reason}</span>
              {r.adminNote && <span className="block text-xs text-charcoal-500">Store: {r.adminNote}</span>}
            </li>
          ))}
          {returns.data?.length === 0 && <li className="py-3 text-sm text-charcoal-500">You haven't requested any returns. Open a delivered order to request one.</li>}
        </ol>
      </section>
    </div>
  );
}
