import type { CheckoutInput, OrderAddressInput, RiderRegisterInput } from '@shared';
import { api } from './client';
import type { Address, AppNotification, CartValidation, Category, NotificationPage, Order, Product, ProductPage, RiderEarnings, RiderProfile, StoreInfo, User } from '@/types';

export interface ProductFilters {
  category?: string;
  collection?: string;
  q?: string;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'popular' | 'name';
  inStock?: boolean;
  page?: number;
  pageSize?: number;
}

export const catalogApi = {
  store: () => api.get<StoreInfo>('/store'),
  categories: () => api.get<{ items: Category[] }>('/categories').then((r) => r.items),
  products: (f: ProductFilters, signal?: AbortSignal) =>
    api.get<ProductPage>('/products', { ...f, inStock: f.inStock ? 'true' : undefined }, signal),
  product: (slug: string) => api.get<{ product: Product; related: Product[] }>(`/products/${encodeURIComponent(slug)}`),
  validateCart: (items: Array<{ variantId: string; quantity: number }>, couponCode?: string) =>
    api.post<CartValidation>('/cart/validate', { items, couponCode: couponCode || undefined }),
};

export const orderApi = {
  create: (input: CheckoutInput) => api.post<{ order: Order; replayed: boolean }>('/orders', input),
  get: (orderNumber: string, key?: string) =>
    api.get<{ order: Order }>(`/orders/${encodeURIComponent(orderNumber)}`, { key }).then((r) => r.order),
  demoPay: (orderNumber: string, method: 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET', key?: string) =>
    api.post<{ order: Order; reference: string }>(`/orders/${encodeURIComponent(orderNumber)}/demo-pay`, { key, method }),
  rate: (orderNumber: string, stars: number, comment?: string, key?: string) =>
    api.post<{ order: Order }>(`/orders/${encodeURIComponent(orderNumber)}/rate`, { key, stars, comment }).then((r) => r.order),
  cancel: (orderNumber: string, key?: string) =>
    api.post<{ order: Order }>(`/orders/${encodeURIComponent(orderNumber)}/cancel`, { key }).then((r) => r.order),
  updateAddress: (orderNumber: string, data: OrderAddressInput, key?: string) =>
    api.patch<{ order: Order }>(`/orders/${encodeURIComponent(orderNumber)}/address`, { ...data, key }).then((r) => r.order),
};

export const authApi = {
  me: () => api.get<{ user: User }>('/auth/me').then((r) => r.user),
  login: (identifier: string, password: string) => api.post<{ user: User; token: string }>('/auth/login', { identifier, password }),
  register: (data: { name: string; phone: string; email?: string; password: string }) =>
    api.post<{ user: User; token: string }>('/auth/register', data),
  registerRider: (data: RiderRegisterInput) => api.post<{ user: User; token: string }>('/auth/register-rider', data),
  logout: () => api.post<{ ok: true }>('/auth/logout'),
};

export const accountApi = {
  updateProfile: (data: { name: string; email?: string }) => api.patch<{ user: User }>('/account/profile', data).then((r) => r.user),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ ok: true; token: string }>('/account/password', { currentPassword, newPassword }),
  addresses: () => api.get<{ items: Address[] }>('/account/addresses').then((r) => r.items),
  createAddress: (data: unknown) => api.post<{ address: Address }>('/account/addresses', data).then((r) => r.address),
  updateAddress: (id: string, data: unknown) => api.put<{ address: Address }>(`/account/addresses/${id}`, data).then((r) => r.address),
  deleteAddress: (id: string) => api.delete<{ ok: true }>(`/account/addresses/${id}`),
  orders: () => api.get<{ items: Order[] }>('/account/orders').then((r) => r.items),
};

export const riderApi = {
  me: () => api.get<{ rider: RiderProfile }>('/rider/me').then((r) => r.rider),
  setOnline: (online: boolean) => api.patch<{ online: boolean }>('/rider/status', { online }).then((r) => r.online),
  orders: () => api.get<{ items: Order[] }>('/rider/orders').then((r) => r.items),
  history: (page = 1) => api.get<{ items: Order[]; total: number; page: number; totalPages: number }>('/rider/orders/history', { page }),
  accept: (id: string) => api.post<{ order: Order }>(`/rider/orders/${id}/accept`).then((r) => r.order),
  reject: (id: string, reason?: string) => api.post<{ ok: true }>(`/rider/orders/${id}/reject`, { reason }),
  pickup: (id: string) => api.post<{ order: Order }>(`/rider/orders/${id}/pickup`).then((r) => r.order),
  start: (id: string) => api.post<{ order: Order }>(`/rider/orders/${id}/start`).then((r) => r.order),
  fail: (id: string, reason: string) => api.post<{ order: Order }>(`/rider/orders/${id}/fail`, { reason }).then((r) => r.order),
  deliver: (id: string, otp: string, cashCollected: boolean) => api.post<{ order: Order }>(`/rider/orders/${id}/deliver`, { otp, cashCollected }).then((r) => r.order),
  location: (lat: number, lng: number, accuracy?: number) => api.post<{ ok: true; ordersUpdated: number }>('/rider/location', { lat, lng, accuracy }),
  earnings: () => api.get<RiderEarnings>('/rider/earnings'),
};

export const notificationsApi = {
  list: (page = 1, pageSize = 20) => api.get<NotificationPage>('/notifications', { page, pageSize }),
  unreadCount: () => api.get<{ count: number }>('/notifications/unread-count').then((r) => r.count),
  markRead: (id: string) => api.post<{ notification: AppNotification }>(`/notifications/${id}/read`).then((r) => r.notification),
  markAllRead: () => api.post<{ ok: true; updated: number }>('/notifications/read-all'),
};
