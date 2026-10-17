import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { AlertCircle, Banknote, CreditCard, Lock, MapPin, QrCode, ShoppingBasket, Sunrise, Tag, X } from 'lucide-react';
import { addressFields, computeTotals, formatINR, type PaymentMethod } from '@shared';
import { accountApi, catalogApi, orderApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import { useCart } from '@/store/cart';
import { usePrefs } from '@/store/prefs';
import { useGuestOrders } from '@/store/guest-orders';
import { useAuth } from '@/hooks/useAuth';
import { useCartTotals } from '@/hooks/useCartTotals';
import { useCartValidation } from '@/hooks/useCartValidation';
import { useStoreInfo } from '@/hooks/useStoreInfo';
import { Checkbox, SelectField, TextAreaField, TextField } from '@/components/forms/Field';
import { TotalsTable } from '@/components/cart/CartBits';
import { WhatsAppOrderButton } from '@/components/cart/WhatsAppOrderButton';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState, ProductImage } from '@/components/ui/misc';
import { cn, newIdempotencyKey } from '@/utils';

const formSchema = z.object({
  ...addressFields,
  instructions: z.string().trim().max(300).optional(),
  deliverySlot: z.string().optional(),
  paymentMethod: z.enum(['COD', 'UPI_ON_DELIVERY', 'ONLINE']),
  confirmed: z.boolean().refine((v) => v, 'Please confirm your order details'),
  saveAddress: z.boolean().optional(),
  rememberDetails: z.boolean().optional(),
});
type FormIn = z.input<typeof formSchema>;
type FormOut = z.output<typeof formSchema>;

const IDEM_KEY = 'briocart.checkout.idem';

/** Same payload → same key (safe retries); edited payload → fresh key. */
function idempotencyKeyFor(signature: string) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(IDEM_KEY) ?? 'null') as { sig: string; key: string } | null;
    if (saved?.sig === signature) return saved.key;
    const key = newIdempotencyKey();
    sessionStorage.setItem(IDEM_KEY, JSON.stringify({ sig: signature, key }));
    return key;
  } catch {
    return newIdempotencyKey();
  }
}

