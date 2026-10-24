import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, PackageX, Star } from 'lucide-react';
import { formatINR } from '@shared/core';
import { shopApi } from '@/api/shop';
import { Card, PageHeader, Stat, Toggle, td, th } from '@/components/admin/kit';
import { StatusPill } from '@/components/checkout/OrderStatusTracker';
import { formatDate } from '@/utils';

export default function SellerDashboard() {
  const qc = useQueryClient();
  const { data: s, isLoading, error } = useQuery({ queryKey: ['seller', 'summary'], queryFn: shopApi.summary, refetchInterval: 30_000 });
  const setOpen = useMutation({
    mutationFn: shopApi.setOpen,
    onSuccess: (shop) => {
      qc.setQueryData(['seller', 'me'], shop);
      void qc.invalidateQueries({ queryKey: ['seller', 'summary'] });
    },
  });
  if (error) return <p className="text-tomato-500">{(error as Error).message}</p>;
  if (isLoading || !s) return <div className="skeleton h-60 rounded-3xl" />;

  return (
    <>
      <PageHeader
        title={s.shop.name}
        subtitle="Your orders and shop at a glance. Refreshes every 30 seconds."
        actions={
          <label className="flex items-center gap-3 rounded-full border border-line bg-white px-4 py-2 text-sm font-bold">
            <Toggle checked={s.shop.isOpen} label="Shop open for orders" disabled={setOpen.isPending} onChange={(v) => setOpen.mutate(v)} />
            {s.shop.isOpen ? 'Open for orders' : 'Closed'}
          </label>
        }
      />
      {!s.shop.isOpen && (
        <p className="mb-4 rounded-2xl bg-turmeric-100 p-3 text-sm font-semibold text-[#6b4500]">Your shop is closed. Customers can see your products but can’t order them until you open again.</p>
      )}
      {s.awaitingDecision > 0 && (
        <Link to="/seller/orders?status=PENDING" className="mb-6 flex items-center justify-between gap-3 rounded-3xl bg-forest-800 p-5 text-ivory-50 hover:bg-forest-700">
          <span>
            <span className="block font-display text-2xl font-semibold">{s.awaitingDecision} new order{s.awaitingDecision === 1 ? '' : 's'} to accept</span>
            <span className="text-sm text-ivory-50/75">Only you can accept or reject them. Unanswered orders are cancelled automatically.</span>
          </span>
          <ArrowRight className="size-6 shrink-0 text-lime-300" />
        </Link>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat tone={s.awaitingDecision ? 'warn' : 'default'} label="Waiting for you" value={s.awaitingDecision} />
        <Stat label="Being prepared" value={s.inProgress} />
        <Stat tone="lime" label="Orders today" value={s.ordersToday} />
        <Stat label="Item sales today" value={formatINR(s.salesToday)} hint="Before commission" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_22rem]">
        <Card
          title="Recent orders"
          actions={<Link to="/seller/orders" className="inline-flex items-center gap-1 text-sm font-bold text-forest-700">All orders <ArrowRight className="size-4" /></Link>}
          className="overflow-hidden p-0 sm:p-0 [&>div:first-child]:px-5 [&>div:first-child]:pt-5"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="border-b border-line bg-ivory-50">
                <tr>
                  <th className={th}>Order</th>
                  <th className={th}>Area</th>
                  <th className={th}>Items</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {s.recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-ivory-50">
                    <td className={td}>
                      <Link to={`/seller/orders/${o.id}`} className="font-mono font-bold text-forest-700 hover:underline">{o.orderNumber}</Link>
                      <p className="text-xs text-charcoal-500">{formatDate(o.createdAt)}</p>
                    </td>
                    <td className={td}>{o.customer.areaName}</td>
                    <td className={`${td} tabular-nums`}>{formatINR(o.subtotal)}</td>
                    <td className={td}><StatusPill status={o.status} /></td>
                  </tr>
                ))}
                {s.recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-charcoal-500">
                      No orders yet. <Link to="/seller/products/new" className="font-bold text-forest-700 underline">Add products</Link> so customers can find you.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="space-y-6">
          <Card title="Customer rating">
            {s.rating ? (
              <p className="flex items-center gap-2 font-display text-3xl font-semibold">
                <Star className="size-6 fill-turmeric-400 text-turmeric-400" aria-hidden /> {s.rating.average.toFixed(1)}
                <span className="font-sans text-sm font-normal text-charcoal-500">from {s.rating.count} rating{s.rating.count === 1 ? '' : 's'}</span>
              </p>
            ) : (
              <p className="text-sm text-charcoal-500">No ratings yet. Customers can rate orders after delivery.</p>
            )}
          </Card>
          <Card title="Low stock">
            {s.lowStock.count === 0 ? (
              <p className="text-sm text-charcoal-500">Nothing at or below {s.lowStock.threshold} units.</p>
            ) : (
              <>
                <ul className="divide-y divide-line text-sm">
                  {s.lowStock.items.map((i) => (
                    <li key={i.variantId} className="flex items-center justify-between gap-3 py-1.5">
                      <span className="truncate">{i.product.name} <span className="text-charcoal-500">· {i.label}</span></span>
                      <span className={i.stockQty === 0 ? 'font-extrabold text-tomato-500' : 'font-bold tabular-nums'}>{i.stockQty === 0 ? 'Sold out' : `${i.stockQty} left`}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/seller/stock" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-forest-700 hover:underline">
                  <PackageX className="size-4" /> Restock
                </Link>
              </>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
