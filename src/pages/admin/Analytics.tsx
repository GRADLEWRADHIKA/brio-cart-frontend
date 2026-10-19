import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { EXPORT_KINDS, formatINR, hasPermission, type ExportKind } from '@shared/core';
import { adminApi } from '@/api/admin';
import { useAuth } from '@/hooks/useAuth';
import { Card, PageHeader, Stat, td, th } from '@/components/admin/kit';
import { isNative } from '@/config/env';

const EXPORT_LABELS: Record<ExportKind, string> = { orders: 'Orders', products: 'Products', 'stock-movements': 'Stock movements', 'rider-earnings': 'Rider earnings', settlements: 'Settlements' };

/** Horizontal bars scaled to the largest value. Plain CSS, so no chart library is needed. */
export function Bars({ rows, format = String }: { rows: Array<{ label: string; value: number }>; format?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-2 text-xs">
          <span className="truncate text-charcoal-700">{r.label}</span>
          <span className="h-3 rounded-full bg-ivory-100"><span className="block h-3 rounded-full bg-leaf-500" style={{ width: `${(r.value / max) * 100}%` }} /></span>
          <span className="tabular-nums font-bold">{format(r.value)}</span>
        </li>
      ))}
      {rows.length === 0 && <li className="text-sm text-charcoal-500">No data in this range.</li>}
    </ul>
  );
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function Analytics() {
  const { user } = useAuth();
  const [range, setRange] = useState({ from: iso(new Date(Date.now() - 29 * 86_400_000)), to: iso(new Date()) });
  const [by, setBy] = useState<'byDay' | 'byWeek'>('byDay');
  const { data, isLoading, error } = useQuery({ queryKey: ['admin', 'analytics', range], queryFn: () => adminApi.analytics(range), placeholderData: keepPreviousData });
  return (
    <>
      <PageHeader
        title="Analytics"
        actions={
          <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
            <input type="date" aria-label="From" value={range.from} max={range.to} onChange={(e) => setRange({ ...range, from: e.target.value })} className="h-10 rounded-full border border-line px-3" />
            <span>to</span>
            <input type="date" aria-label="To" value={range.to} min={range.from} onChange={(e) => setRange({ ...range, to: e.target.value })} className="h-10 rounded-full border border-line px-3" />
          </div>
        }
      />
      {error && <p className="mb-4 text-sm font-semibold text-tomato-500">{(error as Error).message}</p>}
      {isLoading && <div className="skeleton h-40 rounded-3xl" />}
      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Sales" value={formatINR(data.totalSales)} tone="lime" />
            <Stat label="Orders" value={data.orderCount} />
            <Stat label="Average order" value={formatINR(data.averageOrderValue)} />
            <Stat label="Cancelled" value={data.cancelledCount} tone={data.cancelledCount ? 'warn' : 'default'} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Sales" actions={
              <select aria-label="Group by" value={by} onChange={(e) => setBy(e.target.value as 'byDay' | 'byWeek')} className="h-8 rounded-full border border-line bg-white px-3 text-xs font-bold">
                <option value="byDay">By day</option>
                <option value="byWeek">By week</option>
              </select>
            }>
              <Bars rows={data[by].map((d) => ({ label: by === 'byWeek' ? `Week of ${d.period.slice(5)}` : d.period.slice(5), value: d.sales }))} format={formatINR} />
            </Card>
            <Card title="Peak hours (orders placed)">
              <Bars rows={data.peakHours.filter((h) => h.orders > 0).map((h) => ({ label: `${String(h.hour).padStart(2, '0')}:00`, value: h.orders }))} />
            </Card>
            <Card title="Top products">
              <Bars rows={data.topProducts.map((p) => ({ label: p.name, value: p.sales }))} format={formatINR} />
            </Card>
            <Card title="Cancellation reasons">
              <Bars rows={data.cancellationReasons.map((c) => ({ label: c.reason, value: c.count }))} />
            </Card>
          </div>
          <Card title="Rider performance" className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead><tr><th className={th}>Rider</th><th className={th}>Delivered</th><th className={th}>Attempted</th><th className={th}>Success</th><th className={th}>Rating</th><th className={th}>Payout</th></tr></thead>
              <tbody className="divide-y divide-line">
                {data.riders.map((r) => (
                  <tr key={r.riderId}>
                    <td className={td}>{r.name}</td>
                    <td className={td}>{r.delivered}</td>
                    <td className={td}>{r.attempted}</td>
                    <td className={td}>{r.attempted ? Math.round((r.delivered / r.attempted) * 100) : 0}%</td>
                    <td className={td}>{r.avgRating ? r.avgRating.toFixed(1) : '—'}</td>
                    <td className={td}>{formatINR(r.payout)}</td>
                  </tr>
                ))}
                {data.riders.length === 0 && <tr><td className={td} colSpan={6}>No deliveries in this range.</td></tr>}
              </tbody>
            </table>
          </Card>
          {hasPermission(user?.role, 'export:run') && !isNative && (
            <Card title="Download CSV for this range">
              <div className="flex flex-wrap gap-2">
                {EXPORT_KINDS.map((k) => (
                  <a key={k} href={adminApi.exportUrl(k, range)} download className="inline-flex h-9 items-center rounded-full border border-line px-4 text-sm font-bold hover:border-forest-700">{EXPORT_LABELS[k]}</a>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
