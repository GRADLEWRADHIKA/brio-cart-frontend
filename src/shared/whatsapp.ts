import { formatINRPlain, type Paise } from './money';

/**
 * Normalise an Indian mobile number to wa.me international format (no "+", no spaces).
 * Accepts "8957032882", "+91 89570 32882", "08957032882", "918957032882".
 */
export function toWhatsAppNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return '91' + digits;
  if (digits.length === 11 && digits.startsWith('0')) return '91' + digits.slice(1);
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  throw new Error(`Unsupported WhatsApp number: ${raw}`);
}

export function buildWhatsAppUrl(number: string, message?: string): string {
  const base = `https://wa.me/${toWhatsAppNumber(number)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export interface WhatsAppOrderLine {
  name: string;
  variantLabel: string;
  quantity: number;
  unitPrice: Paise;
}

export interface WhatsAppOrderDetails {
  /** Present only when the order was actually created by the backend. */
  orderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  area?: string;
  /** Included only when the customer explicitly opts in. */
  address?: string;
  deliverySlot?: string;
  paymentMethod?: string;
  lines: WhatsAppOrderLine[];
  subtotal: Paise;
  deliveryFee: Paise;
  discount?: Paise;
  total: Paise;
}

/**
 * Compose a readable order message. When there is no backend order number the message is
 * explicitly framed as a request for confirmation — opening WhatsApp is not an order.
 */
export function composeWhatsAppOrderMessage(d: WhatsAppOrderDetails): string {
  const out: string[] = [];
  if (d.orderNumber) {
    out.push(`Hello Brio Cart, I have placed order ${d.orderNumber} on your website/app.`);
  } else {
    out.push('Hello Brio Cart, I would like to order the following. Please confirm availability and the final amount.');
  }
  out.push('');
  if (d.customerName) out.push(`Name: ${d.customerName}`);
  if (d.customerPhone) out.push(`Phone: ${d.customerPhone}`);
  if (d.area) out.push(`Delivery area: ${d.area}, Lucknow`);
  if (d.address) out.push(`Address: ${d.address}`);
  if (d.deliverySlot) out.push(`Preferred slot: ${d.deliverySlot}`);
  if (d.paymentMethod) out.push(`Payment: ${d.paymentMethod}`);
  if (out[out.length - 1] !== '') out.push('');

  out.push('Items:');
  d.lines.forEach((l, i) => {
    out.push(
      `${i + 1}. ${l.name} (${l.variantLabel}) x ${l.quantity} @ ${formatINRPlain(l.unitPrice)} = ${formatINRPlain(
        l.unitPrice * l.quantity,
      )}`,
    );
  });
  out.push('');
  out.push(`Subtotal: ${formatINRPlain(d.subtotal)}`);
  if (d.discount) out.push(`Discount: -${formatINRPlain(d.discount)}`);
  out.push(`Delivery: ${d.deliveryFee === 0 ? 'Free' : formatINRPlain(d.deliveryFee)}`);
  out.push(`${d.orderNumber ? 'Order total' : 'Estimated total'}: ${formatINRPlain(d.total)}`);
  return out.join('\n');
}