const PAYMENT_CARDS: Array<{ id: PaymentMethod; title: string; body: string; icon: typeof Banknote }> = [
  { id: 'COD', title: 'Cash on Delivery', body: 'Pay in cash when your order arrives.', icon: Banknote },
  { id: 'UPI_ON_DELIVERY', title: 'UPI on Delivery', body: 'Scan & pay with GPay, PhonePe or Paytm at your door.', icon: QrCode },
  { id: 'ONLINE', title: 'Pay Online', body: 'UPI, cards, net banking and wallets.', icon: CreditCard },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: store } = useStoreInfo();
  const { totals, orderable, lines, rules } = useCartTotals();
  const validation = useCartValidation();
  const clearCart = useCart((s) => s.clear);
  const applyValidation = useCart((s) => s.applyValidation);
  const prefs = usePrefs();
  const rememberGuestOrder = useGuestOrders((s) => s.remember);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const addresses = useQuery({ queryKey: ['account', 'addresses'], queryFn: accountApi.addresses, enabled: !!user });

  const slots = useMemo(() => store?.settings.deliverySlots ?? [], [store]);
  const methods = store?.settings.paymentMethods;
  const saved = prefs.savedDetails;

  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(formSchema),
    mode: 'onTouched',
    defaultValues: {
      name: saved?.name ?? user?.name ?? '',
      phone: saved?.phone ?? user?.phone ?? '',
      areaId: prefs.areaId ?? '',
      house: saved?.house ?? '',
      street: saved?.street ?? '',
      landmark: saved?.landmark ?? '',
      instructions: '',
      deliverySlot: '',
      paymentMethod: 'COD',
      confirmed: false,
      saveAddress: true,
      rememberDetails: !!saved,
    },
  });
  const { register, handleSubmit, setValue, setError, control, formState } = form;
  const errors = formState.errors;
  const paymentMethod = useWatch({ control, name: 'paymentMethod' });
  const deliverySlot = useWatch({ control, name: 'deliverySlot' });
  const watched = useWatch({ control });

  useEffect(() => {
    document.title = 'Checkout — Brio Cart';
  }, []);
  useEffect(() => {
    if (slots.length && !form.getValues('deliverySlot')) setValue('deliverySlot', slots[0]);
  }, [slots, setValue, form]);
  useEffect(() => {
    if (user && !form.getValues('name')) setValue('name', user.name);
    if (user && !form.getValues('phone')) setValue('phone', user.phone);
  }, [user, setValue, form]);
  // Prefill from the default saved address for signed-in customers.
  useEffect(() => {
    const def = addresses.data?.find((a) => a.isDefault && a.area.isActive);
    if (def && !form.getValues('house')) applyAddress(def.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses.data]);

  function applyAddress(id: string) {
    const a = addresses.data?.find((x) => x.id === id);
    if (!a) return;
    const opts = { shouldValidate: true };
    setValue('name', a.name, opts);
    setValue('phone', a.phone, opts);
    setValue('areaId', a.area.isActive ? a.areaId : '', opts);
    setValue('house', a.house, opts);
    setValue('street', a.street, opts);
    setValue('landmark', a.landmark ?? '', opts);
  }

  const areaName = useMemo(() => store?.areas.find((a) => a.id === watched.areaId)?.name, [store, watched.areaId]);

  // Coupons are validated (and later re-applied) by the server; the client only displays the result.
  const [couponInput, setCouponInput] = useState('');
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const couponCheck = useQuery({
    queryKey: ['coupon', couponCode, orderable.map((l) => `${l.variantId}:${l.quantity}`).join('|')],
    queryFn: () => catalogApi.validateCart(orderable.map((l) => ({ variantId: l.variantId, quantity: l.quantity })), couponCode!),
    enabled: !!couponCode && orderable.length > 0,
  });
  const couponOk = couponCode && couponCheck.data?.coupon ? couponCheck.data.coupon : null;
  const couponError = couponCode ? couponCheck.data?.couponError ?? null : null;
  const shownTotals = useMemo(
    () =>
      couponOk
        ? computeTotals(orderable.map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity })), rules, { amount: couponOk.discount, label: `Coupon ${couponOk.code}` })
        : totals,
    [couponOk, orderable, rules, totals],
  );

  if (lines.length === 0) {
    return (
      <EmptyState className="min-h-[60vh] justify-center" icon={<ShoppingBasket className="size-11" strokeWidth={1.4} />} title="Nothing to check out yet" action={<ButtonLink to="/shop">Browse groceries</ButtonLink>}>
        Your cart is empty.
      </EmptyState>
    );
  }

  const belowMin = rules.minOrderAmount > 0 && !totals.meetsMinimum;
  const closed = store && !store.settings.acceptingOrders;

  const onSubmit = async (v: FormOut) => {
    setServerError(null);
    if (methods && !methods[v.paymentMethod]) {
      setError('paymentMethod', { message: 'Please choose an available payment method' });
      return;
    }
    const items = orderable.map((l) => ({ variantId: l.variantId, quantity: l.quantity }));
    if (items.length === 0) {
      setServerError('None of the items in your cart can be ordered right now.');
      return;
    }
    const payload = {
      customer: { name: v.name, phone: v.phone, areaId: v.areaId, house: v.house, street: v.street, landmark: v.landmark, instructions: v.instructions || undefined },
      deliverySlot: v.deliverySlot || undefined,
      paymentMethod: v.paymentMethod,
      items,
      couponCode: couponOk?.code,
      confirmed: true as const,
      saveAddress: user ? !!v.saveAddress : undefined,
    };
    const idempotencyKey = idempotencyKeyFor(JSON.stringify(payload));
    setSubmitting(true);
    try {
      const { order } = await orderApi.create({ ...payload, idempotencyKey });
      // Only now — after the backend acknowledged the order — do we treat it as placed.
      try {
        sessionStorage.removeItem(IDEM_KEY);
      } catch {
        /* ignore */
      }
      prefs.setArea(v.areaId);
      prefs.setSavedDetails(v.rememberDetails ? { name: v.name, phone: v.phone, house: v.house, street: v.street, landmark: v.landmark } : null);
      if (order.accessKey) rememberGuestOrder({ orderNumber: order.orderNumber, accessKey: order.accessKey, total: order.total, createdAt: order.createdAt });
      clearCart();
      const keyQs = order.accessKey ? `?key=${encodeURIComponent(order.accessKey)}` : '';
      if (order.paymentMethod === 'ONLINE') navigate(`/pay/${order.orderNumber}${keyQs}`, { replace: true });
      else navigate(`/orders/${order.orderNumber}${keyQs}`, { replace: true, state: { justPlaced: true } });
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === 'CART_CHANGED' && e.details?.issues) {
          applyValidation({ lines: [], issues: e.details.issues as never });
          setServerError('Some items changed while you were checking out. Please review your cart below and place the order again.');
        } else if (e.details?.fields) {
          for (const [k, msg] of Object.entries(e.details.fields)) {
            if (k === 'couponCode') setCouponCode(null);
            else setError(k.replace(/^customer\./, '') as keyof FormIn, { message: msg });
          }
          setServerError(e.message);
        } else {
          setServerError(e.message);
        }
      } else setServerError('Something went wrong. Please try again.');
      // The confirmation must be given again after any failure.
      setValue('confirmed', false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-page py-8 sm:py-12">
      <h1 className="font-display text-4xl font-semibold text-forest-900 sm:text-5xl">Checkout</h1>
      <p className="mt-2 flex items-center gap-2 text-sm text-charcoal-500">
        <Lock className="size-4" />
        {user ? `Signed in as ${user.name}` : (
          <>
            Checking out as a guest. <Link to="/login?next=/checkout" className="font-bold text-forest-700 underline underline-offset-2">Sign in</Link> to save addresses and see order history.
          </>
        )}
      </p>

      {closed && (
        <p className="mt-6 flex gap-2 rounded-2xl bg-tomato-100 p-4 font-semibold text-tomato-500" role="alert">
          <AlertCircle className="size-5 shrink-0" /> We’re not accepting new orders right now. Please message us on WhatsApp.
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_25rem]">
        <div className="space-y-6">
          <section className="rounded-[1.75rem] border border-line bg-white p-5 sm:p-7" aria-labelledby="addr-h">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="addr-h" className="flex items-center gap-2 font-display text-2xl font-semibold text-forest-900">
                <MapPin className="size-5 text-leaf-600" /> Delivery details
              </h2>
              {addresses.data && addresses.data.length > 0 && (
                <select className="h-10 rounded-full border border-line bg-ivory-50 px-3 text-sm font-bold" defaultValue="" onChange={(e) => applyAddress(e.target.value)} aria-label="Use a saved address">
                  <option value="" disabled>
                    Use a saved address
                  </option>
                  {addresses.data.map((a) => (
                    <option key={a.id} value={a.id} disabled={!a.area.isActive}>
                      {a.label ?? a.house} · {a.area.name}
                      {!a.area.isActive ? ' (not serviceable)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <TextField label="Full name" autoComplete="name" {...register('name')} error={errors.name?.message} />
              <TextField label="Mobile number" type="tel" inputMode="numeric" autoComplete="tel-national" prefix="+91" maxLength={14} {...register('phone')} error={errors.phone?.message} hint="We’ll call this number if we need to reach you." />
              <SelectField label="Delivery area" {...register('areaId')} error={errors.areaId?.message} className="sm:col-span-2" hint={areaName ? `Lucknow — we deliver to ${areaName}.` : 'We currently deliver only to these Lucknow localities.'}>
                <option value="">Choose your locality</option>
                {store?.areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.pincode ? ` (${a.pincode})` : ''}
                  </option>
                ))}
              </SelectField>
              <TextField label="House / flat / building" autoComplete="address-line1" placeholder="e.g. B-12, Shanti Apartments" {...register('house')} error={errors.house?.message} />
              <TextField label="Street / area details" autoComplete="address-line2" placeholder="e.g. Sector C, near park" {...register('street')} error={errors.street?.message} />
              <TextField label="Landmark" optional placeholder="e.g. Opposite Kapoorthala market" {...register('landmark')} error={errors.landmark?.message} />
              <TextAreaField label="Delivery instructions" optional rows={2} placeholder="e.g. Ring the bell once, leave with the guard" {...register('instructions')} error={errors.instructions?.message} className="sm:col-span-2" />
            </div>
            <div className="mt-5 space-y-3">
              {user ? (
                <Checkbox label="Save this address to my account" {...register('saveAddress')} />
              ) : (
                <Checkbox label="Remember my details on this device" description="Stored only on this device to speed up your next order." {...register('rememberDetails')} />
              )}
            </div>
          </section>

          {slots.length > 0 && (
            <section className="rounded-[1.75rem] border border-line bg-white p-5 sm:p-7" aria-labelledby="slot-h">
              <h2 id="slot-h" className="flex items-center gap-2 font-display text-2xl font-semibold text-forest-900">
                <Sunrise className="size-5 text-marigold-500" /> Delivery slot
              </h2>
              <p className="mt-1 text-sm text-charcoal-500">{store?.settings.deliveryNote}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Delivery slot">
                {slots.map((s) => (
                  <label key={s} className={cn('flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 transition', deliverySlot === s ? 'border-forest-700 bg-mint-50' : 'border-line hover:border-forest-700/40')}>
                    <input type="radio" value={s} {...register('deliverySlot')} className="size-4 accent-forest-700" />
                    <span>
                      <span className="block font-bold">Tomorrow</span>
                      <span className="text-sm text-charcoal-500">{s}</span>
                    </span>
                  </label>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-[1.75rem] border border-line bg-white p-5 sm:p-7" aria-labelledby="pay-h">
            <h2 id="pay-h" className="font-display text-2xl font-semibold text-forest-900">Payment</h2>
            <div className="mt-5 grid gap-3" role="radiogroup" aria-label="Payment method">
              {PAYMENT_CARDS.map(({ id, title, body, icon: Icon }) => {
                const enabled = methods ? methods[id] : id !== 'ONLINE';
                return (
                  <label
                    key={id}
                    className={cn(
                      'flex items-center gap-4 rounded-2xl border-2 p-4 transition',
                      !enabled ? 'cursor-not-allowed border-dashed border-line bg-ivory-100 opacity-70' : paymentMethod === id ? 'cursor-pointer border-forest-700 bg-mint-50' : 'cursor-pointer border-line hover:border-forest-700/40',
                    )}
                  >
                    <input type="radio" value={id} disabled={!enabled} {...register('paymentMethod')} className="size-4 accent-forest-700" />
                    <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl', enabled ? 'bg-mint-100 text-forest-700' : 'bg-ivory-200 text-charcoal-400')}>
                      <Icon className="size-5" />
                    </span>
                    <span>
                      <span className="flex items-center gap-2 font-bold">
                        {title}
                        {id === 'ONLINE' && <span className={cn('rounded-full px-2 py-0.5 text-[0.65rem] font-extrabold uppercase tracking-wider', enabled ? 'bg-turmeric-100 text-[#6b4500]' : 'bg-ivory-200 text-charcoal-500')}>{enabled ? 'Demo' : 'Coming soon'}</span>}
                      </span>
                      <span className="text-sm text-charcoal-500">{body}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.paymentMethod && <p className="mt-2 text-sm font-semibold text-tomato-500">{errors.paymentMethod.message}</p>}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-36" aria-label="Order review">
          <div className="rounded-[1.75rem] border border-line bg-white p-5 sm:p-6">
            <h2 className="font-display text-2xl font-semibold text-forest-900">Review order</h2>
            <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
              {lines.map((l) => (
                <li key={l.variantId} className={cn('flex items-center gap-3', l.issue && 'opacity-50')}>
                  <ProductImage src={l.imageUrl} alt="" className="size-12 shrink-0 rounded-xl bg-ivory-100 p-1" />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="block truncate font-bold">{l.name}</span>
                    <span className="text-charcoal-500">
                      {l.variantLabel} × {l.quantity}
                      {l.issue && <span className="font-semibold text-tomato-500"> · unavailable</span>}
                    </span>
                  </span>
                  <span className="text-sm font-bold tabular-nums">{l.issue ? '—' : formatINR(l.unitPrice * l.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 border-t border-line pt-5">
              <div className="mb-4">
                {couponOk ? (
                  <div className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-leaf-500 bg-mint-50 px-3 py-2.5">
                    <Tag className="size-4 text-leaf-600" />
                    <span className="flex-1 text-sm">
                      <strong>{couponOk.code}</strong> applied · you save {formatINR(couponOk.discount)}
                    </span>
                    <button type="button" onClick={() => { setCouponCode(null); setCouponInput(''); }} className="grid size-7 place-items-center rounded-full hover:bg-white" aria-label="Remove coupon">
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <label className="flex h-11 flex-1 items-center gap-2 rounded-2xl border border-line px-3 focus-within:border-leaf-500">
                      <Tag className="size-4 text-charcoal-400" />
                      <input
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (couponInput) setCouponCode(couponInput); } }}
                        placeholder="Coupon code"
                        aria-label="Coupon code"
                        className="w-full bg-transparent text-sm font-bold uppercase tracking-wider outline-none placeholder:normal-case placeholder:tracking-normal"
                      />
                    </label>
                    <Button variant="secondary" disabled={!couponInput} loading={couponCheck.isFetching} onClick={() => setCouponCode(couponInput)}>
                      Apply
                    </Button>
                  </div>
                )}
                {couponError && <p className="mt-1.5 text-xs font-semibold text-tomato-500" role="alert">{couponError}</p>}
              </div>
              <TotalsTable totals={shownTotals} />
              <p className="mt-2 text-xs text-charcoal-500">Final prices are confirmed by our server when you place the order.</p>
            </div>

            {serverError && (
              <p className="mt-4 flex gap-2 rounded-2xl bg-tomato-100 p-3 text-sm font-semibold text-tomato-500" role="alert">
                <AlertCircle className="mt-0.5 size-4 shrink-0" /> {serverError}
              </p>
            )}
            {belowMin && (
              <p className="mt-4 rounded-2xl bg-tomato-100 p-3 text-sm font-semibold text-tomato-500" role="alert">
                Minimum order value is {formatINR(rules.minOrderAmount)}.
              </p>
            )}

            <div className="mt-5 rounded-2xl bg-ivory-100 p-4">
              <Checkbox
                label={`I confirm my order of ${formatINR(shownTotals.total)}`}
                description={`To be delivered${areaName ? ` in ${areaName}` : ''}${deliverySlot ? `, ${deliverySlot}` : ''}. Payment: ${PAYMENT_CARDS.find((p) => p.id === paymentMethod)?.title ?? ''}.`}
                {...register('confirmed')}
                aria-invalid={!!errors.confirmed || undefined}
              />
              {errors.confirmed && <p className="mt-2 text-sm font-semibold text-tomato-500">{errors.confirmed.message}</p>}
            </div>

            <Button type="submit" size="lg" block className="mt-5" loading={submitting} disabled={belowMin || !!closed || validation.loading || orderable.length === 0}>
              {submitting ? 'Placing order…' : paymentMethod === 'ONLINE' ? `Continue to payment · ${formatINR(shownTotals.total)}` : `Place order · ${formatINR(shownTotals.total)}`}
            </Button>
            <p className="mt-3 text-center text-xs text-charcoal-500">
              By placing this order you agree to our <Link to="/terms" className="underline">terms</Link> and <Link to="/privacy" className="underline">privacy policy</Link>.
            </p>
          </div>
          <WhatsAppOrderButton
            lines={orderable}
            totals={totals}
            customerName={watched.name}
            areaName={areaName}
            address={watched.house && watched.street ? [watched.house, watched.street, watched.landmark, areaName].filter(Boolean).join(', ') : undefined}
            className="rounded-[1.75rem] bg-[#f3fbf5] p-4"
          />
        </aside>
      </form>
    </div>
  );
}
