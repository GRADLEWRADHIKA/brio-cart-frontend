import type { ExportKind, OrderStatus, RiderStatus, Role, StockReason } from '@shared/core';
import type { MyShop, ShopEarnings } from './shop';
import type { ShopPayoutMethod } from '@shared/core';
import { api, request } from './client';
import type { Analytics, CashSummary, Order, Product, ReturnRequestRow, RiderCash, TicketView } from '@/types';
import { API_BASE } from '@/config/env';

export interface AdminVariant {
  id?: string;
  label: string;
  price: number;
  mrp: number | null;
  isAvailable: boolean;
  trackInventory: boolean;
  stockQty: number;
  maxPerOrder: number;
}

export interface AdminProduct extends Product {
  isActive: boolean;
  keywords: string;
  sortOrder: number;
  soldCount: number;
  rawImageUrl: string | null;
  /** Shop products hidden by Brio Cart staff: the shop can edit them but not put them back on sale. */
  staffHidden?: boolean;
  staffHiddenReason?: string | null;
  adminVariants: AdminVariant[];
}

export interface AdminCategory {
  id: string;
  slug: string;
  name: string;
  nameHi: string | null;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  _count: { products: number };
}

export interface AdminArea {
  id: string;
  slug: string;
  name: string;
  pincode: string | null;
  isActive: boolean;
  sortOrder: number;
  lat: number | null;
  lng: number | null;
  /** Paise; null = store-wide setting. */
  minOrderAmount: number | null;
  deliveryFee: number | null;
  freeDeliveryThreshold: number | null;
}

export interface AdminSettings {
  storeName: string;
  tagline: string;
  announcement: string;
  whatsappNumber: string;
  supportPhone: string;
  supportEmail: string | null;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  minOrderAmount: number;
  deliverySlots: string[];
  deliveryNote: string | null;
  codEnabled: boolean;
  upiOnDeliveryEnabled: boolean;
  acceptingOrders: boolean;
  demoMode: boolean;
  storeLat: number;
  storeLng: number;
  /** Rupees paid to the rider per completed delivery. */
  riderPayoutPerDelivery: number;
  /** Percent of a shop's item sales Brio Cart keeps, unless the shop has its own rate. */
  defaultCommissionPercent: number;
  lowStockThreshold: number;
  orderConfirmTimeoutMinutes: number;
  riderAcceptTimeoutMinutes: number;
  /** Seconds the nearest rider has to accept an offer. 0 = off. */
  dispatchOfferSeconds: number;
  dispatchRadiusKm: number;
  dispatchMaxOffers: number;
  gstin: string | null;
  storeAddress: string | null;
  gstRatePercent: number;
  invoicePrefix: string;
  returnWindowHours: number;
}

export interface AdminSlot {
  id: string;
  label: string;
  start: string;
  end: string;
  capacity: number;
  days: string;
  isActive: boolean;
  sortOrder: number;
  /** The standard 6–8 and 8–10 AM slots: always on, every day; only capacity and label can change. */
  isStandard?: boolean;
}

export interface SystemStatus {
  startedAt: string;
  uptimeSeconds: number;
  node: string;
  environment: string;
  database: { provider: string; bytes: number | null; orders: number; users: number };
  jobs: Array<{ name: string; everyMs: number; lastRunAt: string | null; lastStatus: string | null; lastError: string | null; lastResult: string | null; runCount: number }>;
}

export interface LowStockItem {
  variantId: string;
  label: string;
  stockQty: number;
  isAvailable: boolean;
  product: { id: string; name: string; slug: string; isActive: boolean };
}

export interface StockMovementRow {
  id: string;
  variantId: string;
  variantLabel: string;
  delta: number;
  reason: StockReason;
  note: string | null;
  balanceAfter: number;
  orderNumber: string | null;
  user: { name: string; role: Role } | null;
  createdAt: string;
}

