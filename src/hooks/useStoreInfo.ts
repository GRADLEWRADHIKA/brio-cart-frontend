import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePrefs } from '@/store/prefs';
import { catalogApi } from '@/api/endpoints';
import type { DeliveryRules } from '@shared/core';
import { BRAND } from '@/config/env';

export function useStoreInfo() {
  return useQuery({ queryKey: ['store'], queryFn: catalogApi.store, staleTime: 60_000 });
}

/**
 * Delivery rules from the server for the customer's chosen area (an area's own fee rules override the
 * store-wide ones field by field); falls back to published defaults while loading.
 */
export function useDeliveryRules(): DeliveryRules {
  const { data } = useStoreInfo();
  const areaId = usePrefs((s) => s.areaId);
  return useMemo(() => {
    if (!data) return { deliveryFee: 3000, freeDeliveryThreshold: 14900, minOrderAmount: 0 };
    const area = data.areas.find((a) => a.id === areaId);
    return {
      deliveryFee: area?.deliveryFee ?? data.settings.deliveryFee,
      freeDeliveryThreshold: area?.freeDeliveryThreshold ?? data.settings.freeDeliveryThreshold,
      minOrderAmount: area?.minOrderAmount ?? data.settings.minOrderAmount,
    };
  }, [data, areaId]);
}

export function useContact() {
  const { data } = useStoreInfo();
  const whatsapp = data?.settings.whatsappNumber ?? BRAND.whatsapp;
  const phone = data?.settings.supportPhone ?? BRAND.whatsapp;
  return {
    whatsapp,
    phone,
    phoneDisplay: formatPhone(phone),
    email: data?.settings.supportEmail ?? BRAND.email,
  };
}

export function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, '').slice(-10);
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : raw;
}

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories, staleTime: 5 * 60_000 });
}
