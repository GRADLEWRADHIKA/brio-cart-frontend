import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { formatINR, ORDER_STATUSES, ORDER_STATUS_LABELS } from '@shared/core';
import { adminApi } from '@/api/admin';
import { Card, PageHeader, Stat, td, th } from '@/components/admin/kit';
import { StatusPill } from '@/components/checkout/OrderStatusTracker';
import { formatDate } from '@/utils';

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({ queryKey: ['admin', 'summary'], queryFn: adminApi.summary, refetchInterval: 30_000 });
  if (error) return <p className="text-tomato-500">{(error as Error).message}</p>;
  const s = data;
  return (
    <>
      <PageHeader title="Good to see you" subtitle="Today’s orders and store health at a glance. Refreshes every 30 seconds." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat tone="lime" label="Orders today" value={isLoading ? '–' : s!.ordersToday} />
        <Stat label="Revenue today" value={isLoading ? '–' : formatINR(s!.revenueToday)} hint="Excludes cancelled orders" />
        <Stat tone={s && s.ordersByStatus.PENDING > 0 ? 'warn' : 'default'} label="Awaiting confirmation" value={isLoading ? '–' : s!.ordersByStatus.PENDING} />
        <Stat label="Unavailable pack sizes" value={isLoading ? '–' : s!.unavailableVariants} hint={s ? `${s.activeProducts} active products` : undefined} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_20rem]">
        <Card title="Recent orders" actions={<Link to="/admin/orders" className="inline-flex items-center gap-1 text-sm font-bold text-forest-700">All orders <ArrowRight className="size-4" /></Link>} className="overflow-hidden p-0 sm:p-0 [&>div:first-child]:px-5 [&>div:first-child]:pt-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="border-b border-line bg-ivory-50">
                <tr>
                  <th className={th}>Order</th>
                  <th className={th}>Customer</th>
                  <th className={th}>Area</th>
                  <th className={th}>Total</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {s?.recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-ivory-50">
                    <td className={td}>
                      <Link to={`/admin/orders/${o.id}`} className="font-mono font-bold text-forest-700 hover:underline">{o.orderNumber}</Link>
                      <p className="text-xs text-charcoal-500">{formatDate(o.createdAt)}</p>
                    </td>
                    <td className={td}>{o.customer.name}<p className="text-xs text-charcoal-500">{o.customer.phone}</p></td>
                    <td className={td}>{o.customer.areaName}</td>
                    <td className={`${td} font-bold tabular-nums`}>{formatINR(o.total)}</td>
                    <td className={td}><StatusPill status={o.status} /></td>
                  </tr>
                ))}
                {s && s.recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-charcoal-500">No orders yet. New orders will appear here.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Orders by status">
          <ul className="space-y-2">
            {ORDER_STATUSES.map((st) => (
              <li key={st}>
                <Link to={`/admin/orders?status=${st}`} className="flex items-center justify-between rounded-2xl px-3 py-2 hover:bg-ivory-50">
                  <span className="font-semibold">{ORDER_STATUS_LABELS[st]}</span>
                  <span className="font-display text-xl font-semibold tabular-nums">{s?.ordersByStatus[st] ?? '–'}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
