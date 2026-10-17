import type { CheckoutInput } from '@shared';
import { api } from './client';
import type { Address, CartValidation, Category, Order, Product, ProductPage, StoreInfo, User } from '@/types';

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
};

export const authApi = {
  me: () => api.get<{ user: User }>('/auth/me').then((r) => r.user),
  login: (identifier: string, password: string) => api.post<{ user: User; token: string }>('/auth/login', { identifier, password }),
  register: (data: { name: string; phone: string; email?: string; password: string }) =>
    api.post<{ user: User; token: string }>('/auth/register', data),
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
  orders: () => api.get<{ items: Order[] }>('/rider/orders').then((r) => r.items),
  pickup: (id: string) => api.post<{ order: Order }>(`/rider/orders/${id}/pickup`).then((r) => r.order),
  deliver: (id: string, otp: string, cashCollected: boolean) => api.post<{ order: Order }>(`/rider/orders/${id}/deliver`, { otp, cashCollected }).then((r) => r.order),
  location: (lat: number, lng: number, accuracy?: number) => api.post<{ ok: true; ordersUpdated: number }>('/rider/location', { lat, lng, accuracy }),
};
