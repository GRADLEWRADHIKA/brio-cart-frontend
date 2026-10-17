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

export const ROLES = ['CUSTOMER', 'ADMIN', 'RIDER', 'SUPERADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  CUSTOMER: 'Customer',
  ADMIN: 'Admin',
  RIDER: 'Rider',
  SUPERADMIN: 'Super admin',
};

/** Riders who sign up themselves start PENDING and get no orders until a super admin approves them. */
export const RIDER_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type RiderStatus = (typeof RIDER_STATUSES)[number];

/**
 * Rider-side progress of an order, kept next to the store-side `OrderStatus`.
 * ASSIGNED → ACCEPTED → PICKED_UP → OUT_FOR_DELIVERY → DELIVERED, or FAILED (customer unreachable etc.).
 * A rejected assignment clears the rider and returns the order to the admin queue.
 */
export const DELIVERY_STATUSES = ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  ASSIGNED: 'Assigned',
  ACCEPTED: 'Accepted',
  PICKED_UP: 'Picked up',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  FAILED: 'Delivery failed',
};

export const DELIVERY_TRANSITIONS: Record<DeliveryStatus, readonly DeliveryStatus[]> = {
  ASSIGNED: ['ACCEPTED'],
  ACCEPTED: ['PICKED_UP'],
  PICKED_UP: ['OUT_FOR_DELIVERY', 'FAILED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED'],
  DELIVERED: [],
  FAILED: [],
};

export function canDeliveryTransition(from: DeliveryStatus | null, to: DeliveryStatus): boolean {
  return from !== null && DELIVERY_TRANSITIONS[from].includes(to);
}

/** Customers may cancel until the rider has picked the order up. */
export function customerCanCancel(status: OrderStatus, deliveryStatus: DeliveryStatus | null): boolean {
  if (!['PENDING', 'CONFIRMED', 'PREPARING'].includes(status)) return false;
  return deliveryStatus === null || deliveryStatus === 'ASSIGNED' || deliveryStatus === 'ACCEPTED' || deliveryStatus === 'FAILED';
}

/** Delivery code generated when the order goes out for delivery. */
export const DELIVERY_OTP_LENGTH = 4;
export const DELIVERY_OTP_MAX_ATTEMPTS = 5;
export const DELIVERY_OTP_TTL_MINUTES = 6 * 60;

export const NOTIFICATION_TYPES = [
  'ORDER_CONFIRMED',
  'ORDER_PACKED',
  'ORDER_PICKED_UP',
  'ORDER_OUT_FOR_DELIVERY',
  'ORDER_DELIVERED',
  'ORDER_CANCELLED',
  'DELIVERY_FAILED',
  'RIDER_ASSIGNED',
  'ASSIGNMENT_CANCELLED',
  'ADDRESS_CHANGED',
  'NEW_ORDER',
  'RIDER_REJECTED',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Curated product collections used for homepage rails. Assigned by the store admin. */
export const COLLECTIONS = [
  { key: 'bestsellers', label: 'Bestsellers' },
  { key: 'fresh-picks', label: 'Fresh Picks' },
  { key: 'essentials', label: 'Everyday Essentials' },
  { key: 'popular', label: 'Popular Products' },
] as const;
export type CollectionKey = (typeof COLLECTIONS)[number]['key'];
