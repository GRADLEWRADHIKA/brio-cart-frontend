import type { OrderStatus, ServiceScope, ShopPayoutMethod, StockReason } from '@shared/core';
import { api, request } from './client';
import type { Order } from '@/types';
import type { AdminProduct, DailySummary, LowStockItem, ProductPayload, StockMovementRow } from './admin';

/** The shop as its owner (and store staff) see it. */
export interface MyShop {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  rawImageUrl: string | null;
  address: string;
  phone: string;
  area: { id: string; name: string } | null;
  isOpen: boolean;
  isActive: boolean;
  prepMinutes: number;
  commissionPercent: number;
  hasOwnCommission: boolean;
  /** Document check: only APPROVED shops' products are on the store. */
  verificationStatus: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  verificationNote: string | null;
  /** Where the shop sells: LOCAL, chosen STATES or all of INDIA (outside the city by courier). */
  serviceScope: ServiceScope;
  serviceStates: string[];
  /** Pickup point pinned on the map; riders near it are offered orders first. Null = area centre. */
  location: { lat: number; lng: number } | null;
  /** The shop's own delivery timings, offered to customers alongside the standard slots. */
  deliverySlots: string[];
  createdAt: string;
}

/** An order as the shop sees it: contact details are hidden until the shop accepts. */
export interface ShopOrder extends Order {
  pickupCode: string | null;
  pickupCodeLocked: boolean;
  readyAt: string | null;
  earnings: { itemsTotal: number; commissionPercent: number; commission: number; net: number };
}

export interface ShopSummary {
  shop: MyShop;
  ordersToday: number;
  salesToday: number;
  awaitingDecision: number;
  inProgress: number;
  rating: { average: number; count: number } | null;
  lowStock: { threshold: number; count: number; items: LowStockItem[] };
  recentOrders: ShopOrder[];
}

export interface ShopPayout {
  id: string;
  amount: number;
  method: ShopPayoutMethod;
  reference: string | null;
  note: string | null;
  paidAt: string;
  recordedBy: string;
}

export interface ShopEarnings {
  totals: { deliveredOrders: number; itemsTotal: number; commission: number; earned: number; paid: number; balance: number };
  daily: Array<{ day: string; orders: number; net: number }>;
  orders: Array<{ orderId: string; orderNumber: string; deliveredAt: string | null; itemsTotal: number; commission: number; net: number }>;
  payouts: ShopPayout[];
}

export interface ShopProfilePayload {
  name: string;
  phone: string;
  address: string;
  areaId: string;
  description?: string;
  prepMinutes: number;
  imageUrl?: string | null;
}

export const shopApi = {
  me: () => api.get<{ shop: MyShop }>('/shop/me').then((r) => r.shop),
  saveProfile: (d: ShopProfilePayload) => api.put<{ shop: MyShop }>('/shop/me', d).then((r) => r.shop),
  setSelling: (d: { serviceScope: ServiceScope; serviceStates: string[] }) => api.put<{ shop: MyShop }>('/shop/me/selling', d).then((r) => r.shop),
  setOpen: (isOpen: boolean) => api.patch<{ shop: MyShop }>('/shop/me/open', { isOpen }).then((r) => r.shop),
  setDeliverySlots: (slots: string[]) => api.put<{ shop: MyShop }>('/shop/me/delivery-slots', { slots }).then((r) => r.shop),
  setLocation: (location: { lat: number; lng: number } | null) => api.put<{ shop: MyShop }>('/shop/me/location', { location }).then((r) => r.shop),
  summary: () => api.get<ShopSummary>('/shop/summary'),
  earnings: () => api.get<ShopEarnings & { commissionPercent: number }>('/shop/earnings'),
  dailySummary: (date?: string) => api.get<DailySummary>('/shop/reports/daily', { date }),

  orders: (q: { status?: OrderStatus; q?: string; page?: number }) =>
    api.get<{ items: ShopOrder[]; total: number; page: number; totalPages: number }>('/shop/orders', q),
  order: (id: string) => api.get<{ order: ShopOrder }>(`/shop/orders/${id}`).then((r) => r.order),
  accept: (id: string) => api.post<{ order: ShopOrder }>(`/shop/orders/${id}/accept`).then((r) => r.order),
  reject: (id: string, reason: string) => api.post<{ order: ShopOrder }>(`/shop/orders/${id}/reject`, { reason }).then((r) => r.order),
  preparing: (id: string) => api.post<{ order: ShopOrder }>(`/shop/orders/${id}/preparing`).then((r) => r.order),
  ready: (id: string) => api.post<{ order: ShopOrder }>(`/shop/orders/${id}/ready`).then((r) => r.order),
  newPickupCode: (id: string) => api.post<{ order: ShopOrder }>(`/shop/orders/${id}/pickup-code`).then((r) => r.order),
  newDeliveryCode: (id: string) => api.post<{ order: ShopOrder }>(`/shop/orders/${id}/delivery-code`).then((r) => r.order),

  // Catalogue: same shapes as the store dashboard, scoped to this shop by the server.
  categories: () => api.get<{ items: Array<{ id: string; name: string }> }>('/categories').then((r) => r.items),
  products: (q: { q?: string; category?: string; archived?: string }) => api.get<{ items: AdminProduct[] }>('/shop/products', q).then((r) => r.items),
  product: (id: string) => api.get<{ product: AdminProduct }>(`/shop/products/${id}`).then((r) => r.product),
  createProduct: (p: ProductPayload) => api.post<{ product: AdminProduct }>('/shop/products', p).then((r) => r.product),
  updateProduct: (id: string, p: ProductPayload) => api.put<{ product: AdminProduct }>(`/shop/products/${id}`, p).then((r) => r.product),
  deleteProduct: (id: string) => api.delete<{ ok: true }>(`/shop/products/${id}`),
  patchVariant: (id: string, data: Partial<{ isAvailable: boolean; stockQty: number; trackInventory: boolean; price: number }>) => api.patch(`/shop/variants/${id}`, data),
  upload: (file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    return request<{ url: string }>('/shop/uploads', { method: 'POST', body: fd });
  },
  lowStock: (threshold?: number) => api.get<{ threshold: number; items: LowStockItem[] }>('/shop/stock/low', { threshold }),
  adjustStock: (variantId: string, body: { delta: number; reason: StockReason; note?: string }) =>
    api.post<{ variant: { id: string; stockQty: number } }>(`/shop/variants/${variantId}/stock`, body).then((r) => r.variant),
  stockMovements: (productId: string, page = 1) =>
    api.get<{ total: number; totalPages: number; items: StockMovementRow[] }>(`/shop/products/${productId}/stock-movements`, { page }),
};
