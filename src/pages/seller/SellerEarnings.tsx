import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { formatINR, SHOP_PAYOUT_METHOD_LABELS } from '@shared/core';
import { shopApi } from '@/api/shop';
import { Card, PageHeader, Stat, td, th } from '@/components/admin/kit';
import { formatDate } from '@/utils';

const dayLabel = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

/** What the shop has earned on delivered orders, what Brio Cart has paid, and what is still owed. */
export default function SellerEarnings() {
  const { data, isLoading, error } = useQuery({ queryKey: ['seller', 'earnings'], queryFn: shopApi.earnings });
  if (error) return <p className="text-tomato-500">{(error as Error).message}</p>;
  if (isLoading || !data) return <div className="skeleton h-60 rounded-3xl" />;
  const t = data.totals;
  return (
    <>
      <PageHeader title="Earnings" subtitle={`You earn your item sales minus Brio Cart’s ${data.commissionPercent}% commission, on delivered orders. Brio Cart pays you outside the app and records each payment here.`} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat tone="lime" label="Owed to you" value={formatINR(t.balance)} hint="Earned minus paid" />
        <Stat label="Earned" value={formatINR(t.earned)} hint={`${t.deliveredOrders} delivered order${t.deliveredOrders === 1 ? '' : 's'}`} />
        <Stat label="Paid to you" value={formatINR(t.paid)} />
        <Stat label="Commission" value={formatINR(t.commission)} hint={`On ${formatINR(t.itemsTotal)} of item sales`} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Payments from Brio Cart" className="overflow-x-auto">
          <table className="w-full min-w-[26rem] text-sm">
            <thead><tr><th className={th}>Date</th><th className={th}>Amount</th><th className={th}>How</th><th className={th}>Reference</th></tr></thead>
            <tbody className="divide-y divide-line">
              {data.payouts.map((p) => (
                <tr key={p.id}>
                  <td className={td}>{formatDate(p.paidAt, false)}</td>
                  <td className={`${td} font-bold tabular-nums`}>{formatINR(p.amount)}</td>
                  <td className={td}>{SHOP_PAYOUT_METHOD_LABELS[p.method] ?? p.method}</td>
                  <td className={td}>{p.reference ?? '—'}{p.note && <p className="text-xs text-charcoal-500">{p.note}</p>}</td>
                </tr>
              ))}
              {data.payouts.length === 0 && <tr><td className={td} colSpan={4}>No payments recorded yet.</td></tr>}
            </tbody>
          </table>
        </Card>
        <Card title="Earnings by day (delivered)" className="overflow-x-auto">
          <table className="w-full min-w-[20rem] text-sm">
            <thead><tr><th className={th}>Day</th><th className={th}>Orders</th><th className={th}>Earned</th></tr></thead>
            <tbody className="divide-y divide-line">
              {data.daily.map((d) => (
                <tr key={d.day}>
                  <td className={td}>{dayLabel(d.day)}</td>
                  <td className={`${td} tabular-nums`}>{d.orders}</td>
                  <td className={`${td} font-bold tabular-nums`}>{formatINR(d.net)}</td>
                </tr>
              ))}
              {data.daily.length === 0 && <tr><td className={td} colSpan={3}>No delivered orders yet.</td></tr>}
            </tbody>
          </table>
        </Card>
      </div>
      <Card title="Delivered orders" className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <thead><tr><th className={th}>Order</th><th className={th}>Delivered</th><th className={th}>Items</th><th className={th}>Commission</th><th className={th}>You earn</th></tr></thead>
          <tbody className="divide-y divide-line">
            {data.orders.map((o) => (
              <tr key={o.orderId}>
                <td className={td}><Link to={`/seller/orders/${o.orderId}`} className="font-mono font-bold text-forest-700 hover:underline">{o.orderNumber}</Link></td>
                <td className={td}>{o.deliveredAt ? formatDate(o.deliveredAt) : '—'}</td>
                <td className={`${td} tabular-nums`}>{formatINR(o.itemsTotal)}</td>
                <td className={`${td} tabular-nums text-charcoal-500`}>−{formatINR(o.commission)}</td>
                <td className={`${td} font-bold tabular-nums`}>{formatINR(o.net)}</td>
              </tr>
            ))}
            {data.orders.length === 0 && <tr><td className={td} colSpan={5}>Delivered orders appear here.</td></tr>}
          </tbody>
        </table>
      </Card>
    </>
  );
}
