import { lazy, Suspense, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bike, ChefHat, Package, Radio, Sparkles } from 'lucide-react';
import { formatINR, ORDER_STATUS_LABELS } from '@shared/core';
import { adminApi } from '@/api/admin';
import type { MapMarker } from '@/components/maps/DeliveryMap';
import { Card, PageHeader, Stat } from '@/components/admin/kit';
import { cn, formatDate } from '@/utils';

const DeliveryMap = lazy(() => import('@/components/maps/DeliveryMap'));

export default function LiveOps() {
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'live'], queryFn: adminApi.live, refetchInterval: 4000 });
  const [focus, setFocus] = useState<string | null>(null);

  const markers = useMemo<MapMarker[]>(() => {
    if (!data) return [];
    const m: MapMarker[] = [{ id: 'store', kind: 'store', position: data.store, label: 'Brio Cart store' }];
    for (const o of data.orders) {
      const t = o.tracking;
      if (!t) continue;
      if (t.destination && (o.status === 'OUT_FOR_DELIVERY' || o.id === focus)) m.push({ id: `home-${o.id}`, kind: 'home', position: t.destination, label: `${o.customer.name} · ${o.customer.areaName}` });
      if (t.location) m.push({ id: `rider-${o.id}`, kind: 'rider', position: t.location, label: `${t.rider?.name ?? 'Rider'} · ${o.orderNumber}${t.source === 'DEMO' ? ' (demo)' : ''}` });
    }
    return m;
  }, [data, focus]);

  const byStatus = (s: string) => data?.orders.filter((o) => o.status === s) ?? [];
  /** Orders each rider is carrying (batched trips show as "2 orders"). */
  const perRider = useMemo(() => {
    const n = new Map<string, number>();
    for (const o of data?.orders ?? []) if (o.rider) n.set(o.rider.id, (n.get(o.rider.id) ?? 0) + 1);
    return n;
  }, [data]);
  const onRoad = byStatus('OUT_FOR_DELIVERY');
  const liveGps = onRoad.filter((o) => o.tracking?.source === 'LIVE').length;

  return (
    <>
      <PageHeader title="Live operations" subtitle="Everything being packed or on the road. Updates every few seconds." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="To pack" value={isLoading ? '–' : byStatus('CONFIRMED').length + byStatus('PREPARING').length} />
        <Stat tone="lime" label="On the road" value={isLoading ? '–' : onRoad.length} />
        <Stat label="Sharing live GPS" value={isLoading ? '–' : liveGps} hint="From riders’ phones" />
        <Stat label="Unassigned" value={isLoading ? '–' : (data?.orders.filter((o) => !o.rider).length ?? 0)} tone={data?.orders.some((o) => !o.rider) ? 'warn' : 'default'} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_24rem]">
        <Card className="overflow-hidden p-0 sm:p-0">
          <Suspense fallback={<div className="skeleton h-[32rem] rounded-none" />}>
            <DeliveryMap className="h-[32rem]" markers={markers} fitKey={markers.filter((x) => x.kind !== "rider").map((x) => x.id).join(",")} />
          </Suspense>
        </Card>
        <Card title="Active orders" className="max-h-[32rem] overflow-y-auto">
          {data?.orders.length === 0 && <p className="text-sm text-charcoal-500">Nothing in progress right now.</p>}
          <ul className="space-y-2">
            {data?.orders.map((o) => {
              const Icon = o.status === 'OUT_FOR_DELIVERY' ? Bike : o.status === 'PREPARING' ? ChefHat : Package;
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setFocus(o.id)}
                    className={cn('w-full rounded-2xl border p-3 text-left transition hover:border-forest-700/40', o.status === 'OUT_FOR_DELIVERY' ? 'border-lime-300 bg-mint-50' : 'border-line')}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 text-forest-700" />
                      <Link to={`/admin/orders/${o.id}`} className="font-mono text-sm font-bold text-forest-700 hover:underline">
                        {o.orderNumber}
                      </Link>
                      <span className="ml-auto text-xs font-bold text-charcoal-500">{ORDER_STATUS_LABELS[o.status]}</span>
                    </div>
                    <p className="mt-1 text-sm">
                      {o.customer.name} · {o.customer.areaName} · {formatINR(o.total)}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-charcoal-500">
                      {o.rider ? (
                        <>
                          Rider: {o.rider.name}
                          {(perRider.get(o.rider.id) ?? 0) > 1 && (
                            <span className="rounded-full bg-lime-300 px-1.5 py-0.5 text-[0.65rem] font-extrabold text-forest-900">{perRider.get(o.rider.id)} orders on this trip</span>
                          )}
                        </>
                      ) : (
                        <span className="font-bold text-[#8a5a00]">No rider assigned</span>
                      )}
                      {o.tracking?.source === 'LIVE' && (
                        <span className="ml-auto inline-flex items-center gap-1 font-bold text-leaf-600">
                          <Radio className="size-3" /> GPS {o.tracking.location && formatDate(o.tracking.location.at).split(', ').pop()}
                        </span>
                      )}
                      {o.tracking?.source === 'DEMO' && (
                        <span className="ml-auto inline-flex items-center gap-1 font-bold text-[#8a5a00]">
                          <Sparkles className="size-3" /> Demo
                        </span>
                      )}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </>
  );
}
