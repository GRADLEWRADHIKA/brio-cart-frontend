import { Link } from 'react-router-dom';
import { AlertTriangle, Trash2, Truck } from 'lucide-react';
import { formatINR, type OrderTotals } from '@shared/core';
import { useCart, type CartLine } from '@/store/cart';
import { ProductImage, QuantityStepper } from '@/components/ui/misc';
import { cn } from '@/utils';

export function FreeDeliveryMeter({ totals, threshold, className }: { totals: OrderTotals; threshold: number; className?: string }) {
  if (threshold <= 0 || totals.subtotal === 0) return null;
  const pct = Math.min(100, Math.round(((threshold - totals.amountToFreeDelivery) / threshold) * 100));
  const free = totals.amountToFreeDelivery === 0;
  return (
    <div className={cn('rounded-2xl bg-mint-50 p-3.5', className)}>
      <p className="flex items-center gap-2 text-sm font-bold text-forest-800" aria-live="polite">
        <Truck className="size-4 text-leaf-600" />
        {free ? 'You’ve unlocked free delivery!' : <>Add {formatINR(totals.amountToFreeDelivery)} more for free delivery</>}
      </p>
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-mint-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to free delivery">
        <div className="h-full rounded-full bg-gradient-to-r from-leaf-500 to-lime-300 transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function CartLineItem({ line, compact, onNavigate }: { line: CartLine; compact?: boolean; onNavigate?: () => void }) {
  const { setQuantity, remove, changeVariant } = useCart();
  const options = line.options?.filter((o) => o.inStock || o.id === line.variantId) ?? [];
  return (
    <li className={cn('flex gap-3 py-4', line.issue && 'opacity-90')} data-testid="cart-line">
      <Link to={`/product/${line.slug}`} onClick={onNavigate} className="shrink-0">
        <ProductImage src={line.imageUrl} alt={line.name} className={cn('rounded-2xl bg-ivory-100 p-1.5', compact ? 'size-18' : 'size-22')} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link to={`/product/${line.slug}`} onClick={onNavigate} className="line-clamp-2 font-bold leading-snug hover:text-forest-700">
              {line.name}
            </Link>
            {options.length > 1 ? (
              <label className="mt-1 inline-flex items-center gap-1 text-xs text-charcoal-500">
                <span className="sr-only">Pack size</span>
                <select
                  value={line.variantId}
                  onChange={(e) => changeVariant(line.variantId, e.target.value)}
                  className="rounded-full border border-line bg-ivory-50 px-2 py-1 text-xs font-bold text-charcoal-700"
                >
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label} · {formatINR(o.price)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="mt-0.5 text-xs font-semibold text-charcoal-500">
                {line.variantLabel} · {formatINR(line.unitPrice)}
              </p>
            )}
          </div>
          <button type="button" onClick={() => remove(line.variantId)} className="grid size-8 shrink-0 place-items-center rounded-full text-charcoal-400 transition hover:bg-tomato-100 hover:text-tomato-500" aria-label={`Remove ${line.name} from cart`}>
            <Trash2 className="size-4" />
          </button>
        </div>
        {line.issue ? (
          <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-tomato-100 px-2.5 py-2 text-xs font-semibold text-tomato-500" role="alert">
            <AlertTriangle className="mt-px size-3.5 shrink-0" /> {line.issue.message}. It won’t be included in your order.
          </p>
        ) : (
          <div className="mt-2.5 flex items-center justify-between">
            <QuantityStepper size="sm" tone="light" value={line.quantity} max={line.maxQty} label={line.name} onChange={(n) => setQuantity(line.variantId, n)} />
            <span className="font-extrabold tabular-nums">{formatINR(line.unitPrice * line.quantity)}</span>
          </div>
        )}
      </div>
    </li>
  );
}

export function TotalsTable({ totals, estimate = true }: { totals: OrderTotals; estimate?: boolean }) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-charcoal-500">Items ({totals.itemCount})</dt>
        <dd className="font-bold tabular-nums">{formatINR(totals.subtotal)}</dd>
      </div>
      {totals.discount > 0 && (
        <div className="flex justify-between text-leaf-600">
          <dt>{totals.discountLabel ?? 'Discount'}</dt>
          <dd className="font-bold tabular-nums">−{formatINR(totals.discount)}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt className="text-charcoal-500">Delivery</dt>
        <dd className={cn('font-bold tabular-nums', totals.deliveryFee === 0 && totals.subtotal > 0 && 'text-leaf-600')}>
          {totals.subtotal === 0 ? '—' : totals.deliveryFee === 0 ? 'FREE' : formatINR(totals.deliveryFee)}
        </dd>
      </div>
      <div className="flex items-baseline justify-between border-t border-dashed border-line pt-3">
        <dt className="font-bold">{estimate ? 'Estimated total' : 'Total'}</dt>
        <dd className="text-xl font-extrabold tabular-nums">{formatINR(totals.total)}</dd>
      </div>
    </dl>
  );
}
