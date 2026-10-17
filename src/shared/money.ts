/**
 * All monetary values in Brio Cart are integer paise (1 rupee = 100 paise).
 * Integers avoid floating-point drift when summing order lines.
 */
export type Paise = number;

export const rupeesToPaise = (rupees: number): Paise => Math.round(rupees * 100);

export const paiseToRupees = (paise: Paise): number => paise / 100;

const inrWhole = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
const inrExact = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** ₹1,249 for whole-rupee amounts, ₹12.50 otherwise. */
export function formatINR(paise: Paise): string {
  return paise % 100 === 0 ? inrWhole.format(paise / 100) : inrExact.format(paise / 100);
}

/** Plain-text variant used in WhatsApp messages (no locale-specific spacing characters). */
export function formatINRPlain(paise: Paise): string {
  const rupees = paise / 100;
  return 'Rs. ' + (paise % 100 === 0 ? rupees.toFixed(0) : rupees.toFixed(2));
}
