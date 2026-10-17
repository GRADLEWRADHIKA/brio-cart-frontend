import { useState } from 'react';
import { buildWhatsAppUrl, composeWhatsAppOrderMessage, type OrderTotals } from '@shared/core';
import type { CartLine } from '@/store/cart';
import { useContact, useStoreInfo } from '@/hooks/useStoreInfo';
import { usePrefs } from '@/store/prefs';
import { WhatsAppIcon } from '@/components/ui/Brand';
import { openExternal } from '@/utils';

/**
 * Sends the cart to the store on WhatsApp as a *request* for confirmation.
 * No order is created by this action, and the UI says so.
 */
export function WhatsAppOrderButton({ lines, totals, customerName, address, areaName, className }: { lines: CartLine[]; totals: OrderTotals; customerName?: string; address?: string; areaName?: string; className?: string }) {
  // The address is only shared when the customer explicitly opts in.
  const [includeAddress, setIncludeAddress] = useState(false);
  const { whatsapp } = useContact();
  const { data } = useStoreInfo();
  const areaId = usePrefs((s) => s.areaId);
  const area = areaName ?? data?.areas.find((a) => a.id === areaId)?.name;
  const send = () => {
    const message = composeWhatsAppOrderMessage({
      customerName,
      area,
      address: includeAddress ? address : undefined,
      lines: lines.map((l) => ({ name: l.name, variantLabel: l.variantLabel, quantity: l.quantity, unitPrice: l.unitPrice })),
      subtotal: totals.subtotal,
      deliveryFee: totals.deliveryFee,
      discount: totals.discount,
      total: totals.total,
    });
    void openExternal(buildWhatsAppUrl(whatsapp, message));
  };
  return (
    <div className={className}>
      <button
        type="button"
        onClick={send}
        disabled={lines.length === 0}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-[#1fae55] bg-white font-bold text-[#13843f] transition hover:bg-[#e7f7ec] disabled:opacity-50"
      >
        <WhatsAppIcon className="size-5" /> Send list on WhatsApp instead
      </button>
      {address && (
        <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 text-xs font-semibold text-charcoal-700">
          <input type="checkbox" checked={includeAddress} onChange={(e) => setIncludeAddress(e.target.checked)} className="size-4 accent-[#1fae55]" />
          Include my delivery address in the message
        </label>
      )}
      <p className="mt-2 text-center text-xs text-charcoal-500">This opens WhatsApp with your list. It is not an order until Brio Cart confirms it.</p>
    </div>
  );
}
