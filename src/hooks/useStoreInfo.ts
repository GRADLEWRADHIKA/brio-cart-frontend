import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/api/endpoints';
import type { DeliveryRules } from '@shared/core';
import { BRAND } from '@/config/env';

export function useStoreInfo() {
  return useQuery({ queryKey: ['store'], queryFn: catalogApi.store, staleTime: 60_000 });
}

/** Delivery rules from the server; falls back to published defaults while loading. */
export function useDeliveryRules(): DeliveryRules {
  const { data } = useStoreInfo();
  return data
    ? {
        deliveryFee: data.settings.deliveryFee,
        freeDeliveryThreshold: data.settings.freeDeliveryThreshold,
        minOrderAmount: data.settings.minOrderAmount,
      }
    : { deliveryFee: 3000, freeDeliveryThreshold: 14900, minOrderAmount: 0 };
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
