import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { formatINR, SHOP_PAYOUT_METHOD_LABELS, SHOP_PAYOUT_METHODS, type ShopPayoutMethod } from '@shared/core';
import { adminApi } from '@/api/admin';
import { usePermission } from '@/auth/guards';
import { Card, PageHeader, Stat, Toggle, td, th } from '@/components/admin/kit';
import { Button } from '@/components/ui/Button';
import { cn, formatDate } from '@/utils';

/** Shops page: every shop selling on Brio Cart, or one shop's details. */
export default function Shops() {
  const { id } = useParams();
  return id ? <ShopDetail id={id} /> : <ShopList />;
}

function ShopList() {
  const { data, isLoading, error } = useQuery({ queryKey: ['admin', 'shops'], queryFn: adminApi.shops });
  return (
    <>
      <PageHeader
        title="Shops"
        subtitle="Local shops sign up and sell without approval. They accept and prepare their own orders; you can view them, step in on their products, record payouts and (super admin) suspend a shop or set its commission."
      />
      {error && <p className="mb-4 text-sm font-semibold text-tomato-500">{(error as Error).message}</p>}
      <Card className="overflow-hidden p-0 sm:p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="border-b border-line bg-ivory-50">
              <tr>
                <th className={th}>Shop</th>
                <th className={th}>Owner</th>
                <th className={th}>Products</th>
                <th className={th}>Waiting</th>
                <th className={th}>Delivered</th>
                <th className={th}>Owed to shop</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="p-6"><div className="skeleton h-10 rounded-xl" /></td>
                </tr>
              )}
              {data?.map((s) => (
                <tr key={s.id} className="hover:bg-ivory-50">
                  <td className={td}>
                    <Link to={`/admin/shops/${s.id}`} className="font-bold text-forest-700 hover:underline">{s.name}</Link>
                    <p className="text-xs text-charcoal-500">{s.area?.name ?? s.address}</p>
                  </td>
                  <td className={td}>{s.owner.name}<p className="text-xs text-charcoal-500">{s.owner.phone}</p></td>
                  <td className={`${td} tabular-nums`}>{s.productCount}</td>
                  <td className={cn(td, 'tabular-nums', s.pendingOrders && 'font-bold text-[#8a5a00]')}>{s.pendingOrders}</td>
                  <td className={`${td} tabular-nums`}>{s.deliveredOrders}</td>
                  <td className={`${td} font-bold tabular-nums`}>{formatINR(s.balance ?? 0)}</td>
                  <td className={td}>
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-extrabold', !s.isActive ? 'bg-tomato-100 text-tomato-500' : s.isOpen ? 'bg-mint-100 text-forest-800' : 'bg-ivory-200 text-charcoal-500')}>
                      {!s.isActive ? 'Suspended' : s.isOpen ? 'Open' : 'Closed'}
                    </span>
                  </td>
                </tr>
              ))}
              {data && data.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-charcoal-500">No shops yet. Shopkeepers sign up at /seller/register.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function ShopDetail({ id }: { id: string }) {
  const qc = useQueryClient();
  const canConfigure = usePermission('shop:configure');
  const canPay = usePermission('shop:payout');
  const canEditProducts = usePermission('product:update');
  const { data, isLoading, error } = useQuery({ queryKey: ['admin', 'shop', id], queryFn: () => adminApi.shop(id) });
  const [commission, setCommission] = useState<string | null>(null);
  const [payout, setPayout] = useState<{ amount: string; method: ShopPayoutMethod; reference: string; note: string }>({ amount: '', method: 'UPI', reference: '', note: '' });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'shop', id] });
    void qc.invalidateQueries({ queryKey: ['admin', 'shops'] });
  };
  const update = useMutation({ mutationFn: (d: { isActive?: boolean; commissionPercent?: number | null }) => adminApi.updateShop(id, d), onSuccess: () => { setCommission(null); refresh(); } });
  const pay = useMutation({
    mutationFn: () => adminApi.recordShopPayout(id, { amount: Number(payout.amount), method: payout.method, reference: payout.reference || undefined, note: payout.note || undefined }),
    onSuccess: () => {
      setPayout({ amount: '', method: payout.method, reference: '', note: '' });
      refresh();
    },
  });

  if (isLoading) return <div className="skeleton h-80 rounded-3xl" />;
  if (error || !data) return <p className="text-tomato-500">{(error as Error)?.message ?? 'Not found'}</p>;
  const { shop, products, earnings } = data;
  const t = earnings.totals;

  return (
    <>
      <Link to="/admin/shops" className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-forest-700"><ArrowLeft className="size-4" /> Shops</Link>
      <PageHeader
        title={shop.name}
        subtitle={<>Joined {formatDate(shop.createdAt, false)} · {shop.address}{shop.area ? `, ${shop.area.name}` : ''} · <a href={`/shops/${shop.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">shop page <ExternalLink className="size-3" /></a></>}
        actions={
          <Link to={`/admin/orders?shop=${shop.id}`} className="inline-flex h-10 items-center rounded-full border border-line bg-white px-4 text-sm font-bold hover:border-forest-700">
            View its orders
          </Link>
        }
      />
      {!shop.isActive && <p className="mb-4 rounded-2xl bg-tomato-100 p-3 text-sm font-semibold text-tomato-500">Suspended: its products are hidden and it can’t take orders.</p>}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat tone="lime" label="Owed to shop" value={formatINR(t.balance)} hint="Earned minus paid" />
        <Stat label="Shop earned" value={formatINR(t.earned)} hint={`${t.deliveredOrders} delivered`} />
        <Stat label="Paid to shop" value={formatINR(t.paid)} />
        <Stat label="Commission kept" value={formatINR(t.commission)} hint={`${shop.commissionPercent}%${shop.hasOwnCommission ? ' (own rate)' : ' (store default)'}`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card
            title={`Products (${products.length})`}
            className="overflow-x-auto"
            actions={
              <Link to={`/admin/shops/${shop.id}/products`} className="inline-flex h-9 items-center rounded-full border border-line bg-white px-4 text-sm font-bold hover:border-forest-700">
                Manage products
              </Link>
            }
          >
            <p className="mb-3 text-sm text-charcoal-500">
              Products belong to the shop. You can step in: {canEditProducts ? 'edit, hide, delete or add them' : 'hide them, or fix their price and stock'}. The shop is told about every change.
            </p>
            <table className="w-full min-w-[30rem] text-sm">
              <thead><tr><th className={th}>Product</th><th className={th}>Category</th><th className={th}>From</th><th className={th}>Listed</th></tr></thead>
              <tbody className="divide-y divide-line">
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className={td}><a href={`/product/${p.slug}`} target="_blank" rel="noreferrer" className="font-bold hover:underline">{p.name}</a></td>
                    <td className={td}>{p.category.name}</td>
                    <td className={`${td} tabular-nums`}>{p.fromPrice !== null ? formatINR(p.fromPrice) : '—'}</td>
                    <td className={td}>{p.staffHidden ? 'Hidden by Brio Cart' : p.isActive ? (p.inStock ? 'In stock' : 'Out of stock') : 'Hidden'}</td>
                  </tr>
                ))}
                {products.length === 0 && <tr><td className={td} colSpan={4}>No products yet.</td></tr>}
              </tbody>
            </table>
          </Card>
          <Card title="Payouts" className="overflow-x-auto">
            <table className="w-full min-w-[30rem] text-sm">
              <thead><tr><th className={th}>Date</th><th className={th}>Amount</th><th className={th}>How</th><th className={th}>Reference</th><th className={th}>By</th></tr></thead>
              <tbody className="divide-y divide-line">
                {earnings.payouts.map((p) => (
                  <tr key={p.id}>
                    <td className={td}>{formatDate(p.paidAt)}</td>
                    <td className={`${td} font-bold tabular-nums`}>{formatINR(p.amount)}</td>
                    <td className={td}>{SHOP_PAYOUT_METHOD_LABELS[p.method] ?? p.method}</td>
                    <td className={td}>{p.reference ?? '—'}{p.note && <p className="text-xs text-charcoal-500">{p.note}</p>}</td>
                    <td className={td}>{p.recordedBy}</td>
                  </tr>
                ))}
                {earnings.payouts.length === 0 && <tr><td className={td} colSpan={5}>No payouts recorded yet.</td></tr>}
              </tbody>
            </table>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Owner">
            <p className="font-bold">{shop.owner.name}</p>
            <p className="text-sm">+91 {shop.owner.phone}</p>
            {shop.owner.email && <p className="text-sm">{shop.owner.email}</p>}
            <p className="mt-2 text-sm text-charcoal-500">Shop phone: +91 {shop.phone}</p>
          </Card>
          {canPay && (
            <Card title="Record a payout">
              <p className="mb-3 text-xs text-charcoal-500">Pay the shop outside the app (cash, bank or UPI), then record it here. The shop is notified.</p>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  pay.mutate();
                }}
              >
                <label className="block text-sm font-bold">
                  Amount (₹)
                  <input type="number" min="1" step="0.01" value={payout.amount} onChange={(e) => setPayout({ ...payout, amount: e.target.value })} className="mt-1 h-11 w-full rounded-2xl border border-line px-3" />
                </label>
                <label className="block text-sm font-bold">
                  Paid by
                  <select value={payout.method} onChange={(e) => setPayout({ ...payout, method: e.target.value as ShopPayoutMethod })} className="mt-1 h-11 w-full rounded-2xl border border-line bg-white px-3">
                    {SHOP_PAYOUT_METHODS.map((m) => <option key={m} value={m}>{SHOP_PAYOUT_METHOD_LABELS[m]}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-bold">
                  Reference <span className="font-normal text-charcoal-500">(optional)</span>
                  <input value={payout.reference} maxLength={80} onChange={(e) => setPayout({ ...payout, reference: e.target.value })} placeholder="UPI or bank reference" className="mt-1 h-11 w-full rounded-2xl border border-line px-3" />
                </label>
                <label className="block text-sm font-bold">
                  Note <span className="font-normal text-charcoal-500">(optional)</span>
                  <input value={payout.note} maxLength={200} onChange={(e) => setPayout({ ...payout, note: e.target.value })} className="mt-1 h-11 w-full rounded-2xl border border-line px-3" />
                </label>
                <Button type="submit" block loading={pay.isPending} disabled={!(Number(payout.amount) > 0)}>Record payout</Button>
                {pay.error && <p className="text-sm font-semibold text-tomato-500">{(pay.error as Error).message}</p>}
              </form>
            </Card>
          )}
          {canConfigure && (
            <Card title="Shop controls">
              <label className="flex items-center gap-3 text-sm font-bold">
                <Toggle
                  checked={shop.isActive}
                  label={`${shop.name} active`}
                  disabled={update.isPending}
                  onChange={(v) => (v || window.confirm(`Suspend ${shop.name}? Its products are hidden and it can’t take new orders.`)) && update.mutate({ isActive: v })}
                />
                {shop.isActive ? 'Active' : 'Suspended'}
              </label>
              <div className="mt-4">
                <label className="block text-sm font-bold" htmlFor="commission">Commission (%)</label>
                <div className="mt-1 flex gap-2">
                  <input
                    id="commission"
                    type="number"
                    min={0}
                    max={50}
                    step="0.5"
                    value={commission ?? String(shop.commissionPercent)}
                    onChange={(e) => setCommission(e.target.value)}
                    className="h-10 w-24 rounded-2xl border border-line px-3"
                  />
                  <Button size="sm" variant="secondary" loading={update.isPending} disabled={commission === null} onClick={() => update.mutate({ commissionPercent: Number(commission) })}>Save</Button>
                  {shop.hasOwnCommission && (
                    <Button size="sm" variant="ghost" onClick={() => update.mutate({ commissionPercent: null })}>Use default</Button>
                  )}
                </div>
                <p className="mt-1 text-xs text-charcoal-500">Applies to new orders. Past orders keep the rate they were placed at.</p>
              </div>
              {update.error && <p className="mt-2 text-sm font-semibold text-tomato-500">{(update.error as Error).message}</p>}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
