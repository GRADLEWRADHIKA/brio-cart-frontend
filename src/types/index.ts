import type { OrderStatus, OrderTotals, PaymentMethod, Role } from '@shared/core';

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
  collections: string[];
  inStock: boolean;
  fromPrice: number | null;
  variants: Variant[];
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
  }>;
  issues: Array<{ variantId: string; code: 'NOT_FOUND' | 'UNAVAILABLE' | 'QUANTITY_LIMIT'; message: string; maxQty?: number }>;
  totals: OrderTotals;
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
  rider: { id: string; name: string; phone: string; vehicleNumber: string | null } | null;
  /** Only present for the customer, until the order is closed. */
  deliveryOtp?: string;
  rating: { stars: number; comment: string | null; at: string | null } | null;
  tracking?: Tracking;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
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
  events: Array<{ status: OrderStatus; note: string | null; at: string }>;
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
