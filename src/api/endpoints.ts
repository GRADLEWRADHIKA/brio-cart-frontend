import type { CheckoutInput, OrderAddressInput, RiderRegisterInput, ShopRegisterInput } from '@shared';
import { api, request } from './client';
import { API_BASE } from '@/config/env';
import type { Address, AppNotification, AvailableOrder, CartValidation, Category, NotificationPage, Order, Product, ProductPage, PublicShop, ReturnRequestRow, RiderCash, RiderEarnings, SlotDay, TicketView, WalletView, RiderProfile, StoreInfo, User } from '@/types';

export interface ProductFilters {
  category?: string;
  collection?: string;
  /** Shop slug: only that shop's products. */
  shop?: string;
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
  shops: () => api.get<{ items: PublicShop[] }>('/shops').then((r) => r.items),
  shop: (slug: string) => api.get<{ shop: PublicShop }>(`/shops/${encodeURIComponent(slug)}`).then((r) => r.shop),
  deliverySlots: (days = 3) => api.get<{ days: SlotDay[] }>('/delivery-slots', { days }).then((r) => r.days),
  /** `shipState`: price for a courier delivery to that state (only shops that ship there). */
  validateCart: (items: Array<{ variantId: string; quantity: number }>, couponCode?: string, shipState?: string) =>
    api.post<CartValidation>('/cart/validate', { items, couponCode: couponCode || undefined, shipState: shipState || undefined }),
};

export interface ActiveDeliveryCode {
  orderNumber: string;
  accessKey: string | null;
  code: string;
  expiresAt: string | null;
  sellerName: string | null;
  riderName: string | null;
}

export const orderApi = {
  /** Delivery codes for orders on the road: the signed-in customer's, plus guest orders this device placed. */
  activeCodes: (orders: Array<{ orderNumber: string; key: string }>) =>
    api.post<{ items: ActiveDeliveryCode[] }>('/orders/active-codes', { orders }).then((r) => r.items),
  /** One Idempotency-Key per checkout attempt: a retried submit returns the original order. */
  create: (input: CheckoutInput) =>
    request<{ order: Order; orders?: Order[]; replayed: boolean }>('/orders', { method: 'POST', body: input, headers: { 'Idempotency-Key': input.idempotencyKey } }),
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
  /** Shop owners sign up with their shop and can sell straight away. */
  registerShop: (data: ShopRegisterInput) => api.post<{ user: User; token: string }>('/auth/register-shop', data),
  /** First-run setup: is a super admin still needed, and is the page switched on (SETUP_CODE set)? */
  setupStatus: () => api.get<{ needed: boolean; enabled: boolean; codeSet: boolean; openReset?: boolean }>('/auth/setup'),
  /** Forgotten super admin login: new password (and optionally email), with the server's SETUP_CODE. */
  resetSuperAdmin: (data: { code?: string; identifier: string; password: string; newEmail?: string }) => api.post<{ user: User; token: string }>('/auth/setup/reset', data),
  setup: (data: { name: string; phone: string; email?: string; password: string; code: string }) => api.post<{ user: User; token: string }>('/auth/setup', data),
  logout: () => api.post<{ ok: true }>('/auth/logout'),
};

export const accountApi = {
  sessions: () => api.get<{ items: Array<{ id: string; userAgent: string | null; ip: string | null; createdAt: string; lastSeenAt: string; current: boolean }> }>('/account/sessions').then((r) => r.items),
  logoutOthers: () => api.post<{ ok: true; token: string }>('/account/sessions/logout-others'),
  exportData: () => api.get<Record<string, unknown>>('/account/export'),
  deleteAccount: (password: string) => request<{ ok: true }>('/account', { method: 'DELETE', body: { password } }),
  tickets: () => api.get<{ items: TicketView[] }>('/account/tickets').then((r) => r.items),
  ticket: (id: string) => api.get<{ ticket: TicketView }>(`/account/tickets/${id}`).then((r) => r.ticket),
  openTicket: (body: { subject: string; body: string; orderNumber?: string }) => api.post<{ ticket: TicketView }>('/account/tickets', body).then((r) => r.ticket),
  replyTicket: (id: string, body: string) => api.post<{ ticket: TicketView }>(`/account/tickets/${id}/messages`, { body }).then((r) => r.ticket),
  wallet: () => api.get<WalletView>('/account/wallet'),
  returns: () => api.get<{ items: ReturnRequestRow[] }>('/account/returns').then((r) => r.items),
  requestReturn: (orderNumber: string, reason: string) => api.post<{ request: ReturnRequestRow }>('/account/returns', { orderNumber, reason }).then((r) => r.request),
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
  available: () => api.get<{ items: AvailableOrder[]; online: boolean; locationKnown?: boolean; offerSeconds?: number }>('/rider/orders/available'),
  claim: (id: string) => api.post<{ order: Order }>(`/rider/orders/${id}/claim`).then((r) => r.order),
  /** Pass an order offered to this rider on to the next nearest one. */
  decline: (id: string) => api.post<{ ok: true }>(`/rider/orders/${id}/decline`),
  accept: (id: string) => api.post<{ order: Order }>(`/rider/orders/${id}/accept`).then((r) => r.order),
  reject: (id: string, reason?: string) => api.post<{ ok: true }>(`/rider/orders/${id}/reject`, { reason }),
  /** Shop orders need the shop's pickup code; Brio Cart's own don't. */
  pickup: (id: string, code?: string) => api.post<{ order: Order }>(`/rider/orders/${id}/pickup`, code ? { code } : {}).then((r) => r.order),
  start: (id: string) => api.post<{ order: Order }>(`/rider/orders/${id}/start`).then((r) => r.order),
  fail: (id: string, reason: string) => api.post<{ order: Order }>(`/rider/orders/${id}/fail`, { reason }).then((r) => r.order),
  /** `cashAmount` in rupees for cash on delivery; `cashCollected` for UPI on delivery. */
  deliver: (id: string, otp: string, cash: { cashCollected?: boolean; cashAmount?: number; cashDifferenceReason?: string }) =>
    api.post<{ order: Order }>(`/rider/orders/${id}/deliver`, { otp, ...cash }).then((r) => r.order),
  cash: () => api.get<RiderCash>('/rider/cash'),
  handover: (amount: number, note?: string) => api.post<{ settlement: { id: string } }>('/rider/cash/handover', { amount, note }),
  location: (lat: number, lng: number, accuracy?: number) => api.post<{ ok: true; ordersUpdated: number }>('/rider/location', { lat, lng, accuracy }),
  earnings: () => api.get<RiderEarnings>('/rider/earnings'),
};

export const notificationsApi = {
  list: (page = 1, pageSize = 20) => api.get<NotificationPage>('/notifications', { page, pageSize }),
  unreadCount: () => api.get<{ count: number }>('/notifications/unread-count').then((r) => r.count),
  markRead: (id: string) => api.post<{ notification: AppNotification }>(`/notifications/${id}/read`).then((r) => r.notification),
  markAllRead: () => api.post<{ ok: true; updated: number }>('/notifications/read-all'),
};

/** Direct link to the invoice PDF (the session cookie, or the guest access key, authorises it). */
export const invoiceUrl = (orderNumber: string, key?: string | null) =>
  `${API_BASE}/orders/${encodeURIComponent(orderNumber)}/invoice.pdf${key ? `?key=${encodeURIComponent(key)}` : ''}`;