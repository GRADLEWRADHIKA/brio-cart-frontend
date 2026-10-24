import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { STOCK_ADJUST_REASONS, STOCK_REASON_LABELS, type StockReason } from '@shared/core';
import { type LowStockItem } from '@/api/admin';
import { Card, PageHeader, td, th } from '@/components/admin/kit';
import { Button } from '@/components/ui/Button';
import { useCatalogScope } from '@/components/admin/CatalogScope';
import { formatDate } from '@/utils';

/** Add or remove stock with a reason. Exported for tests. */
export function StockAdjustForm({ item, onDone }: { item: Pick<LowStockItem, 'variantId' | 'stockQty'>; onDone?: () => void }) {
  const scope = useCatalogScope();
  const qc = useQueryClient();
  const [qty, setQty] = useState('');
  const [direction, setDirection] = useState<'add' | 'remove'>('add');
  const [reason, setReason] = useState<StockReason>('RESTOCK');
  const [note, setNote] = useState('');
  const m = useMutation({
    mutationFn: () => scope.api.adjustStock(item.variantId, { delta: (direction === 'add' ? 1 : -1) * Number(qty), reason, note: note.trim() || undefined }),
    onSuccess: () => {
      setQty('');
      setNote('');
      void qc.invalidateQueries({ queryKey: [scope.key, 'stock'] });
      onDone?.();
    },
  });
  const n = Number(qty);
  const invalid = !qty || !Number.isInteger(n) || n <= 0 || (direction === 'remove' && n > item.stockQty);
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!invalid) m.mutate();
      }}
    >
      <select aria-label="Add or remove" value={direction} onChange={(e) => setDirection(e.target.value as 'add' | 'remove')} className="h-9 rounded-full border border-line bg-white px-3 text-sm font-bold">
        <option value="add">Add</option>
        <option value="remove">Remove</option>
      </select>
      <input aria-label="Quantity" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))} placeholder="Qty" className="h-9 w-20 rounded-full border border-line px-3 text-sm" />
      <select aria-label="Reason" value={reason} onChange={(e) => setReason(e.target.value as StockReason)} className="h-9 rounded-full border border-line bg-white px-3 text-sm">
        {STOCK_ADJUST_REASONS.map((r) => <option key={r} value={r}>{STOCK_REASON_LABELS[r]}</option>)}
      </select>
      <input aria-label="Note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="h-9 min-w-0 flex-1 rounded-full border border-line px-3 text-sm" />
      <Button size="sm" type="submit" disabled={invalid} loading={m.isPending}>Save</Button>
      {direction === 'remove' && n > item.stockQty && <p className="w-full text-xs font-semibold text-tomato-500">Only {item.stockQty} in stock.</p>}
      {m.error && <p className="w-full text-xs font-semibold text-tomato-500">{(m.error as Error).message}</p>}
    </form>
  );
}

function History({ productId }: { productId: string }) {
  const scope = useCatalogScope();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: [scope.key, 'stock', 'history', productId, page],
    queryFn: () => scope.api.stockMovements(productId, page),
    placeholderData: keepPreviousData,
  });
  if (isLoading) return <div className="skeleton h-20 rounded-2xl" />;
  return (
    <div className="mt-3 overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[36rem] text-sm">
        <thead><tr><th className={th}>When</th><th className={th}>Pack</th><th className={th}>Change</th><th className={th}>After</th><th className={th}>Reason</th></tr></thead>
        <tbody className="divide-y divide-line">
          {data?.items.map((m) => (
            <tr key={m.id}>
              <td className={td}>{formatDate(m.createdAt)}</td>
              <td className={td}>{m.variantLabel}</td>
              <td className={`${td} font-bold tabular-nums ${m.delta < 0 ? 'text-tomato-500' : 'text-leaf-600'}`}>{m.delta > 0 ? `+${m.delta}` : m.delta}</td>
              <td className={`${td} tabular-nums`}>{m.balanceAfter}</td>
              <td className={td}>
                {STOCK_REASON_LABELS[m.reason] ?? m.reason}
                {m.orderNumber && <span className="text-charcoal-500"> · {m.orderNumber}</span>}
                {m.note && <span className="block text-xs text-charcoal-500">{m.note}</span>}
                {m.user && <span className="block text-xs text-charcoal-400">by {m.user.name}</span>}
              </td>
            </tr>
          ))}
          {data?.items.length === 0 && <tr><td className={td} colSpan={5}>No stock changes recorded yet.</td></tr>}
        </tbody>
      </table>
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 p-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Newer</Button>
          <span className="text-xs font-semibold">Page {page} of {data.totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Older</Button>
        </div>
      )}
    </div>
  );
}

/** Low-stock list with stock adjustments and per-product movement history. */
export default function Stock() {
  const scope = useCatalogScope();
  const canAdjust = scope.can('stockAdjust');
  const [threshold, setThreshold] = useState<number | undefined>();
  const [open, setOpen] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: [scope.key, 'stock', 'low', threshold], queryFn: () => scope.api.lowStock(threshold), refetchInterval: 60_000 });
  return (
    <>
      <PageHeader
        title="Stock"
        subtitle={data ? `${data.items.length} tracked pack sizes at or below ${data.threshold} units` : undefined}
        actions={
          <label className="flex items-center gap-2 text-sm font-bold">
            Threshold
            <input type="number" min={0} aria-label="Low-stock threshold" value={threshold ?? data?.threshold ?? ''} onChange={(e) => setThreshold(e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)))} className="h-9 w-20 rounded-full border border-line px-3" />
          </label>
        }
      />
      {isLoading && <div className="skeleton h-40 rounded-3xl" />}
      <div className="space-y-3">
        {data?.items.map((i) => (
          <Card key={i.variantId}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <Link to={`${scope.base}/products/${i.product.id}`} className="font-bold text-forest-900 hover:underline">{i.product.name}</Link>
                <span className="text-charcoal-500"> · {i.label}</span>
                <p className={`text-sm font-extrabold ${i.stockQty === 0 ? 'text-tomato-500' : 'text-kumkum-700'}`}>{i.stockQty === 0 ? 'Out of stock' : `${i.stockQty} left`}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setOpen(open === i.variantId ? null : i.variantId)}>{open === i.variantId ? 'Hide history' : 'History'}</Button>
            </div>
            {canAdjust && <div className="mt-3"><StockAdjustForm item={i} /></div>}
            {open === i.variantId && <History productId={i.product.id} />}
          </Card>
        ))}
        {data?.items.length === 0 && <p className="rounded-3xl border border-line bg-white p-8 text-center text-charcoal-500">Nothing is running low.</p>}
      </div>
    </>
  );
}
