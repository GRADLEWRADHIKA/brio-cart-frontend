import { useEffect } from 'react';
import { ArrowLeft, ArrowRight, Info, Loader2, ShoppingBasket } from 'lucide-react';
import { formatINR } from '@shared/core';
import { useCart } from '@/store/cart';
import { useCartTotals } from '@/hooks/useCartTotals';
import { useCartValidation } from '@/hooks/useCartValidation';
import { CartLineItem, FreeDeliveryMeter, TotalsTable } from '@/components/cart/CartBits';
import { WhatsAppOrderButton } from '@/components/cart/WhatsAppOrderButton';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/misc';

export default function CartPage() {
  const { totals, rules, lines, orderable } = useCartTotals();
  const clear = useCart((s) => s.clear);
  const validation = useCartValidation();
  useEffect(() => {
    document.title = 'Your cart — Brio Cart';
  }, []);

  if (lines.length === 0) {
    return (
      <EmptyState
        className="min-h-[60vh] justify-center"
        icon={<ShoppingBasket className="size-11" strokeWidth={1.4} />}
        title="Your cart is empty"
        action={
          <ButtonLink to="/shop" size="lg" iconRight={<ArrowRight className="size-5" />}>
            Continue shopping
          </ButtonLink>
        }
      >
        Add fresh vegetables, fruits and dairy — they’ll appear here.
      </EmptyState>
    );
  }

  const belowMin = rules.minOrderAmount > 0 && !totals.meetsMinimum;
  const hasIssues = lines.some((l) => l.issue);

  return (
    <div className="container-page py-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl font-semibold text-forest-900 sm:text-5xl">Your cart</h1>
        <button type="button" onClick={() => window.confirm('Remove all items from your cart?') && clear()} className="text-sm font-bold text-charcoal-500 hover:text-tomato-500">
          Clear cart
        </button>
      </div>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_24rem]">
        <section aria-label="Cart items" className="rounded-[1.75rem] border border-line bg-white px-5 sm:px-6">
          {validation.priceChanged && (
            <p className="mt-5 flex gap-2 rounded-2xl bg-turmeric-100 p-3 text-sm font-semibold text-[#7a4f00]" role="status">
              <Info className="mt-0.5 size-4 shrink-0" /> Some prices were updated to today’s rates.
            </p>
          )}
          <ul className="divide-y divide-line">
            {lines.map((l) => (
              <CartLineItem key={l.variantId} line={l} />
            ))}
          </ul>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-36" aria-label="Order summary">
          <div className="rounded-[1.75rem] border border-line bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-semibold text-forest-900">Summary</h2>
              {validation.loading && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-charcoal-500">
                  <Loader2 className="size-3.5 animate-spin" /> Checking prices
                </span>
              )}
            </div>
            <FreeDeliveryMeter totals={totals} threshold={rules.freeDeliveryThreshold} className="mt-4" />
            <div className="mt-5">
              <TotalsTable totals={totals} />
            </div>
            {belowMin && (
              <p className="mt-4 rounded-2xl bg-tomato-100 p-3 text-sm font-semibold text-tomato-500" role="alert">
                Minimum order is {formatINR(rules.minOrderAmount)}. Add {formatINR(rules.minOrderAmount - totals.subtotal)} more.
              </p>
            )}
            {hasIssues && <p className="mt-4 text-sm text-charcoal-500">Items marked unavailable will be left out of your order.</p>}
            <ButtonLink
              to="/checkout"
              size="lg"
              block
              className="mt-5"
              aria-disabled={belowMin || orderable.length === 0}
              onClick={(e) => (belowMin || orderable.length === 0) && e.preventDefault()}
              iconRight={<ArrowRight className="size-5" />}
            >
              Proceed to checkout
            </ButtonLink>
            <ButtonLink to="/shop" variant="ghost" block className="mt-2" icon={<ArrowLeft className="size-4" />}>
              Continue shopping
            </ButtonLink>
          </div>
          <WhatsAppOrderButton lines={orderable} totals={totals} className="rounded-[1.75rem] bg-[#f3fbf5] p-4" />
        </aside>
      </div>
    </div>
  );
}
