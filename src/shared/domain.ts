export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

/** Allowed forward transitions. Cancelling is allowed from any non-final state. */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

/** The progress track shown to customers (cancellation is shown separately). */
export const ORDER_PROGRESS: readonly OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

export const PAYMENT_METHODS = ['COD', 'UPI_ON_DELIVERY', 'ONLINE'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  COD: 'Cash on Delivery',
  UPI_ON_DELIVERY: 'UPI on Delivery',
  ONLINE: 'Pay Online',
};

/** DEMO_PAID is only ever set by the presentation-mode demo checkout; it is never real money. */
export const PAYMENT_STATUSES = ['UNPAID', 'PAID', 'REFUNDED', 'DEMO_PAID'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const ROLES = ['CUSTOMER', 'ADMIN', 'RIDER'] as const;
export type Role = (typeof ROLES)[number];

/** Curated product collections used for homepage rails. Assigned by the store admin. */
export const COLLECTIONS = [
  { key: 'bestsellers', label: 'Bestsellers' },
  { key: 'fresh-picks', label: 'Fresh Picks' },
  { key: 'essentials', label: 'Everyday Essentials' },
  { key: 'popular', label: 'Popular Products' },
] as const;
export type CollectionKey = (typeof COLLECTIONS)[number]['key'];
