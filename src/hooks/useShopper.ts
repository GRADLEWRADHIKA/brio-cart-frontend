import { useMemo } from 'react';
import { availabilityAt, LOCAL_CITY, unavailableMessage, type Section, type ShopperLocation } from '@shared/core';
import { usePrefs } from '@/store/prefs';
import { useStoreInfo } from '@/hooks/useStoreInfo';
import type { Product } from '@/types';

/**
 * The shopper's delivery location, from the location picker: one of Brio Cart's Lucknow delivery areas
 * (rider delivery), or any other Indian PIN code (courier). Null until they choose.
 */
export function useShopperLocation() {
  const { data } = useStoreInfo();
  const areaId = usePrefs((s) => s.areaId);
  const courier = usePrefs((s) => s.courier);
  return useMemo(() => {
    const eta = data?.settings.eta ?? { local: 'Next morning', city: '1–3 days', india: 'Within 7 days' };
    const area = areaId ? data?.areas.find((a) => a.id === areaId) : undefined;
    if (area) {
      const location: ShopperLocation = { kind: 'AREA', areaId: area.id };
      return { location, isLocal: true, label: area.name, place: area.name, eta: eta.local, params: { area: area.id } };
    }
    if (courier) {
      const location: ShopperLocation = { kind: 'COURIER', state: courier.state, inCity: courier.inCity };
      const place = courier.city ?? courier.stateName ?? courier.pincode;
      return { location, isLocal: false, label: `${place} ${courier.pincode}`, place, eta: courier.inCity ? eta.city : eta.india, params: { ship: courier.state } };
    }
    return { location: null, isLocal: true, label: LOCAL_CITY, place: LOCAL_CITY, eta: eta.local, params: {} as { area?: string; ship?: string } };
  }, [data, areaId, courier]);
}

/** Can this product reach the shopper? With a short reason when it can't. */
export function useProductReach(p: Pick<Product, 'delivery' | 'section'> | null | undefined) {
  const { location, place } = useShopperLocation();
  if (!p?.delivery) return { ok: true as const, message: null };
  const r = availabilityAt(p.delivery, location);
  return r.ok ? { ok: true as const, message: null } : { ok: false as const, message: unavailableMessage(r.reason, (p.section ?? 'GROCERY') as Section, place) };
}

/** First-visit answers as listing parameters (empty when not answered). */
export function usePreferenceParams() {
  const a = usePrefs((s) => s.answers);
  return useMemo(() => {
    if (!a) return {};
    const list = (v?: string[]) => (v && v.length ? v.join(',') : undefined);
    return { age: a.ageGroup ?? undefined, taste: list(a.tastes), health: list(a.health?.filter((h) => h !== 'NONE')), interest: list(a.interests) };
  }, [a]);
}
