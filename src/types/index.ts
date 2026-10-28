import type { DeliveryStatus, NotificationType, OrderStatus, OrderTotals, PaymentMethod, RiderStatus, Role, SlotAvailability } from '@shared/core';

export interface Variant {
  id: string;
  label: string;
  price: number;
  mrp: number | null;
  inStock: boolean;
  maxQty: number;
  lowStock: number | null;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  nameHi: string | null;
  description: string | null;
  highlight: string | null;
  imageUrl: string | null;
  category: { id: string; slug: string; name: string };
  /** The local shop selling it; null for Brio Cart's own products. `isOpen` false = can't be ordered now. */
  shop: { id: string; slug: string; name: string; isOpen: boolean } | null;
  collections: string[];
  inStock: boolean;
  fromPrice: number | null;
  variants: Variant[];
}

/** A confirmed order no rider has taken yet (rider open pool). */
export interface AvailableOrder {
  id: string;
  orderNumber: string;
  areaName: string;
  deliveryDate: string | null;
  deliverySlot: string | null;
  paymentMethod: string;
  total: number;
  itemCount: number;
  createdAt: string;
  /** Where to collect a shop order; null for Brio Cart's own. */
  pickup: { shopName: string; address: string; areaName: string | null; ready: boolean } | null;
  /** Straight-line km from the rider's last location to the pickup point; null when unknown. */
  distanceKm: number | null;
  /** Offered to this rider alone (nearest-rider dispatch) until `expiresAt`. */
  offer: { expiresAt: string } | null;
}

