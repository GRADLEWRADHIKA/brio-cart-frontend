import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { formatINR, ORDER_STATUSES, ORDER_STATUS_LABELS } from '@shared/core';
import { adminApi } from '@/api/admin';
import { PageHeader, td, th } from '@/components/admin/kit';
import { StatusPill } from '@/components/checkout/OrderStatusTracker';
import { Button } from '@/components/ui/Button';
import { cn, formatDate } from '@/utils';

export default function Orders() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? undefined;
  const page = Number(params.get('page') ?? 1);
  const [q, setQ] = useState(params.get('q') ?? '');
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'orders', status, params.get('q'), page],
    queryFn: () => adminApi.orders({ status, q: params.get('q') ?? undefined, page }),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
  const set = (patch: Record<string, string | undefined>) => {
    const n = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) n.set(k, v);
      else n.delete(k);
    }
    setParams(n);
  };
  const pill = (active: boolean) => cn('shrink-0 rounded-full px-4 py-2 text-sm font-bold transition', active ? 'bg-forest-800 text-ivory-50' : 'bg-white text-charcoal-700 ring-1 ring-line hover:ring-forest-700/40');

  return (
    <>
      <PageHeader title="Orders" subtitle={data ? `${data.total} order${data.total === 1 ? '' : 's'}${isFetching ? ' · updating…' : ''}` : undefined} />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          <button type="button" className={pill(!status)} onClick={() => set({ status: undefined, page: undefined })}>All</button>
          {ORDER_STATUSES.map((s) => (
            <button key={s} type="button" className={pill(status === s)} onClick={() => set({ status: s, page: undefined })}>
              {ORDER_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <form className="flex flex-1 items-center gap-2 lg:justify-end" onSubmit={(e) => { e.preventDefault(); set({ q: q.trim() || undefined, page: undefined }); }}>
          <label className="flex h-10 w-full items-center gap-2 rounded-full border border-line bg-white px-4 lg:max-w-xs">
            <Search className="size-4 text-charcoal-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order no., phone or name" className="w-full bg-transparent text-sm outline-none" aria-label="Search orders" />
          </label>
        </form>
      </div>
      <div className="overflow-x-auto rounded-3xl border border-line bg-white">
        <table className="w-full min-w-[52rem] text-sm">
          <thead className="border-b border-line bg-ivory-50">
            <tr>
              <th className={th}>Order</th>
              <th className={th}>Customer</th>
              <th className={th}>Area / slot</th>
              <th className={th}>Items</th>
              <th className={th}>Total</th>
              <th className={th}>Payment</th>
              <th className={th}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading && (
              <tr><td colSpan={7} className="p-8"><div className="skeleton h-6" /></td></tr>
            )}
            {data?.items.map((o) => (
              <tr key={o.id} className="hover:bg-ivory-50">
                <td className={td}>
                  <Link to={`/admin/orders/${o.id}`} className="font-mono font-bold text-forest-700 hover:underline">{o.orderNumber}</Link>
                  <p className="text-xs text-charcoal-500">{formatDate(o.createdAt)}</p>
                </td>
                <td className={td}>{o.customer.name}<p className="text-xs text-charcoal-500">{o.customer.phone}</p></td>
                <td className={td}>{o.customer.areaName}<p className="text-xs text-charcoal-500">{o.deliverySlot ?? '—'}</p></td>
                <td className={td}>{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
                <td className={`${td} font-bold tabular-nums`}>{formatINR(o.total)}</td>
                <td className={td}>{o.paymentMethodLabel}<p className={cn('text-xs font-bold', o.paymentStatus === 'PAID' ? 'text-leaf-600' : 'text-charcoal-500')}>{o.paymentStatus}</p></td>
                <td className={td}><StatusPill status={o.status} /></td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr><td colSpan={7} className="p-10 text-center text-charcoal-500">No orders match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => set({ page: String(page - 1) })}>Previous</Button>
          <span className="text-sm font-semibold">Page {page} of {data.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => set({ page: String(page + 1) })}>Next</Button>
        </div>
      )}
    </>
  );
}
