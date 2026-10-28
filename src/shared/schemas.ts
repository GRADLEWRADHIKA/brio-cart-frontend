import { z } from 'zod';
import { INDIAN_STATES, PAYMENT_METHODS, SERVICE_SCOPES } from './domain';

const stateCode = z.enum(INDIAN_STATES.map((s) => s[0]) as [string, ...string[]], 'Choose a state');

/** Indian mobile: 10 digits starting 6–9. Accepts +91 / 0 prefixes and spaces. */
export const indianMobile = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, '').replace(/^(\+91|91|0)(?=\d{10}$)/, ''))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'));

const text = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, min <= 1 ? `${label} is required` : `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const addressFields = {
  name: text(2, 80, 'Name'),
  phone: indianMobile,
  areaId: z.string().min(1, 'Choose a delivery area'),
  house: text(2, 120, 'House / building'),
  street: text(3, 160, 'Street / area'),
  landmark: optionalText(120),
};

export const addressSchema = z.object({
  label: optionalText(40),
  ...addressFields,
  isDefault: z.boolean().optional(),
});
export type AddressInput = z.input<typeof addressSchema>;

export const cartLineSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
});

export const checkoutSchema = z.object({
  idempotencyKey: z.string().min(16).max(80),
  customer: z.object(addressFields).extend({
    instructions: optionalText(300),
  }),
  deliverySlot: optionalText(60),
  /** Admin-defined slot booking; required when the store has defined slots. */
  deliverySlotId: optionalText(40),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a delivery date').optional(),
  /**
   * Shop id → one of that shop's own delivery timings, for the shop's order in this checkout.
   * Shops left out get the standard slot chosen above.
   */
  shopSlots: z.record(z.string().max(40), z.string().trim().min(1).max(60)).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  items: z.array(cartLineSchema).min(1, 'Your cart is empty').max(60),
  couponCode: optionalText(30),
  /** Shown to the customer before submit; the server rejects orders without it. */
  confirmed: z.literal(true, { message: 'Please confirm your order' }),
  saveAddress: z.boolean().optional(),
  /** Signed-in customers: pay part or all of the order from store credit. */
  useWalletCredit: z.boolean().optional(),
  /**
   * Delivery outside the city, by courier: only shop products whose shop ships to this state. The
   * customer's areaId is then ignored (send "courier"); shipping cost and date are set after the shop confirms.
   */
  shipTo: z
    .object({
      state: stateCode,
      city: text(2, 60, 'City'),
      pincode: z.string().trim().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code'),
    })
    .optional(),
});
export type CheckoutInput = z.input<typeof checkoutSchema>;

export const registerSchema = z.object({
  name: text(2, 80, 'Name'),
  phone: indianMobile,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Enter a valid email')
    .max(120)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters'),
});
export type RegisterInput = z.input<typeof registerSchema>;

export const loginSchema = z.object({
  /** Mobile number or email. */
  identifier: z.string().trim().min(3, 'Enter your mobile number or email').max(120),
  password: z.string().min(1, 'Enter your password').max(72),
});
export type LoginInput = z.input<typeof loginSchema>;

export const profileSchema = z.object({
  name: text(2, 80, 'Name'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Enter a valid email')
    .max(120)
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

/** Self-registration for delivery partners. Accounts start PENDING until a super admin approves them. */
export const riderRegisterSchema = registerSchema.extend({
  vehicleNumber: z
    .string()
    .trim()
    .toUpperCase()
    .min(4, 'Enter your vehicle number')
    .max(20, 'Vehicle number must be at most 20 characters'),
});
export type RiderRegisterInput = z.input<typeof riderRegisterSchema>;

/** Shop details a shop owner enters at sign-up and edits later. */
export const shopProfileSchema = z.object({
  name: text(2, 80, 'Shop name'),
  phone: indianMobile,
  address: text(5, 200, 'Shop address'),
  areaId: z.string().min(1, 'Choose the area your shop is in').max(40),
  description: z.string().trim().max(500, 'Description must be at most 500 characters').optional().or(z.literal('').transform(() => undefined)),
  prepMinutes: z.coerce.number().int().min(5, 'At least 5 minutes').max(240, 'At most 4 hours').default(30),
});
export type ShopProfileInput = z.input<typeof shopProfileSchema>;

/** Shop owners sign up with their own account details plus the shop's. They can sell straight away. */
export const shopRegisterSchema = registerSchema.extend({ shop: shopProfileSchema });
export type ShopRegisterInput = z.input<typeof shopRegisterSchema>;

/** Delivery address fields a customer may correct before pickup. */
export const orderAddressSchema = z.object({
  house: addressFields.house,
  street: addressFields.street,
  landmark: addressFields.landmark,
  instructions: optionalText(300),
});
export type OrderAddressInput = z.input<typeof orderAddressSchema>;

/** Where a shop sells: its city only, chosen states, or all of India. */
export const shopSellingSchema = z
  .object({
    serviceScope: z.enum(SERVICE_SCOPES),
    serviceStates: z.array(stateCode).max(40).default([]),
  })
  .refine((v) => v.serviceScope !== 'STATES' || v.serviceStates.length > 0, { message: 'Choose at least one state', path: ['serviceStates'] });
export type ShopSellingInput = z.input<typeof shopSellingSchema>;
