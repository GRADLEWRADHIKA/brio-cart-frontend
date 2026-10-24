import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { formatINR, ORDER_STATUS_LABELS, ORDER_STATUSES, type OrderStatus } from '@shared/core';
import { shopApi } from '@/api/shop';
import { Card, PageHeader, td, th } from '@/components/admin/kit';
import { StatusPill } from '@/components/checkout/OrderStatusTracker';
import { Button } from '@/components/ui/Button';
import { cn, formatDate } from '@/utils';

const pill = (on: boolean) => cn('shrink-0 rounded-full px-4 py-2 text-sm font-bold transition', on ? 'bg-forest-800 text-ivory-50' : 'border border-line bg-white hover:border-forest-700');

export default function SellerOrders() {
  const [params, setParams] = useSearchParams();
  const status = (ORDER_STATUSES as readonly string[]).includes(params.get('status') ?? '') ? (params.get('status') as OrderStatus) : undefined;
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useQuery({
    queryKey: ['seller', 'orders', status, page],
    queryFn: () => shopApi.orders({ status, page }),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
  const choose = (s?: OrderStatus) => {
    setPage(1);
    setParams(s ? { status: s } : {});
  };

  return (
    <>
      <PageHeader title="Orders" subtitle="Accept new orders, prepare them, and mark them ready for the rider. Refreshes every 30 seconds." />
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        <button type="button" className={pill(!status)} onClick={() => choose()}>All</button>
        {ORDER_STATUSES.map((s) => (
          <button key={s} type="button" className={pill(status === s)} onClick={() => choose(s)}>
            {s === 'PENDING' ? 'To accept' : ORDER_STATUS_LABELS[s]}
          </button>
        ))}
      </div>
      {error && <p className="mb-4 text-sm font-semibold text-tomato-500">{(error as Error).message}</p>}
      <Card className="overflow-hidden p-0 sm:p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="border-b border-line bg-ivory-50">
              <tr>
                <th className={th}>Order</th>
                <th className={th}>Area</th>
                <th className={th}>Items</th>
                <th className={th}>Your earnings</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="p-6"><div className="skeleton h-10 rounded-xl" /></td>
                </tr>
              )}
              {data?.items.map((o) => (
                <tr key={o.id} className={cn('hover:bg-ivory-50', o.status === 'PENDING' && 'bg-turmeric-100/40')}>
                  <td className={td}>
                    <Link to={`/seller/orders/${o.id}`} className="font-mono font-bold text-forest-700 hover:underline">{o.orderNumber}</Link>
                    <p className="text-xs text-charcoal-500">{formatDate(o.createdAt)}</p>
                  </td>
                  <td className={td}>{o.customer.areaName}</td>
                  <td className={td}>
                    {o.items.reduce((n, i) => n + i.quantity, 0)} · <span className="tabular-nums">{formatINR(o.subtotal)}</span>
                  </td>
                  <td className={`${td} font-bold tabular-nums`}>{formatINR(o.earnings.net)}</td>
                  <td className={td}>
                    <StatusPill status={o.status} />
                    {o.readyAt && o.status === 'PREPARING' && <p className="mt-1 text-xs font-bold text-leaf-700">Ready for pickup</p>}
                  </td>
                </tr>
              ))}
              {data && data.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-charcoal-500">No orders here yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span>Page {data.page} of {data.totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </>
  );
}
