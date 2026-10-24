import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Banknote, ChevronRight, Clock3, PackageX, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
import { buildWhatsAppUrl, formatINR } from '@shared/core';
import { catalogApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import { useCart } from '@/store/cart';
import { useUi } from '@/store/ui';
import { useAddToCart } from '@/hooks/useAddToCart';
import { useContact, useStoreInfo } from '@/hooks/useStoreInfo';
import { ProductCard } from '@/components/products/ProductCard';
import { tintFor } from '@/components/products/tints';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState, Price, ProductImage, QuantityStepper, SectionHeading } from '@/components/ui/misc';
import { WhatsAppIcon } from '@/components/ui/Brand';
import { cn, discountPercent, openExternal } from '@/utils';

export default function ProductPage() {
  const { slug = '' } = useParams();
  const { data, isLoading, error } = useQuery({ queryKey: ['product', slug], queryFn: () => catalogApi.product(slug) });
  const { data: store } = useStoreInfo();
  const { whatsapp } = useContact();
  const product = data?.product;
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const addToCart = useAddToCart();
  const setCartOpen = useUi((s) => s.setCartOpen);

  useEffect(() => {
    if (product) {
      setVariantId((product.variants.find((v) => v.inStock) ?? product.variants[0])!.id);
      setQty(1);
      document.title = `${product.name} — Brio Cart`;
    }
  }, [product]);

  const variant = product?.variants.find((v) => v.id === variantId) ?? product?.variants[0];
  const inCart = useCart((s) => (variant ? (s.lines.find((l) => l.variantId === variant.id)?.quantity ?? 0) : 0));

  if (isLoading) {
    return (
      <div className="container-page grid gap-10 py-10 lg:grid-cols-2" aria-busy>
        <div className="skeleton aspect-square rounded-[2rem]" />
        <div className="space-y-4">
          <div className="skeleton h-5 w-32" />
          <div className="skeleton h-12 w-3/4" />
          <div className="skeleton h-8 w-40" />
          <div className="skeleton h-28 w-full" />
        </div>
      </div>
    );
  }
  if (error || !product || !variant) {
    const nf = error instanceof ApiError && error.status === 404;
    return (
      <EmptyState icon={<PackageX className="size-10" strokeWidth={1.5} />} title={nf ? 'This product isn’t available' : 'Couldn’t load this product'} action={<ButtonLink to="/shop">Browse all groceries</ButtonLink>}>
        {nf ? 'It may have been removed from our catalogue.' : (error as Error)?.message}
      </EmptyState>
    );
  }

  const tint = tintFor(product.category.slug);
  const remaining = Math.max(0, variant.maxQty - inCart);
  const off = discountPercent(variant.price, variant.mrp);
  const fee = store?.settings.deliveryFee ?? 3000;
  const free = store?.settings.freeDeliveryThreshold ?? 14900;

  return (
    <div className="pb-10">
      <div className="container-page pt-6">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-charcoal-500">
          <Link to="/" className="hover:text-forest-700">Home</Link>
          <ChevronRight className="size-3.5" />
          <Link to={`/shop?category=${product.category.slug}`} className="hover:text-forest-700">{product.category.name}</Link>
          <ChevronRight className="size-3.5" />
          <span className="truncate text-charcoal-700">{product.name}</span>
        </nav>
      </div>

      <div className="container-page grid gap-8 pt-6 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <div className={cn('relative aspect-square overflow-hidden rounded-[2rem]', tint.plate)}>
          <div className="absolute inset-[12%] rounded-full bg-white/50 blur-2xl" aria-hidden />
          <ProductImage src={product.imageUrl} alt={product.name} eager sizes="(min-width:1024px) 600px, 100vw" className="relative size-full p-8 sm:p-14" imgClassName={cn(!product.inStock && 'grayscale')} />
          {off > 0 && <span className="absolute left-5 top-5 rounded-full bg-tomato-500 px-3 py-1.5 text-sm font-extrabold text-white">{off}% OFF</span>}
        </div>

        <div className="lg:py-4">
          <Link to={`/shop?category=${product.category.slug}`} className={cn('eyebrow', tint.text)}>
            {product.category.name}
          </Link>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.05] text-forest-900 sm:text-5xl">{product.name}</h1>
          {product.nameHi && (
            <p lang="hi" className="mt-2 font-deva text-xl text-charcoal-500">
              {product.nameHi}
            </p>
          )}
          {product.shop && (
            <p className="mt-2 text-sm text-charcoal-500">
              Sold by{' '}
              <Link to={`/shops/${product.shop.slug}`} className="font-bold text-forest-700 underline underline-offset-2">
                {product.shop.name}
              </Link>
              , a local shop on Brio Cart
            </p>
          )}
          {product.highlight && <p className={cn('mt-3 inline-flex rounded-full bg-white px-3 py-1 text-sm font-bold ring-1', tint.text, tint.ring)}>{product.highlight}</p>}

          <div className="mt-6">
            <Price price={variant.price} mrp={variant.mrp} size="lg" />
            <p className="mt-1 text-sm text-charcoal-500">Price for {variant.label} · inclusive of all taxes</p>
          </div>

          <fieldset className="mt-7">
            <legend className="text-sm font-extrabold text-charcoal-700">Pack size</legend>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {product.variants.map((v) => (
                <label
                  key={v.id}
                  className={cn(
                    'relative flex min-w-28 cursor-pointer flex-col rounded-2xl border-2 px-4 py-3 transition',
                    v.id === variant.id ? 'border-forest-700 bg-mint-50' : 'border-line bg-white hover:border-forest-700/40',
                    !v.inStock && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <input type="radio" name="variant" value={v.id} checked={v.id === variant.id} disabled={!v.inStock} onChange={() => { setVariantId(v.id); setQty(1); }} className="sr-only" />
                  <span className="font-extrabold">{v.label}</span>
                  <span className="text-sm text-charcoal-500">{v.inStock ? formatINR(v.price) : 'Out of stock'}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {variant.inStock ? (
              <>
                <QuantityStepper tone="light" value={qty} max={Math.max(1, remaining)} label={product.name} onChange={(n) => setQty(Math.max(1, n))} />
                <Button
                  size="lg"
                  className="flex-1 sm:flex-none"
                  icon={<ShoppingBag className="size-5" />}
                  disabled={remaining < 1}
                  onClick={() => addToCart(product, variant, Math.min(qty, remaining))}
                >
                  {remaining < 1 ? 'Maximum in cart' : `Add to cart · ${formatINR(variant.price * Math.min(qty, Math.max(remaining, 1)))}`}
                </Button>
              </>
            ) : product.shop && !product.shop.isOpen ? (
              <p className="rounded-2xl bg-turmeric-100 px-4 py-3 text-sm font-semibold text-[#6b4500]">{product.shop.name} is closed right now. You can order once it opens again.</p>
            ) : (
              <Button size="lg" variant="whatsapp" icon={<WhatsAppIcon className="size-5" />} onClick={() => openExternal(buildWhatsAppUrl(whatsapp, `Hello Brio Cart, please let me know when ${product.name} (${variant.label}) is back in stock.`))}>
                Ask when it’s back
              </Button>
            )}
          </div>
          {inCart > 0 && (
            <p className="mt-3 text-sm font-semibold text-leaf-600">
              {inCart} in your cart ·{' '}
              <button type="button" onClick={() => setCartOpen(true)} className="underline underline-offset-2">
                view cart
              </button>
            </p>
          )}
          {variant.lowStock !== null && <p className="mt-2 text-sm font-bold text-[#8a5a00]">Only {variant.lowStock} left</p>}

          {product.description && (
            <div className="mt-8 rounded-3xl bg-ivory-100 p-5">
              <h2 className="font-sans text-sm font-extrabold tracking-normal text-charcoal-700">About this item</h2>
              <p lang={/[ऀ-ॿ]/.test(product.description) ? 'hi' : undefined} className="mt-2 whitespace-pre-line text-charcoal-700">
                {product.description}
              </p>
            </div>
          )}

          <ul className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Clock3, t: 'Morning delivery', s: store?.settings.deliverySlots[0]?.replace(/^Morning,\s*/, '') ?? '6 – 10 AM' },
              { icon: Truck, t: free > 0 ? `Free over ${formatINR(free)}` : 'Home delivery', s: `${formatINR(fee)} below that` },
              { icon: Banknote, t: 'Pay on delivery', s: 'Cash or UPI' },
            ].map(({ icon: Icon, t, s }) => (
              <li key={t} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3">
                <Icon className="size-5 shrink-0 text-leaf-600" />
                <span className="text-sm leading-tight">
                  <span className="block font-bold">{t}</span>
                  <span className="text-charcoal-500">{s}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-center gap-2 text-xs text-charcoal-500">
            <ShieldCheck className="size-4 text-leaf-600" /> Weights of fresh produce can vary slightly by piece.
          </p>
        </div>
      </div>

      {data!.related.length > 0 && (
        <section className="container-page pt-16">
          <SectionHeading eyebrow="You may also like" title={`More from ${product.category.name}`} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {data!.related.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
