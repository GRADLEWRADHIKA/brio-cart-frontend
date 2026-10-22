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
  'RIDER_TIMEOUT',
  'CASH_HANDOVER',
  'CASH_RECEIVED',
  'RETURN_REQUESTED',
  'RETURN_APPROVED',
  'RETURN_REJECTED',
  'TICKET_OPENED',
  'TICKET_REPLY',
  'TICKET_STATUS',
  'LOW_STOCK',
  'CAMPAIGN_ENDING',
  'DAILY_SUMMARY',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Why a tracked variant's stock changed (StockMovement.reason). The last five are staff adjustments. */
export const STOCK_REASONS = [
  'ORDER_PLACED',
  'ORDER_CANCELLED',
  'ORDER_TIMEOUT',
  'DELIVERY_RETURNED',
  'RESTOCK',
  'DAMAGE',
  'CORRECTION',
  'RETURN',
  'OTHER',
] as const;
export type StockReason = (typeof STOCK_REASONS)[number];
export const STOCK_ADJUST_REASONS = ['RESTOCK', 'DAMAGE', 'CORRECTION', 'RETURN', 'OTHER'] as const satisfies readonly StockReason[];

export const STOCK_REASON_LABELS: Record<StockReason, string> = {
  ORDER_PLACED: 'Order placed',
  ORDER_CANCELLED: 'Order cancelled',
  ORDER_TIMEOUT: 'Order timed out',
  DELIVERY_RETURNED: 'Returned after failed delivery',
  RESTOCK: 'Restock',
  DAMAGE: 'Damaged / expired',
  CORRECTION: 'Stock count correction',
  RETURN: 'Customer return',
  OTHER: 'Other',
};

/** Curated product collections used for homepage rails. Assigned by the store admin. */
export const COLLECTIONS = [
  { key: 'bestsellers', label: 'Bestsellers' },
  { key: 'fresh-picks', label: 'Fresh Picks' },
  { key: 'essentials', label: 'Everyday Essentials' },
  { key: 'popular', label: 'Popular Products' },
] as const;
export type CollectionKey = (typeof COLLECTIONS)[number]['key'];

export const SETTLEMENT_STATUSES = ['PENDING', 'RECEIVED'] as const;
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];

/** Delivery slot times are minutes after midnight in India time (UTC+5:30, no DST). */
export const IST_OFFSET_MINUTES = 330;

export function formatMinute(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}${mm ? `:${String(mm).padStart(2, '0')}` : ''}${h < 12 ? 'am' : 'pm'}`;
}

export interface SlotAvailability {
  id: string;
  label: string;
  startMinute: number;
  endMinute: number;
  remaining: number;
  available: boolean;
  /** Why the slot can't be booked: FULL | PAST | CUTOFF | CLOSED_TODAY */
  reason: string | null;
}

export const RETURN_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];
export const REFUND_METHODS = ['STORE_CREDIT', 'CASH'] as const;
export type RefundMethod = (typeof REFUND_METHODS)[number];
export const REFUND_METHOD_LABELS: Record<RefundMethod, string> = { STORE_CREDIT: 'Store credit', CASH: 'Refunded in cash' };

/** GST included in a GST-inclusive amount, split equally into CGST and SGST (intra-state). */
export function gstBreakdown(inclusive: number, ratePercent: number) {
  if (ratePercent <= 0) return { taxable: inclusive, cgst: 0, sgst: 0, tax: 0 };
  const taxable = Math.round((inclusive * 100) / (100 + ratePercent));
  const tax = inclusive - taxable;
  const cgst = Math.floor(tax / 2);
  return { taxable, cgst, sgst: tax - cgst, tax };
}

export const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'CLOSED'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = { OPEN: 'Open', IN_PROGRESS: 'In progress', CLOSED: 'Closed' };
export const EXPORT_KINDS = ['orders', 'products', 'stock-movements', 'rider-earnings', 'settlements'] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];
