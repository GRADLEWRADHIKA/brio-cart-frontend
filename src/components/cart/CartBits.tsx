import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Plus, Store, Trash2, Truck } from 'lucide-react';
import { formatINR, type OrderTotals } from '@shared/core';
import { catalogApi } from '@/api/endpoints';
import { useCart, type CartLine } from '@/store/cart';
import { ProductImage, QuantityStepper } from '@/components/ui/misc';
import { cn } from '@/utils';

export function FreeDeliveryMeter({ totals, threshold, className, onNavigate }: { totals: OrderTotals; threshold: number; className?: string; onNavigate?: () => void }) {
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
      {!free && <FreeDeliveryPicks gap={totals.amountToFreeDelivery} onNavigate={onNavigate} />}
    </div>
  );
}

const PICKS = 3;

/**
 * One-tap items that get the cart over the free-delivery line: from the same seller, not already
 * in the cart, the cheapest that cover the gap first, then the closest below it.
 */
function FreeDeliveryPicks({ gap, onNavigate }: { gap: number; onNavigate?: () => void }) {
  const lines = useCart((s) => s.lines);
  const add = useCart((s) => s.add);
  const sellerId = lines[0]?.shop?.id ?? null;
  const { data } = useQuery({ queryKey: ['products', { sort: 'popular', inStock: true, pageSize: 60 }], queryFn: () => catalogApi.products({ sort: 'popular', inStock: true, pageSize: 60 }), staleTime: 5 * 60_000 });
  const picks = useMemo(() => {
    const inCart = new Set(lines.map((l) => l.productId));
    const options = (data?.items ?? [])
      .filter((p) => (p.shop?.id ?? null) === sellerId && (!p.shop || p.shop.isOpen) && !inCart.has(p.id))
      .flatMap((p) => {
        const v = p.variants.find((x) => x.inStock);
        return v ? [{ product: p, variant: v }] : [];
      });
    const covers = options.filter((o) => o.variant.price >= gap).sort((a, b) => a.variant.price - b.variant.price);
    const below = options.filter((o) => o.variant.price < gap).sort((a, b) => b.variant.price - a.variant.price);
    return [...covers, ...below].slice(0, PICKS);
  }, [data, lines, sellerId, gap]);
  if (!picks.length) return null;
  return (
    // w-0 + min-w-full: the row scrolls inside the card instead of widening the page.
    <div className="mt-3 w-0 min-w-full" data-testid="free-delivery-picks">
      <p className="text-xs font-bold text-charcoal-500">Add one of these to get there</p>
      <ul className="no-scrollbar -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
        {picks.map(({ product, variant }) => (
          <li key={product.id} className="flex w-36 shrink-0 flex-col rounded-2xl bg-white p-2 shadow-sm">
            <Link to={`/product/${product.slug}`} onClick={onNavigate} className="flex items-center gap-2">
              <ProductImage src={product.imageUrl} alt="" className="size-11 shrink-0 rounded-xl bg-ivory-100 p-0.5" />
              <span className="line-clamp-2 text-xs font-bold leading-tight">{product.name}</span>
            </Link>
            <div className="mt-2 flex items-center justify-between gap-1">
              <span className="text-xs text-charcoal-500">
                {variant.label} · <span className="font-extrabold text-charcoal-900">{formatINR(variant.price)}</span>
              </span>
              <button
                type="button"
                onClick={() => add(product, variant, 1)}
                className="grid size-8 shrink-0 place-items-center rounded-full bg-forest-800 text-ivory-50 transition hover:bg-forest-700 active:scale-95"
                aria-label={`Add ${product.name} (${variant.label}) to cart`}
              >
                <Plus className="size-4" />
              </button>
            </div>
            {variant.price >= gap && <span className="mt-1 text-[0.65rem] font-extrabold uppercase text-leaf-600">Unlocks free delivery</span>}
          </li>
        ))}
      </ul>
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
            {line.shop && <p className="truncate text-[0.72rem] text-charcoal-500">from {line.shop.name}</p>}
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

/**
 * A cart with items from several sellers (Brio Cart and local shops) is placed as one order per
 * seller. Each is packed by that seller and has its own delivery fee.
 */
export function SellerSplit({ groups, className }: { groups: Array<{ shop: { name: string } | null; totals: OrderTotals }>; className?: string }) {
  if (groups.length < 2) return null;
  return (
    <div className={cn('rounded-2xl bg-ivory-100 p-3.5 text-sm', className)} data-testid="seller-split">
      <p className="flex items-center gap-2 font-bold text-forest-800">
        <Store className="size-4 text-leaf-600" /> Arrives as {groups.length} orders
      </p>
      <p className="mt-1 text-xs text-charcoal-500">Your items come from {groups.length} sellers. Each packs its own order, with its own delivery fee.</p>
      <ul className="mt-2 space-y-1">
        {groups.map((g, i) => (
          <li key={g.shop?.name ?? `brio-${i}`} className="flex flex-wrap justify-between gap-x-3">
            <span className="truncate">{g.shop?.name ?? 'Brio Cart'}</span>
            <span className="shrink-0 tabular-nums text-charcoal-700">
              {formatINR(g.totals.subtotal)} + {g.totals.deliveryFee ? formatINR(g.totals.deliveryFee) : 'free'} delivery
            </span>
            {g.totals.amountToFreeDelivery > 0 && (
              <span className="w-full text-xs font-bold text-leaf-600">
                <Truck className="mr-1 inline size-3.5" />
                Add {formatINR(g.totals.amountToFreeDelivery)} more from {g.shop?.name ?? 'Brio Cart'} for free delivery
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TotalsTable({ totals, estimate = true, deliveryLabel }: { totals: OrderTotals; estimate?: boolean; /** Shown instead of the fee (courier orders: shipping is set later). */ deliveryLabel?: string }) {
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
        <dt className="text-charcoal-500">{deliveryLabel ? 'Shipping' : 'Delivery'}</dt>
        <dd className={cn('font-bold tabular-nums', !deliveryLabel && totals.deliveryFee === 0 && totals.subtotal > 0 && 'text-leaf-600')}>
          {deliveryLabel ?? (totals.subtotal === 0 ? '—' : totals.deliveryFee === 0 ? 'FREE' : formatINR(totals.deliveryFee))}
        </dd>
      </div>
      <div className="flex items-baseline justify-between border-t border-dashed border-line pt-3">
        <dt className="font-bold">{estimate ? 'Estimated total' : 'Total'}</dt>
        <dd className="text-xl font-extrabold tabular-nums">{formatINR(totals.total)}</dd>
      </div>
    </dl>
  );
}
