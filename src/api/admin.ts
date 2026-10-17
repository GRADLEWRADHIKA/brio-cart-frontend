import type { OrderStatus, RiderStatus, Role } from '@shared/core';
import { api, request } from './client';
import type { Order, Product } from '@/types';

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

export const adminApi = {
  summary: () => api.get<Summary>('/admin/summary'),
  orders: (q: { status?: string; q?: string; page?: number }) =>
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