export interface ProductPage {
  items: Product[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPopularityData: boolean;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  nameHi: string | null;
  description: string | null;
  imageUrl: string | null;
  productCount: number;
}

export interface DeliveryArea {
  id: string;
  slug: string;
  name: string;
  pincode: string | null;
  lat: number | null;
  lng: number | null;
  /** Area fee rules in paise; null = store-wide setting. */
  minOrderAmount?: number | null;
  deliveryFee?: number | null;
  freeDeliveryThreshold?: number | null;
}

export interface StoreSettings {
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
  paymentMethods: Record<PaymentMethod, boolean>;
  acceptingOrders: boolean;
  /** Presentation mode: demo online checkout + delivery simulation, always labelled. */
  demoMode: boolean;
  returnWindowHours?: number;
  storeLocation: LatLng;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Campaign {
  slug: string;
  title: string;
  headline: string;
  subcopy: string | null;
  signature: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  theme: string;
  endsAt: string;
}

export interface StoreInfo {
  settings: StoreSettings;
  campaign: Campaign | null;
  areas: DeliveryArea[];
}

export interface CartValidation {
  lines: Array<{
    variantId: string;
    productId: string;
    productSlug: string;
    productName: string;
    variantLabel: string;
    imageUrl: string | null;
    unitPrice: number;
    mrp: number | null;
    quantity: number;
    lineTotal: number;
    maxQty: number;
    shop: { id: string; name: string } | null;
  }>;
  issues: Array<{ variantId: string; code: 'NOT_FOUND' | 'UNAVAILABLE' | 'QUANTITY_LIMIT'; message: string; maxQty?: number }>;
  totals: OrderTotals;
  /** One entry per order the checkout will create (Brio Cart's items, then each shop's). */
  groups?: Array<{ shop: { id: string; name: string } | null; variantIds: string[]; totals: OrderTotals }>;
  coupon: { code: string; discount: number } | null;
  couponError: string | null;
  minOrderAmount: number;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: Role;
  /** Riders only. */
  riderStatus: RiderStatus | null;
  createdAt: string;
}

export interface Address {
  id: string;
  label: string | null;
  name: string;
  phone: string;
  areaId: string;
  house: string;
  street: string;
  landmark: string | null;
  isDefault: boolean;
  area: { name: string; isActive: boolean };
}

export interface Order {
  id: string;
  orderNumber: string;
  accessKey?: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  customer: {
    name: string;
    phone: string;
    areaId: string;
    areaName: string;
    house: string;
    street: string;
    landmark: string | null;
    instructions: string | null;
  };
  deliverySlot: string | null;
  paymentMethod: PaymentMethod;
  paymentMethodLabel: string;
  paymentStatus: string;
  couponCode: string | null;
  /** The shop selling and preparing this order; null for Brio Cart's own. */
  shop: { id: string; slug: string; name: string; phone: string; address: string; areaName: string | null; readyAt: string | null } | null;
  /** Orders split from one checkout share this. */
  checkoutGroup?: string | null;
  /** Courier delivery outside the city; null for local orders. */
  shipping?: {
    state: string | null;
    stateName: string | null;
    city: string | null;
    pincode: string | null;
    /** AWAITING_QUOTE | QUOTED | SHIPPED | DELIVERED */
    status: string | null;
    eta: string | null;
    courierName: string | null;
    trackingNumber: string | null;
    note: string | null;
  } | null;
  rider: { id: string; name: string; phone: string; vehicleNumber: string | null } | null;
  /** Only present for the customer, while the order is out for delivery. */
  deliveryOtp?: string;
  delivery: {
    status: DeliveryStatus | null;
    failReason: string | null;
    otpExpiresAt: string | null;
    otpLocked: boolean;
    deliveredAt: string | null;
    /** Rider views only (paise). */
    payout?: number | null;
  };
  /** Customer may cancel (before pickup). */
  canCancel: boolean;
  rating: { stars: number; comment: string | null; at: string | null } | null;
  tracking?: Tracking;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  /** Amount still to pay after store credit. */
  total: number;
  walletApplied?: number;
  invoiceNumber?: string | null;
  cancelReason?: string | null;
  items: Array<{
    id: string;
    productId: string | null;
    variantId: string | null;
    productName: string;
    variantLabel: string;
    imageUrl: string | null;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }>;
  /** Store statuses plus rider steps (ASSIGNED, PICKED_UP, RIDER_REJECTED, DELIVERY_FAILED, …). */
  events: Array<{ status: string; note: string | null; at: string }>;
}

export interface Tracking {
  store: LatLng;
  destination: LatLng | null;
  rider: { name: string; phone: string; vehicleNumber: string | null } | null;
  /** LIVE = rider phone GPS, DEMO = presentation simulation, null = no position shared. */
  source: 'LIVE' | 'DEMO' | null;
  location: (LatLng & { at: string }) | null;
  route: LatLng[] | null;
  progress: number | null;
  etaMinutes: number | null;
  arrived: boolean;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  orderId: string | null;
  orderNumber: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPage {
  items: AppNotification[];
  total: number;
  unread: number;
  page: number;
  totalPages: number;
}

export interface RiderProfile {
  id: string;
  name: string;
  phone: string;
  vehicleNumber: string | null;
  riderStatus: RiderStatus | null;
  isOnline: boolean;
}

export interface RiderEarnings {
  payoutPerDelivery: number;
  today: { date: string; deliveries: number; amount: number };
  thisWeek: { weekStart: string; deliveries: number; amount: number };
  daily: Array<{ date: string; deliveries: number; amount: number }>;
  weekly: Array<{ weekStart: string; deliveries: number; amount: number }>;
  deliveries: Array<{ orderId: string; orderNumber: string; areaName: string; deliveredAt: string | null; payout: number }>;
}

export interface CashSummary {
  collected: number;
  handedIn: number;
  pending: number;
  balance: number;
  cashOrders: number;
}

export interface CashSettlementRow {
  id: string;
  amount: number;
  status: 'PENDING' | 'RECEIVED';
  note: string | null;
  createdAt: string;
  receivedAt: string | null;
}

export interface RiderCash {
  summary: CashSummary;
  orders: Array<{ id: string; orderNumber: string; total: number; cashCollected: number; cashDifferenceReason: string | null; deliveredAt: string | null }>;
  settlements: CashSettlementRow[];
}

export interface SlotDay {
  date: string;
  slots: SlotAvailability[];
}

export interface WalletView {
  balance: number;
  entries: Array<{ id: string; delta: number; reason: string; note: string | null; balanceAfter: number; orderNumber: string | null; createdAt: string }>;
}

export interface ReturnRequestRow {
  id: string;
  orderId: string;
  orderNumber: string | null;
  orderTotal: number | null;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNote: string | null;
  refundMethod: 'STORE_CREDIT' | 'CASH' | null;
  refundAmount: number | null;
  decidedAt: string | null;
  createdAt: string;
  customer?: { name: string; phone: string };
}

export interface TicketView {
  id: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  orderNumber: string | null;
  customer: { id: string; name: string; phone: string };
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  messages?: Array<{ id: string; body: string; author: { id: string; name: string } | null; fromStaff: boolean; createdAt: string }>;
}

export interface Analytics {
  from: string;
  to: string;
  orderCount: number;
  cancelledCount: number;
  totalSales: number;
  averageOrderValue: number;
  byDay: Array<{ period: string; orders: number; sales: number }>;
  byWeek: Array<{ period: string; orders: number; sales: number }>;
  peakHours: Array<{ hour: number; orders: number }>;
  topProducts: Array<{ productId: string | null; name: string; quantity: number; sales: number }>;
  cancellationReasons: Array<{ reason: string; count: number }>;
  riders: Array<{ riderId: string; name: string; attempted: number; delivered: number; payout: number; avgRating: number | null }>;
}

/** A local shop selling on Brio Cart, as customers see it. */
export interface PublicShop {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  address: string;
  area: { id: string; name: string } | null;
  isOpen: boolean;
  prepMinutes: number;
  productCount?: number;
}
