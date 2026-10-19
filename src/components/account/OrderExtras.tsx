import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileDown } from 'lucide-react';
import { formatINR, hasPermission, REFUND_METHOD_LABELS } from '@shared/core';
import { accountApi, invoiceUrl } from '@/api/endpoints';
import { useAuth } from '@/hooks/useAuth';
import { useStoreInfo } from '@/hooks/useStoreInfo';
import { isNative } from '@/config/env';
import { Button } from '@/components/ui/Button';
import type { Order, ReturnRequestRow } from '@/types';

/** Customer-side return request: delivered orders, signed-in owner, within the store's window. Exported for tests. */
export function ReturnRequestForm({ orderNumber, onDone }: { orderNumber: string; onDone?: (r: ReturnRequestRow) => void }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const m = useMutation({
    mutationFn: () => accountApi.requestReturn(orderNumber, reason.trim()),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ['account', 'returns'] });
      onDone?.(r);
    },
  });
  return (
    <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
      <label htmlFor="return-reason" className="text-sm font-bold">What went wrong?</label>
      <textarea id="return-reason" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} rows={3} className="w-full rounded-2xl border border-line p-3 text-sm" placeholder="e.g. tomatoes were squashed" />
      <Button type="submit" size="sm" disabled={reason.trim().length < 5} loading={m.isPending}>Request return</Button>
      {m.error && <p className="text-sm font-semibold text-tomato-500">{(m.error as Error).message}</p>}
    </form>
  );
}

const STATUS_TEXT: Record<ReturnRequestRow['status'], string> = { PENDING: 'Return requested, waiting for the store', APPROVED: 'Return approved', REJECTED: 'Return not approved' };

/** Invoice download and return request/status on the order page. */
export function OrderExtras({ order, accessKey }: { order: Order; accessKey?: string | null }) {
  const { user } = useAuth();
  const { data: store } = useStoreInfo();
  const canReturn = hasPermission(user?.role, 'return:request');
  const returns = useQuery({ queryKey: ['account', 'returns'], queryFn: accountApi.returns, enabled: canReturn && order.status === 'DELIVERED' });
  const [open, setOpen] = useState(false);
  const existing = returns.data?.find((r) => r.orderNumber === order.orderNumber);
  const windowH = store?.settings.returnWindowHours ?? 0;
  const deliveredAt = order.delivery.deliveredAt ? new Date(order.delivery.deliveredAt).getTime() : null;
  const inWindow = windowH > 0 && deliveredAt !== null && Date.now() - deliveredAt <= windowH * 3600_000;
  if (order.status === 'CANCELLED') return null;
  return (
    <section className="rounded-[1.75rem] border border-line bg-white p-5 sm:p-7">
      {!isNative && (
        <a href={invoiceUrl(order.orderNumber, accessKey)} className="inline-flex items-center gap-2 text-sm font-bold text-forest-800 underline" download>
          <FileDown className="size-4" /> Download invoice (PDF)
        </a>
      )}
      {(order.walletApplied ?? 0) > 0 && <p className="mt-2 text-sm text-charcoal-700">{formatINR(order.walletApplied!)} paid with store credit.</p>}
      {order.status === 'DELIVERED' && canReturn && (
        <div className="mt-4 border-t border-line pt-4">
          {existing ? (
            <p className="text-sm">
              <strong>{STATUS_TEXT[existing.status]}</strong>
              {existing.status === 'APPROVED' && existing.refundAmount != null && existing.refundMethod && ` · ${formatINR(existing.refundAmount)} ${REFUND_METHOD_LABELS[existing.refundMethod].toLowerCase()}`}
              {existing.adminNote && <span className="block text-charcoal-500">“{existing.adminNote}”</span>}
            </p>
          ) : inWindow ? (
            open ? <ReturnRequestForm orderNumber={order.orderNumber} /> : <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Problem with this order? Request a return</Button>
          ) : (
            windowH > 0 && <p className="text-sm text-charcoal-500">Returns can be requested within {windowH} hours of delivery.</p>
          )}
        </div>
      )}
    </section>
  );
}
