import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatINR } from '@shared/core';
import { adminApi } from '@/api/admin';
import { Card, PageHeader, Stat, td, th } from '@/components/admin/kit';
import { cn } from '@/utils';
import { Bars } from './Analytics';

const DAY_MS = 86_400_000;
/** Today's date in India time as YYYY-MM-DD, whatever the device's timezone. */
const todayIST = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
const shift = (day: string, by: number) => new Date(new Date(`${day}T00:00:00Z`).getTime() + by * DAY_MS).toISOString().slice(0, 10);
const label = (day: string, opts: Intl.DateTimeFormatOptions) => new Date(`${day}T00:00:00Z`).toLocaleDateString('en-IN', { ...opts, timeZone: 'UTC' });

/** "+12% vs 21 Oct" style comparison with the previous day. */
function Change({ now, before, day }: { now: number; before: number; day: string }) {
  const d = label(day, { day: 'numeric', month: 'short' });
  const vs = `vs ${d}`;
  if (before === 0) return <span className="text-charcoal-500">{now === 0 ? `Same as ${d}` : `None on ${d}`}</span>;
  const pct = Math.round(((now - before) / before) * 100);
  return (
    <span className={cn('font-bold', pct > 0 ? 'text-leaf-700' : pct < 0 ? 'text-tomato-500' : 'text-charcoal-500')}>
      {pct > 0 ? '+' : ''}
      {pct}% <span className="font-normal text-charcoal-500">{vs}</span>
    </span>
  );
}

export default function DailySummary() {
  const today = todayIST();
  const [day, setDay] = useState(today);
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['admin', 'reports', 'daily', day],
    queryFn: () => adminApi.dailySummary(day),
    placeholderData: keepPreviousData,
    refetchInterval: day === today ? 60_000 : false,
  });
  const navBtn = 'inline-flex size-10 items-center justify-center rounded-full border border-line bg-white hover:border-forest-700 disabled:opacity-40';
  return (
    <>
      <PageHeader
        title="Daily summary"
        subtitle={day === today ? 'Today so far, in India time. Updates every minute.' : 'One day of sales in India time, compared with the day before.'}
        actions={
          <div className="flex items-center gap-2 text-sm font-bold">
            <button type="button" className={navBtn} aria-label="Previous day" onClick={() => setDay(shift(day, -1))}>
              <ChevronLeft className="size-4" />
            </button>
            <input type="date" aria-label="Day" value={day} max={today} onChange={(e) => e.target.value && setDay(e.target.value)} className="h-10 rounded-full border border-line px-3" />
            <button type="button" className={navBtn} aria-label="Next day" disabled={day >= today} onClick={() => setDay(shift(day, 1))}>
              <ChevronRight className="size-4" />
            </button>
            {day !== today && (
              <button type="button" onClick={() => setDay(today)} className="h-10 rounded-full px-3 text-forest-700 hover:underline">
                Today
              </button>
            )}
          </div>
        }
      />
      {error && <p className="mb-4 text-sm font-semibold text-tomato-500">{(error as Error).message}</p>}
      {isLoading && <div className="skeleton h-40 rounded-3xl" />}
      {data && (
        <div className={cn('space-y-4 transition-opacity', isFetching && data.day !== day && 'opacity-60')}>
          <h2 className="font-display text-xl font-semibold text-forest-900">{label(data.day, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-3xl bg-forest-800 p-5 text-ivory-50">
              <p className="text-xs font-extrabold uppercase tracking-wider text-lime-300">Sales</p>
              <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{formatINR(data.sales)}</p>
              <p className="mt-1 text-xs text-ivory-50/80 [&_*]:!text-inherit">
                <Change now={data.sales} before={data.previous.sales} day={data.previous.day} />
              </p>
            </div>
            <div className="rounded-3xl border border-line bg-white p-5">
              <p className="text-xs font-extrabold uppercase tracking-wider text-charcoal-500">Orders</p>
              <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{data.orders}</p>
              <p className="mt-1 text-xs"><Change now={data.orders} before={data.previous.orders} day={data.previous.day} /></p>
            </div>
            <Stat label="Average order" value={formatINR(data.averageOrderValue)} hint={`${formatINR(data.previous.averageOrderValue)} the day before`} />
            <Stat label="Cancelled" value={data.cancelled} tone={data.cancelled ? 'warn' : 'default'} hint={`${data.previous.cancelled} the day before`} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Items sold" value={data.itemsSold} />
            <Stat label="Delivered" value={data.delivered} hint="Of this day’s orders" />
            <Stat label="Cash on delivery" value={formatINR(data.cashOnDelivery)} hint="To collect at the door" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Top products">
              <Bars rows={data.topProducts.map((p) => ({ label: `${p.name} ×${p.quantity}`, value: p.sales }))} format={formatINR} />
            </Card>
            <Card title="Sales by area">
              <Bars rows={data.byArea.map((a) => ({ label: `${a.area} (${a.orders})`, value: a.sales }))} format={formatINR} />
            </Card>
          </div>
          <Card title="Last 7 days" className="overflow-x-auto">
            <table className="w-full min-w-[24rem] text-sm">
              <thead>
                <tr>
                  <th className={th}>Day</th>
                  <th className={th}>Orders</th>
                  <th className={th}>Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...data.lastSevenDays].reverse().map((d) => (
                  <tr key={d.day} className={cn(d.day === data.day && 'bg-mint-50')}>
                    <td className={td}>
                      <button type="button" onClick={() => setDay(d.day)} className="font-semibold text-forest-700 hover:underline">
                        {label(d.day, { weekday: 'short', day: 'numeric', month: 'short' })}
                      </button>
                    </td>
                    <td className={`${td} tabular-nums`}>{d.orders}</td>
                    <td className={`${td} font-bold tabular-nums`}>{formatINR(d.sales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </>
  );
}
