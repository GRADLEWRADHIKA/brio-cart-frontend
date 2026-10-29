import { useEffect, useRef } from 'react';
import { ShoppingBasket, X } from 'lucide-react';
import { useUi } from '@/store/ui';
import { useCartTotals } from '@/hooks/useCartTotals';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/misc';
import { CartLineItem, FreeDeliveryMeter, SellerSplit, TotalsTable } from './CartBits';
import { cn } from '@/utils';

export function CartDrawer() {
  const open = useUi((s) => s.cartOpen);
  const setOpen = useUi((s) => s.setCartOpen);
  const { totals, rules, lines, groups } = useCartTotals();
  const panel = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, setOpen]);

  return (
    <div className={cn('fixed inset-0 z-[70]', !open && 'pointer-events-none')} aria-hidden={!open} inert={!open}>
      <div className={cn('absolute inset-0 bg-forest-950/40 backdrop-blur-[2px] transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0')} onClick={close} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
        tabIndex={-1}
        className={cn(
          'safe-bottom absolute inset-y-0 right-0 flex w-full max-w-[26rem] flex-col bg-ivory-50 shadow-2xl outline-none transition-transform duration-500 ease-out-expo',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <header className="safe-top flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-2xl font-semibold text-forest-900">Your cart</h2>
          <button type="button" onClick={close} className="grid size-10 place-items-center rounded-full hover:bg-ivory-200" aria-label="Close cart">
            <X className="size-5" />
          </button>
        </header>
        {lines.length === 0 ? (
          <EmptyState icon={<ShoppingBasket className="size-10" strokeWidth={1.5} />} title="Your basket is empty" action={<Button onClick={close}>Start shopping</Button>}>
            Fresh sabzi, fruits and dairy are a tap away.
          </EmptyState>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5">
              {groups.length > 1 ? <SellerSplit groups={groups} className="mt-4" /> : <FreeDeliveryMeter totals={totals} threshold={rules.freeDeliveryThreshold} className="mt-4" onNavigate={close} />}
              <ul className="divide-y divide-line">
                {lines.map((l) => (
                  <CartLineItem key={l.variantId} line={l} compact onNavigate={close} />
                ))}
              </ul>
            </div>
            <footer className="border-t border-line bg-white px-5 pb-5 pt-4">
              <TotalsTable totals={totals} />
              <div className="mt-4 grid grid-cols-2 gap-2">
                <ButtonLink to="/cart" variant="outline" onClick={close}>
                  View cart
                </ButtonLink>
                <ButtonLink to="/checkout" onClick={close}>
                  Checkout
                </ButtonLink>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
