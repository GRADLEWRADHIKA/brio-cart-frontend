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

export const ROLES = ['CUSTOMER', 'ADMIN', 'RIDER', 'SUPERADMIN', 'SHOP_OWNER'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  CUSTOMER: 'Customer',
  ADMIN: 'Admin',
  RIDER: 'Rider',
  SUPERADMIN: 'Super admin',
  SHOP_OWNER: 'Shop owner',
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
  'RIDER_OFFER',
  'RIDER_ARRIVED',
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
  'ORDER_READY',
  'SHOP_PAYOUT',
  'SHOP_JOINED',
  'DOCUMENTS',
  'SHIPPING',
  'DELIVERY_CODE',
  'SHOP_LISTING',
  'BACK_IN_STOCK',
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

/** Shop orders: wrong pickup codes before the shop must issue a new one. */
export const PICKUP_CODE_MAX_ATTEMPTS = 5;

/** How Brio Cart paid a shop (recorded only; the money moves outside the app). */
export const SHOP_PAYOUT_METHODS = ['CASH', 'BANK', 'UPI'] as const;
export type ShopPayoutMethod = (typeof SHOP_PAYOUT_METHODS)[number];
export const SHOP_PAYOUT_METHOD_LABELS: Record<ShopPayoutMethod, string> = { CASH: 'Cash', BANK: 'Bank transfer', UPI: 'UPI' };

// ---------- Verification documents (shop owners and riders) ----------

export const DOCUMENT_KINDS = ['ID_PROOF', 'BANK_PROOF', 'SHOP_LICENSE', 'FSSAI', 'GSTIN', 'TRADEMARK', 'DRIVING_LICENSE', 'VEHICLE_RC'] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const DOCUMENT_LABELS: Record<DocumentKind, { name: string; hint: string; reference?: string }> = {
  ID_PROOF: { name: 'Identity proof', hint: 'Aadhaar, PAN, passport or voter ID' },
  BANK_PROOF: { name: 'Bank account proof', hint: 'Cancelled cheque or the first page of your passbook', reference: 'IFSC and last 4 digits of the account' },
  SHOP_LICENSE: { name: 'Shop licence / local registration', hint: 'Shop and establishment licence, trade licence or municipal registration', reference: 'Registration number' },
  FSSAI: { name: 'FSSAI registration / licence', hint: 'Needed if you sell food items', reference: 'FSSAI number (14 digits)' },
  GSTIN: { name: 'GST registration', hint: 'GST certificate, if your shop is registered', reference: 'GSTIN (15 characters)' },
  TRADEMARK: { name: 'Trademark registration', hint: 'If your products sell under a registered brand or trademark: the registration certificate', reference: 'Trademark / application number' },
  DRIVING_LICENSE: { name: 'Driving licence', hint: 'Valid for the vehicle you ride', reference: 'Licence number' },
  VEHICLE_RC: { name: 'Vehicle documents', hint: 'Registration certificate (RC); insurance if you have it', reference: 'Vehicle number' },
};

/** What each role must upload (and get approved) before working; the rest are "if applicable". */
export const REQUIRED_DOCUMENTS = {
  SHOP_OWNER: ['ID_PROOF', 'BANK_PROOF', 'SHOP_LICENSE'],
  RIDER: ['ID_PROOF', 'DRIVING_LICENSE', 'VEHICLE_RC', 'BANK_PROOF'],
} as const satisfies Record<'SHOP_OWNER' | 'RIDER', readonly DocumentKind[]>;
export const OPTIONAL_DOCUMENTS = { SHOP_OWNER: ['FSSAI', 'GSTIN', 'TRADEMARK'], RIDER: [] } as const satisfies Record<'SHOP_OWNER' | 'RIDER', readonly DocumentKind[]>;

export const DOCUMENT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];
export const VERIFICATION_STATUSES = ['NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const SELLER_AGREEMENT = [
  'The documents I upload are genuine and belong to me or my shop.',
  'I will sell only goods I am licensed to sell, at the prices and pack sizes I list.',
  'I will accept or reject orders promptly and pack them hygienically.',
  'Brio Cart keeps the agreed commission on my item sales and pays me the rest.',
  'Brio Cart may suspend my shop for false documents, poor quality or repeated cancellations.',
];
export const RIDER_AGREEMENT = [
  'The documents I upload are genuine and belong to me.',
  'I will ride safely, with a valid licence, helmet and vehicle documents.',
  'I will hand orders only to the customer, with their delivery code.',
  'I will hand over all cash I collect to Brio Cart.',
];

// ---------- Where shops sell ----------

/** LOCAL: Brio Cart's delivery areas only · STATES: also the chosen states, by courier · INDIA: all of India, by courier. */
export const SERVICE_SCOPES = ['LOCAL', 'STATES', 'INDIA'] as const;
export type ServiceScope = (typeof SERVICE_SCOPES)[number];
export const SERVICE_SCOPE_LABELS: Record<ServiceScope, string> = {
  LOCAL: 'My city (Brio Cart delivery areas)',
  STATES: 'My city + chosen states (by courier)',
  INDIA: 'All of India (by courier)',
};

/** States and union territories of India (ISO 3166-2:IN codes). */
export const INDIAN_STATES = [
  ['AN', 'Andaman and Nicobar Islands'], ['AP', 'Andhra Pradesh'], ['AR', 'Arunachal Pradesh'], ['AS', 'Assam'], ['BR', 'Bihar'],
  ['CH', 'Chandigarh'], ['CG', 'Chhattisgarh'], ['DH', 'Dadra and Nagar Haveli and Daman and Diu'], ['DL', 'Delhi'], ['GA', 'Goa'],
  ['GJ', 'Gujarat'], ['HR', 'Haryana'], ['HP', 'Himachal Pradesh'], ['JK', 'Jammu and Kashmir'], ['JH', 'Jharkhand'],
  ['KA', 'Karnataka'], ['KL', 'Kerala'], ['LA', 'Ladakh'], ['LD', 'Lakshadweep'], ['MP', 'Madhya Pradesh'], ['MH', 'Maharashtra'],
  ['MN', 'Manipur'], ['ML', 'Meghalaya'], ['MZ', 'Mizoram'], ['NL', 'Nagaland'], ['OD', 'Odisha'], ['PY', 'Puducherry'],
  ['PB', 'Punjab'], ['RJ', 'Rajasthan'], ['SK', 'Sikkim'], ['TN', 'Tamil Nadu'], ['TS', 'Telangana'], ['TR', 'Tripura'],
  ['UP', 'Uttar Pradesh'], ['UK', 'Uttarakhand'], ['WB', 'West Bengal'],
] as const;
export type StateCode = (typeof INDIAN_STATES)[number][0];
export const STATE_NAMES: Record<string, string> = Object.fromEntries(INDIAN_STATES);

/** Whether a shop's selling area covers a courier delivery to this state. */
export function shopShipsTo(shop: { serviceScope: string; serviceStates: string }, state: string): boolean {
  if (shop.serviceScope === 'INDIA') return true;
  if (shop.serviceScope === 'STATES') return shop.serviceStates.split(',').includes(state);
  return false;
}

export const SHIPPING_STATUS_LABELS: Record<string, string> = {
  AWAITING_QUOTE: 'Waiting for shipping details',
  QUOTED: 'Shipping cost set',
  SHIPPED: 'Shipped by courier',
  DELIVERED: 'Delivered',
};
