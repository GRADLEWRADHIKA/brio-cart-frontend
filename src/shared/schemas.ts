import { z } from 'zod';
import { PAYMENT_METHODS } from './domain';

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
  paymentMethod: z.enum(PAYMENT_METHODS),
  items: z.array(cartLineSchema).min(1, 'Your cart is empty').max(60),
  couponCode: optionalText(30),
  /** Shown to the customer before submit; the server rejects orders without it. */
  confirmed: z.literal(true, { message: 'Please confirm your order' }),
  saveAddress: z.boolean().optional(),
  /** Signed-in customers: pay part or all of the order from store credit. */
  useWalletCredit: z.boolean().optional(),
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

/** Delivery address fields a customer may correct before pickup. */
export const orderAddressSchema = z.object({
  house: addressFields.house,
  street: addressFields.street,
  landmark: addressFields.landmark,
  instructions: optionalText(300),
});
export type OrderAddressInput = z.input<typeof orderAddressSchema>;
