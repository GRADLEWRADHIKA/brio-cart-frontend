import { lazy, Suspense, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Crosshair, MapPin } from 'lucide-react';
import { shopApi, type MyShop } from '@/api/shop';
import { useStoreInfo } from '@/hooks/useStoreInfo';
import { Card } from '@/components/admin/kit';
import { Button } from '@/components/ui/Button';
import type { LatLng } from '@/types';

const PinPicker = lazy(() => import('@/components/maps/PinPicker'));

const LUCKNOW: LatLng = { lat: 26.8869, lng: 80.942 };
const same = (a: LatLng | null, b: LatLng | null) => (a && b ? Math.abs(a.lat - b.lat) < 1e-7 && Math.abs(a.lng - b.lng) < 1e-7 : a === b);

/**
 * The shop's exact pickup point. The nearest free rider to it is offered each new order first; without
 * a pin, the centre of the shop's area is used.
 */
export function PickupLocation({ shop }: { shop: MyShop }) {
  const qc = useQueryClient();
  const { data: store } = useStoreInfo();
  const [pin, setPin] = useState<LatLng | null>(shop.location);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  useEffect(() => setPin(shop.location), [shop.location]);

  const area = store?.areas.find((a) => a.id === shop.area?.id);
  const fallback = area?.lat != null && area.lng != null ? { lat: area.lat, lng: area.lng } : LUCKNOW;
  const save = useMutation({ mutationFn: shopApi.setLocation, onSuccess: (s) => qc.setQueryData(['seller', 'me'], s) });

  const useGps = () => {
    if (!('geolocation' in navigator)) return setGpsError('This device has no GPS access.');
    setLocating(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        setPin({ lat: p.coords.latitude, lng: p.coords.longitude });
      },
      (e) => {
        setLocating(false);
        setGpsError(e.code === e.PERMISSION_DENIED ? 'Location permission denied. Tap the map instead.' : e.message);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const dirty = !same(pin, shop.location);
  return (
    <Card title="Pickup location" className="mb-6">
      <p className="text-sm text-charcoal-500">
        Tap the map (or drag the pin) to where riders collect orders. New orders are offered to the nearest free rider first.
        {!shop.location && ' Until you set it, the centre of your area is used.'}
      </p>
      <Suspense fallback={<div className="skeleton mt-3 h-64 rounded-2xl" />}>
        <PinPicker value={pin} fallback={fallback} onChange={setPin} className="mt-3 h-64 rounded-2xl" />
      </Suspense>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" icon={<Crosshair className="size-4" />} loading={locating} onClick={useGps}>
          Use my current location
        </Button>
        <Button type="button" size="sm" icon={<MapPin className="size-4" />} disabled={!pin || !dirty} loading={save.isPending} onClick={() => pin && save.mutate(pin)}>
          Save pickup point
        </Button>
        {shop.location && (
          <Button type="button" size="sm" variant="ghost" disabled={save.isPending} onClick={() => save.mutate(null)}>
            Clear
          </Button>
        )}
        {pin && <span className="font-mono text-xs text-charcoal-500">{pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}</span>}
      </div>
      {gpsError && <p className="mt-2 text-sm font-semibold text-tomato-500">{gpsError}</p>}
      {save.error && <p className="mt-2 text-sm font-semibold text-tomato-500">{(save.error as Error).message}</p>}
      {save.isSuccess && !dirty && <p className="mt-2 text-sm font-semibold text-forest-700" role="status">Saved.</p>}
    </Card>
  );
}