export interface AdminCampaign {
  id: string;
  slug: string;
  title: string;
  headline: string;
  subcopy: string | null;
  signature: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  theme: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

export interface Summary {
  ordersByStatus: Record<OrderStatus, number>;
  ordersToday: number;
  revenueToday: number;
  activeProducts: number;
  unavailableVariants: number;
  recentOrders: Order[];
  alerts: DashboardAlerts;
}

export type CampaignAlert =
  | { kind: 'ENDING'; campaignId: string; title: string; endsAt: string; hoursLeft: number }
  | { kind: 'NONE_RUNNING'; lastTitle: string | null; lastEndedAt: string | null; nextStartsAt: string | null };

export interface DashboardAlerts {
  campaigns: CampaignAlert[];
  lowStock: { threshold: number; count: number; items: LowStockItem[] };
}

interface DayTotals {
  day: string;
  orders: number;
  sales: number;
  averageOrderValue: number;
  cancelled: number;
}

/** One India-time day of sales (paise), with the day before for comparison. */
export interface DailySummary extends DayTotals {
  itemsSold: number;
  delivered: number;
  cashOnDelivery: number;
  byArea: Array<{ area: string; orders: number; sales: number }>;
  previous: DayTotals;
  topProducts: Array<{ productId: string; name: string; quantity: number; sales: number }>;
  lastSevenDays: Array<{ day: string; orders: number; sales: number }>;
}

/** Product payloads use rupees; the API converts to paise. */
export interface ProductPayload {
  name: string;
  nameHi?: string | null;
  slug?: string;
  description?: string | null;
  highlight?: string | null;
  imageUrl?: string | null;
  categoryId: string;
  collections: string[];
  keywords: string;
  isActive: boolean;
  sortOrder: number;
  variants: Array<Omit<AdminVariant, 'price' | 'mrp'> & { price: number; mrp: number | null }>;
}

/** A shop as store staff see it, with what Brio Cart owes it. */
export interface AdminShop extends MyShop {
  owner: { name: string; phone: string; email?: string | null };
  productCount?: number;
  pendingOrders?: number;
  deliveredOrders?: number;
  itemsTotal?: number;
  commission?: number;
  earned?: number;
  paid?: number;
  balance?: number;
}

export const adminApi = {
  summary: () => api.get<Summary>('/admin/summary'),
  orders: (q: { status?: string; q?: string; page?: number; shop?: string }) =>
    api.get<{ items: Order[]; total: number; page: number; totalPages: number }>('/admin/orders', q),
  order: (id: string) => api.get<{ order: Order }>(`/admin/orders/${id}`).then((r) => r.order),
  setStatus: (id: string, status: OrderStatus, note?: string) => api.patch<{ order: Order }>(`/admin/orders/${id}/status`, { status, note }).then((r) => r.order),
  setPayment: (id: string, paymentStatus: 'PAID' | 'UNPAID') => api.patch<{ order: Order }>(`/admin/orders/${id}/payment`, { paymentStatus }).then((r) => r.order),

  products: (q: { q?: string; category?: string; archived?: string }) => api.get<{ items: AdminProduct[] }>('/admin/products', q).then((r) => r.items),
  product: (id: string) => api.get<{ product: AdminProduct }>(`/admin/products/${id}`).then((r) => r.product),
  createProduct: (p: ProductPayload) => api.post<{ product: AdminProduct }>('/admin/products', p).then((r) => r.product),
  updateProduct: (id: string, p: ProductPayload) => api.put<{ product: AdminProduct }>(`/admin/products/${id}`, p).then((r) => r.product),
  /** Soft delete (super admin): hidden from the store, kept in past orders. */
  deleteProduct: (id: string) => api.delete<{ ok: true }>(`/admin/products/${id}`),
  /** Stock and price (rupees) edits, allowed for admins. */
  patchVariant: (id: string, data: Partial<{ isAvailable: boolean; stockQty: number; trackInventory: boolean; price: number }>) => api.patch(`/admin/variants/${id}`, data),
  upload: (file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    return request<{ url: string }>('/admin/uploads', { method: 'POST', body: fd });
  },

  categories: () => api.get<{ items: AdminCategory[] }>('/admin/categories').then((r) => r.items),
  saveCategory: (c: Partial<AdminCategory>, id?: string) => (id ? api.put(`/admin/categories/${id}`, c) : api.post('/admin/categories', c)),
  deleteCategory: (id: string) => api.delete<{ ok: true }>(`/admin/categories/${id}`),

  areas: () => api.get<{ items: AdminArea[] }>('/admin/areas').then((r) => r.items),
  saveArea: (a: { name: string; pincode: string | null; isActive: boolean; sortOrder: number; lat?: number | null; lng?: number | null }, id?: string) => (id ? api.put(`/admin/areas/${id}`, a) : api.post('/admin/areas', a)),

  settings: () => api.get<{ settings: AdminSettings }>('/admin/settings').then((r) => r.settings),
  saveSettings: (s: AdminSettings) => api.put<{ settings: AdminSettings }>('/admin/settings', s).then((r) => r.settings),

  campaigns: () => api.get<{ items: AdminCampaign[]; now: string }>('/admin/campaigns'),
  saveCampaign: (c: Omit<AdminCampaign, 'id' | 'slug'>, id?: string) => (id ? api.put(`/admin/campaigns/${id}`, c) : api.post('/admin/campaigns', c)),
  riders: (status?: RiderStatus) => api.get<{ items: AdminRider[] }>('/admin/riders', { status }).then((r) => r.items),
  approveRider: (id: string) => api.post<{ rider: AdminRider }>(`/admin/riders/${id}/approve`),
  rejectRider: (id: string, reason?: string) => api.post<{ rider: AdminRider }>(`/admin/riders/${id}/reject`, { reason }),
  lowStock: (threshold?: number) => api.get<{ threshold: number; items: LowStockItem[] }>('/admin/stock/low', { threshold }),
  adjustStock: (variantId: string, body: { delta: number; reason: StockReason; note?: string }) =>
    api.post<{ variant: { id: string; stockQty: number } }>(`/admin/variants/${variantId}/stock`, body).then((r) => r.variant),
  stockMovements: (productId: string, page = 1) =>
    api.get<{ total: number; totalPages: number; items: StockMovementRow[] }>(`/admin/products/${productId}/stock-movements`, { page }),
  returnToStock: (orderId: string) => api.post<{ order: Order }>(`/admin/orders/${orderId}/return`).then((r) => r.order),
  settlements: () => api.get<{ riders: Array<CashSummary & { id: string; name: string; phone: string; isActive: boolean }> }>('/admin/settlements').then((r) => r.riders),
  riderCash: (riderId: string) => api.get<RiderCash & { rider: { id: string; name: string; phone: string } }>(`/admin/settlements/riders/${riderId}`),
  recordSettlement: (riderId: string, amount: number, note?: string) => api.post(`/admin/settlements/riders/${riderId}`, { amount, note }),
  receiveSettlement: (id: string) => api.post(`/admin/settlements/${id}/receive`),
  slots: () => api.get<{ slots: AdminSlot[]; cutoff: string | null }>('/admin/delivery-slots'),
  saveSlot: (body: Omit<AdminSlot, 'id'>, id?: string) =>
    (id ? api.put<{ slot: AdminSlot }>(`/admin/delivery-slots/${id}`, body) : api.post<{ slot: AdminSlot }>('/admin/delivery-slots', body)).then((r) => r.slot),
  disableSlot: (id: string) => api.delete(`/admin/delivery-slots/${id}`),
  saveCutoff: (cutoff: string | null) => api.put('/admin/delivery-slots-cutoff', { cutoff }),
  saveAreaFees: (id: string, fees: { minOrderAmount: number | null; deliveryFee: number | null; freeDeliveryThreshold: number | null }) => api.put(`/admin/areas/${id}/fees`, fees),
  returns: (status?: string) => api.get<{ items: ReturnRequestRow[] }>('/admin/returns', { status }).then((r) => r.items),
  decideReturn: (id: string, body: { approve: boolean; note?: string; refundMethod?: 'STORE_CREDIT' | 'CASH'; refundAmount?: number }) =>
    api.post<{ request: ReturnRequestRow }>(`/admin/returns/${id}/decision`, body).then((r) => r.request),
  analytics: (range: { from?: string; to?: string }) => api.get<Analytics>('/admin/analytics', range),
  shippingOrders: (status?: string) => api.get<{ items: Order[] }>('/admin/shipping', { status }).then((r) => r.items),
  shippingQuote: (id: string, d: { fee: number; eta: string; courierName?: string; note?: string }) => api.post<{ order: Order }>(`/admin/orders/${id}/shipping/quote`, d).then((r) => r.order),
  shippingShip: (id: string, d: { courierName: string; trackingNumber: string }) => api.post<{ order: Order }>(`/admin/orders/${id}/shipping/ship`, d).then((r) => r.order),
  shippingDelivered: (id: string) => api.post<{ order: Order }>(`/admin/orders/${id}/shipping/delivered`).then((r) => r.order),
  shops: () => api.get<{ items: AdminShop[] }>('/admin/shops').then((r) => r.items),
  shop: (id: string) => api.get<{ shop: AdminShop; products: AdminProduct[]; earnings: ShopEarnings }>(`/admin/shops/${id}`),
  updateShop: (id: string, d: { isActive?: boolean; commissionPercent?: number | null }) => api.patch<{ shop: MyShop }>(`/admin/shops/${id}`, d).then((r) => r.shop),
  /** One shop's products, managed by staff on the shop's behalf (the shop is notified of each change). */
  shopProducts: (shopId: string, q: { q?: string; category?: string; archived?: string }) =>
    api.get<{ shop: { id: string; name: string }; items: AdminProduct[] }>(`/admin/shops/${shopId}/products`, q),
  shopProduct: (shopId: string, id: string) => api.get<{ product: AdminProduct }>(`/admin/shops/${shopId}/products/${id}`).then((r) => r.product),
  createShopProduct: (shopId: string, p: ProductPayload) => api.post<{ product: AdminProduct }>(`/admin/shops/${shopId}/products`, p).then((r) => r.product),
  updateShopProduct: (shopId: string, id: string, p: ProductPayload) => api.put<{ product: AdminProduct }>(`/admin/shops/${shopId}/products/${id}`, p).then((r) => r.product),
  deleteShopProduct: (shopId: string, id: string, reason?: string) => api.delete<{ ok: true }>(`/admin/shops/${shopId}/products/${id}`, { reason }),
  setShopProductHidden: (shopId: string, id: string, hidden: boolean, reason?: string) =>
    api.patch<{ product: AdminProduct }>(`/admin/shops/${shopId}/products/${id}/visibility`, { hidden, reason }).then((r) => r.product),
  patchShopVariant: (shopId: string, id: string, data: Partial<{ isAvailable: boolean; stockQty: number; trackInventory: boolean; price: number }>) =>
    api.patch(`/admin/shops/${shopId}/variants/${id}`, data),
  recordShopPayout: (id: string, d: { amount: number; method: ShopPayoutMethod; reference?: string; note?: string }) =>
    api.post<{ earnings: ShopEarnings }>(`/admin/shops/${id}/payouts`, d).then((r) => r.earnings),
  dailySummary: (date?: string) => api.get<DailySummary>('/admin/reports/daily', { date }),
  exportUrl: (kind: ExportKind, range: { from?: string; to?: string }) =>
    `${API_BASE}/admin/exports/${kind}.csv?${new URLSearchParams(Object.entries(range).filter(([, v]) => v) as Array<[string, string]>).toString()}`,
  tickets: (status?: string) => api.get<{ items: TicketView[] }>('/admin/tickets', { status }).then((r) => r.items),
  ticket: (id: string) => api.get<{ ticket: TicketView }>(`/admin/tickets/${id}`).then((r) => r.ticket),
  replyTicket: (id: string, body: string) => api.post<{ ticket: TicketView }>(`/admin/tickets/${id}/messages`, { body }).then((r) => r.ticket),
  setTicketStatus: (id: string, status: TicketView['status']) => api.patch<{ ticket: TicketView }>(`/admin/tickets/${id}`, { status }).then((r) => r.ticket),
  system: () => api.get<SystemStatus>('/admin/system'),
  resetOtp: (orderId: string) => api.post<{ order: Order }>(`/admin/orders/${orderId}/otp-reset`).then((r) => r.order),
  users: (q: { q?: string; role?: Role; page?: number }) => api.get<{ items: AdminUser[]; total: number; page: number; totalPages: number }>('/admin/users', q),
  createUser: (d: { name: string; phone: string; email?: string; password: string; role: Role; vehicleNumber?: string }) => api.post<{ user: AdminUser }>('/admin/users', d),
  updateUser: (id: string, d: { isActive?: boolean; role?: Role }) => api.patch<{ user: AdminUser }>(`/admin/users/${id}`, d),
  forceLogout: (id: string) => api.post<{ ok: true }>(`/admin/users/${id}/logout`),
  audit: (q: { action?: string; entity?: string; page?: number }) => api.get<{ items: AuditEntry[]; total: number; page: number; totalPages: number }>('/admin/audit', q),
  createRider: (d: { name: string; phone: string; vehicleNumber?: string; password: string }) => api.post<{ rider: AdminRider }>('/admin/riders', d),
  updateRider: (id: string, d: { isActive?: boolean; vehicleNumber?: string | null }) => api.patch(`/admin/riders/${id}`, d),
  assignRider: (orderId: string, riderId: string | null) => api.patch<{ order: Order }>(`/admin/orders/${orderId}/rider`, { riderId }).then((r) => r.order),
  demoTrip: (orderId: string) => api.post<{ order: Order }>(`/admin/orders/${orderId}/demo-trip`).then((r) => r.order),
  live: () => api.get<{ store: { lat: number; lng: number }; demoMode: boolean; areas: Array<{ id: string; name: string; lat: number | null; lng: number | null }>; orders: Order[] }>('/admin/live'),
  coupons: () => api.get<{ items: AdminCoupon[] }>('/admin/coupons').then((r) => r.items),
  saveCoupon: (c: CouponPayload, id?: string) => (id ? api.put(`/admin/coupons/${id}`, c) : api.post('/admin/coupons', c)),
};

export interface AdminRider {
  id: string;
  name: string;
  phone: string;
  vehicleNumber: string | null;
  isActive: boolean;
  riderStatus: RiderStatus | null;
  isOnline: boolean;
  createdAt: string;
  activeOrders: number;
}

export interface AdminUser {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: Role;
  isActive: boolean;
  riderStatus: RiderStatus | null;
  vehicleNumber: string | null;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: unknown;
  actor: { id: string; name: string; role: Role } | null;
  createdAt: string;
}

export interface AdminCoupon {
  id: string;
  code: string;
  description: string | null;
  type: 'FLAT' | 'PERCENT';
  /** Paise for FLAT, percent for PERCENT. */
  value: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
}

/** Amounts in rupees (FLAT value, minimum, cap); PERCENT value in percent. */
export interface CouponPayload {
  code: string;
  description?: string | null;
  type: 'FLAT' | 'PERCENT';
  value: number;
  minOrderAmount: number;
  maxDiscount?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  usageLimit?: number | null;
  isActive: boolean;
}
