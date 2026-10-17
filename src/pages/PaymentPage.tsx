import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Building2, Check, CreditCard, Info, Loader2, Lock, QrCode, ShieldCheck, Smartphone, Sparkles, Wallet } from 'lucide-react';
import { formatINR } from '@shared/core';
import { catalogApi, orderApi } from '@/api/endpoints';
import { useGuestOrders } from '@/store/guest-orders';
import { BrioMark } from '@/components/ui/Brand';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState, Spinner } from '@/components/ui/misc';
import { cn } from '@/utils';

type Method = 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET';

const METHODS: Array<{ id: Method; label: string; sub: string; icon: typeof CreditCard }> = [
  { id: 'UPI', label: 'UPI', sub: 'GPay, PhonePe, Paytm & more', icon: Smartphone },
  { id: 'CARD', label: 'Cards', sub: 'Visa, Mastercard, RuPay', icon: CreditCard },
  { id: 'NETBANKING', label: 'Net banking', sub: 'All major banks', icon: Building2 },
  { id: 'WALLET', label: 'Wallets', sub: 'Paytm, Amazon Pay & more', icon: Wallet },
];

const UPI_APPS = [
  { name: 'Google Pay', tint: 'bg-[#e8f0fe] text-[#1a73e8]' },
  { name: 'PhonePe', tint: 'bg-[#f1e9fb] text-[#5f259f]' },
  { name: 'Paytm', tint: 'bg-[#e6f6fd] text-[#00baf2]' },
  { name: 'BHIM', tint: 'bg-[#fff1e6] text-[#e86a10]' },
];
const BANKS = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra', 'Punjab National Bank', 'Bank of Baroda', 'Union Bank'];
const WALLETS = ['Paytm Wallet', 'Amazon Pay', 'MobiKwik', 'Freecharge'];

function luhn(num: string) {
  const d = num.replace(/\D/g, '');
  if (d.length < 13) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}
const brandOf = (num: string) => {
  const d = num.replace(/\D/g, '');
  if (/^4/.test(d)) return 'VISA';
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'MASTERCARD';
  if (/^(60|65|81|82|508)/.test(d)) return 'RUPAY';
  return '';
};

/** Deterministic, non-scannable QR-like pattern with a DEMO stamp (never encodes a real payee). */
function DemoQr({ seed }: { seed: string }) {
  const cells = useMemo(() => {
    let h = 2166136261;
    for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    const out: boolean[] = [];
    for (let i = 0; i < 25 * 25; i++) {
      h ^= h << 13;
      h ^= h >>> 17;
      h ^= h << 5;
      out.push((h & 3) === 0);
    }
    return out;
  }, [seed]);
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width={7} height={7} fill="#17201b" />
      <rect x={x + 1} y={y + 1} width={5} height={5} fill="#fff" />
      <rect x={x + 2} y={y + 2} width={3} height={3} fill="#17201b" />
    </g>
  );
  return (
    <div className="relative mx-auto w-44">
      <svg viewBox="0 0 25 25" className="w-44 rounded-xl bg-white p-2 shadow-soft" shapeRendering="crispEdges" aria-hidden>
        {cells.map((on, i) => {
          const x = i % 25;
          const y = Math.floor(i / 25);
          const inFinder = (x < 8 && y < 8) || (x > 16 && y < 8) || (x < 8 && y > 16);
          return on && !inFinder ? <rect key={i} x={x} y={y} width={1} height={1} fill="#17201b" /> : null;
        })}
        {finder(0, 0)}
        {finder(18, 0)}
        {finder(0, 18)}
      </svg>
      <span className="absolute inset-0 grid place-items-center">
        <span className="-rotate-12 rounded-lg border-2 border-tomato-500 bg-white/90 px-3 py-1 text-lg font-black tracking-widest text-tomato-500">DEMO</span>
      </span>
    </div>
  );
}

export default function PaymentPage() {
  const { orderNumber = '' } = useParams();
  const [params] = useSearchParams();
  const deviceKey = useGuestOrders((s) => s.keyFor(orderNumber));
  const key = params.get('key') ?? deviceKey ?? undefined;
  const navigate = useNavigate();
  const store = useQuery({ queryKey: ['store'], queryFn: catalogApi.store, staleTime: 60_000 });
  const { data: order, isLoading, error } = useQuery({ queryKey: ['order', orderNumber, key ?? null], queryFn: () => orderApi.get(orderNumber, key) });

  const [method, setMethod] = useState<Method>('UPI');
  const [upiId, setUpiId] = useState('');
  const [upiApp, setUpiApp] = useState<string | null>(null);
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [cvvFocus, setCvvFocus] = useState(false);
  const [bank, setBank] = useState<string | null>(null);
  const [wallet, setWallet] = useState<string | null>(null);
  const [stage, setStage] = useState<'form' | 'processing' | 'success'>('form');
  const [step, setStep] = useState(0);

  const pay = useMutation({
    mutationFn: () => orderApi.demoPay(orderNumber, method, key),
    onSuccess: () => setStage('success'),
    onError: () => setStage('form'),
  });

  useEffect(() => {
    document.title = 'Payment — Brio Cart';
  }, []);
  useEffect(() => {
    if (order?.paymentStatus === 'DEMO_PAID' || order?.paymentStatus === 'PAID') setStage('success');
  }, [order?.paymentStatus]);
  useEffect(() => {
    if (stage !== 'processing') return;
    setStep(0);
    const timers = [setTimeout(() => setStep(1), 900), setTimeout(() => setStep(2), 1800), setTimeout(() => pay.mutate(), 2600)];
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);
  useEffect(() => {
    if (stage !== 'success') return;
    const t = setTimeout(() => navigate(`/orders/${orderNumber}${key ? `?key=${encodeURIComponent(key)}` : ''}`, { replace: true }), 3800);
    return () => clearTimeout(t);
  }, [stage, navigate, orderNumber, key]);

  if (isLoading || store.isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-leaf-600">
        <Spinner className="size-8" />
      </div>
    );
  }
  if (error || !order) {
    return <EmptyState icon={<Lock className="size-10" />} title="We couldn’t open this payment" action={<ButtonLink to="/track">Find my order</ButtonLink>}>Open it from the device you ordered on, or sign in.</EmptyState>;
  }
  if (!store.data?.settings.demoMode && order.paymentStatus === 'UNPAID') {
    return (
      <EmptyState icon={<CreditCard className="size-10" />} title="Online payment isn’t available" action={<ButtonLink to={`/orders/${orderNumber}`}>Back to order</ButtonLink>}>
        Please pay by cash or UPI when your order is delivered.
      </EmptyState>
    );
  }

  const digits = card.number.replace(/\D/g, '');
  const brand = brandOf(digits);
  const expOk = /^(0[1-9]|1[0-2])\/\d{2}$/.test(card.expiry);
  const ready =
    method === 'UPI' ? !!upiApp || /^[\w.-]{2,}@[a-z]{2,}$/i.test(upiId) : method === 'CARD' ? luhn(digits) && expOk && /^\d{3,4}$/.test(card.cvv) && card.name.trim().length > 1 : method === 'NETBANKING' ? !!bank : !!wallet;

  const tile = (active: boolean) => cn('rounded-2xl border-2 p-3 text-left text-sm font-bold transition', active ? 'border-forest-700 bg-mint-50' : 'border-line bg-white hover:border-forest-700/40');

  return (
    <div className="min-h-[80vh] bg-ivory-100 py-6 sm:py-10">
      <div className="container-page max-w-4xl">
        <div className="mb-4 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-turmeric-400 bg-turmeric-100 px-4 py-2.5 text-center text-sm font-bold text-[#6b4500]" role="note">
          <Sparkles className="size-4 shrink-0" /> Demo payment screen — no real payment is processed and no money is charged.
        </div>

        <div className="overflow-hidden rounded-[2rem] bg-white shadow-lift md:grid md:grid-cols-[17rem_1fr]">
          {/* Summary rail */}
          <aside className="grain relative bg-forest-900 p-6 text-ivory-50">
            <div className="relative z-10">
              <div className="flex items-center gap-2">
                <BrioMark className="size-9" tone="ivory" />
                <span className="font-display text-xl font-semibold">Brio Cart</span>
              </div>
              <p className="mt-8 text-xs font-bold uppercase tracking-wider text-ivory-50/60">Amount payable</p>
              <p className="font-display text-4xl font-medium tabular-nums">{formatINR(order.total)}</p>
              <p className="mt-2 text-sm text-ivory-50/70">Order {order.orderNumber}</p>
              <p className="text-sm text-ivory-50/70">{order.items.reduce((n, i) => n + i.quantity, 0)} items · {order.customer.areaName}</p>
              <div className="mt-8 hidden space-y-2 text-xs text-ivory-50/60 md:block">
                <p className="flex items-center gap-2"><ShieldCheck className="size-4 text-lime-300" /> Card details never leave this device</p>
                <p className="flex items-center gap-2"><Lock className="size-4 text-lime-300" /> Encrypted connection</p>
              </div>
            </div>
          </aside>

          <div className="relative min-h-[30rem]">
            {stage === 'form' && (
              <div className="grid md:grid-cols-[12rem_1fr]">
                <nav className="flex gap-2 overflow-x-auto border-b border-line p-3 md:flex-col md:border-b-0 md:border-r" aria-label="Payment method">
                  {METHODS.map(({ id, label, sub, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMethod(id)}
                      aria-pressed={method === id}
                      className={cn('flex shrink-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition', method === id ? 'bg-forest-800 text-ivory-50' : 'hover:bg-ivory-100')}
                    >
                      <Icon className="size-5 shrink-0" />
                      <span>
                        <span className="block text-sm font-extrabold">{label}</span>
                        <span className={cn('hidden text-[0.68rem] md:block', method === id ? 'text-ivory-50/70' : 'text-charcoal-500')}>{sub}</span>
                      </span>
                    </button>
                  ))}
                </nav>

                <div className="p-5 sm:p-6">
                  {method === 'UPI' && (
                    <div className="space-y-5">
                      <div>
                        <p className="text-sm font-extrabold text-charcoal-700">Pay using a UPI app</p>
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {UPI_APPS.map((a) => (
                            <button key={a.name} type="button" onClick={() => { setUpiApp(a.name); setUpiId(''); }} className={cn(tile(upiApp === a.name), 'flex flex-col items-center gap-2')}>
                              <span className={cn('grid size-10 place-items-center rounded-xl text-sm font-black', a.tint)}>{a.name.slice(0, 2)}</span>
                              <span className="text-xs">{a.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-charcoal-400">
                        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
                      </div>
                      <label className="block">
                        <span className="text-sm font-extrabold text-charcoal-700">UPI ID</span>
                        <input value={upiId} onChange={(e) => { setUpiId(e.target.value.trim()); setUpiApp(null); }} placeholder="yourname@okbank" className="mt-2 h-12 w-full rounded-2xl border border-line px-4 focus:border-leaf-500 focus:outline-none focus:ring-4 focus:ring-leaf-500/15" />
                      </label>
                      <details className="rounded-2xl bg-ivory-100 p-4">
                        <summary className="flex cursor-pointer items-center gap-2 text-sm font-extrabold"><QrCode className="size-4" /> Scan QR code</summary>
                        <div className="mt-4">
                          <DemoQr seed={order.orderNumber} />
                          <p className="mt-2 text-center text-xs text-charcoal-500">Demo QR — not a real payment code.</p>
                        </div>
                      </details>
                    </div>
                  )}

                  {method === 'CARD' && (
                    <div className="space-y-4">
                      {/* Live card preview */}
                      <div className="mx-auto h-44 w-full max-w-xs [perspective:1000px]">
                        <div className={cn('relative size-full transition-transform duration-700 [transform-style:preserve-3d]', cvvFocus && '[transform:rotateY(180deg)]')}>
                          <div className="absolute inset-0 flex flex-col justify-between rounded-2xl bg-gradient-to-br from-forest-700 via-forest-800 to-forest-950 p-5 text-ivory-50 shadow-lift [backface-visibility:hidden]">
                            <div className="flex items-center justify-between">
                              <span className="h-7 w-10 rounded-md bg-gradient-to-br from-turmeric-400 to-[#c98b12]" />
                              <span className="text-sm font-black italic tracking-wider">{brand || 'CARD'}</span>
                            </div>
                            <p className="font-mono text-lg tracking-[0.18em]">{(digits.padEnd(16, '•').match(/.{1,4}/g) ?? []).join(' ')}</p>
                            <div className="flex justify-between text-[0.7rem] uppercase">
                              <span className="truncate">{card.name || 'Card holder'}</span>
                              <span>{card.expiry || 'MM/YY'}</span>
                            </div>
                          </div>
                          <div className="absolute inset-0 rounded-2xl bg-forest-900 shadow-lift [backface-visibility:hidden] [transform:rotateY(180deg)]">
                            <div className="mt-6 h-9 bg-charcoal-900" />
                            <div className="mx-5 mt-4 flex h-8 items-center justify-end rounded bg-ivory-50 px-3 font-mono text-forest-900">{card.cvv.replace(/./g, '•') || 'CVV'}</div>
                          </div>
                        </div>
                      </div>
                      <label className="block">
                        <span className="text-sm font-extrabold text-charcoal-700">Card number</span>
                        <input
                          inputMode="numeric"
                          autoComplete="off"
                          value={card.number}
                          onChange={(e) => setCard({ ...card, number: e.target.value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim() })}
                          placeholder="4111 1111 1111 1111"
                          className="mt-2 h-12 w-full rounded-2xl border border-line px-4 font-mono tracking-wider focus:border-leaf-500 focus:outline-none focus:ring-4 focus:ring-leaf-500/15"
                        />
                        {digits.length >= 13 && !luhn(digits) && <span className="mt-1 block text-xs font-semibold text-tomato-500">Check the card number</span>}
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="text-sm font-extrabold text-charcoal-700">Expiry</span>
                          <input
                            inputMode="numeric"
                            autoComplete="off"
                            value={card.expiry}
                            onChange={(e) => {
                              const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                              setCard({ ...card, expiry: v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v });
                            }}
                            placeholder="MM/YY"
                            className="mt-2 h-12 w-full rounded-2xl border border-line px-4 font-mono focus:border-leaf-500 focus:outline-none focus:ring-4 focus:ring-leaf-500/15"
                          />
                        </label>
                        <label className="block">
                          <span className="text-sm font-extrabold text-charcoal-700">CVV</span>
                          <input
                            inputMode="numeric"
                            type="password"
                            autoComplete="off"
                            value={card.cvv}
                            onFocus={() => setCvvFocus(true)}
                            onBlur={() => setCvvFocus(false)}
                            onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                            placeholder="•••"
                            className="mt-2 h-12 w-full rounded-2xl border border-line px-4 font-mono focus:border-leaf-500 focus:outline-none focus:ring-4 focus:ring-leaf-500/15"
                          />
                        </label>
                      </div>
                      <label className="block">
                        <span className="text-sm font-extrabold text-charcoal-700">Name on card</span>
                        <input value={card.name} autoComplete="off" onChange={(e) => setCard({ ...card, name: e.target.value.slice(0, 40) })} className="mt-2 h-12 w-full rounded-2xl border border-line px-4 focus:border-leaf-500 focus:outline-none focus:ring-4 focus:ring-leaf-500/15" />
                      </label>
                      <p className="flex items-start gap-2 rounded-2xl bg-ivory-100 p-3 text-xs text-charcoal-700">
                        <Info className="mt-0.5 size-4 shrink-0" /> Demo: use test card 4111 1111 1111 1111, any future expiry and any CVV. Card details are only checked in your browser and are never sent anywhere.
                      </p>
                    </div>
                  )}

                  {method === 'NETBANKING' && (
                    <div>
                      <p className="text-sm font-extrabold text-charcoal-700">Choose your bank</p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {BANKS.map((b) => (
                          <button key={b} type="button" onClick={() => setBank(b)} className={tile(bank === b)}>
                            <Building2 className="mb-1 size-4 text-forest-700" />
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {method === 'WALLET' && (
                    <div>
                      <p className="text-sm font-extrabold text-charcoal-700">Choose a wallet</p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {WALLETS.map((w) => (
                          <button key={w} type="button" onClick={() => setWallet(w)} className={tile(wallet === w)}>
                            <Wallet className="mb-1 size-4 text-forest-700" />
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {pay.error && <p className="mt-4 rounded-2xl bg-tomato-100 p-3 text-sm font-semibold text-tomato-500">{(pay.error as Error).message}</p>}
                  <Button size="lg" block className="mt-6" disabled={!ready} onClick={() => setStage('processing')} icon={<Lock className="size-4" />}>
                    Pay {formatINR(order.total)}
                  </Button>
                  <Link to={`/orders/${orderNumber}${key ? `?key=${encodeURIComponent(key)}` : ''}`} className="mt-3 flex items-center justify-center gap-1 text-sm font-bold text-charcoal-500 hover:text-forest-700">
                    <ArrowLeft className="size-4" /> Back to order
                  </Link>
                </div>
              </div>
            )}

            {stage === 'processing' && (
              <div className="flex min-h-[30rem] flex-col items-center justify-center p-8 text-center" role="status" aria-live="polite">
                <Loader2 className="size-14 animate-spin text-leaf-500" />
                <p className="mt-6 font-display text-2xl font-semibold text-forest-900">Processing payment…</p>
                <ol className="mt-5 space-y-2 text-sm">
                  {['Securing connection', method === 'UPI' ? 'Waiting for UPI approval' : method === 'CARD' ? 'Verifying card with bank' : 'Redirecting to provider', 'Confirming with Brio Cart'].map((label, i) => (
                    <li key={label} className={cn('flex items-center gap-2 transition', i <= step ? 'text-forest-800' : 'text-charcoal-400')}>
                      {i < step ? <Check className="size-4 text-leaf-500" /> : i === step ? <Loader2 className="size-4 animate-spin" /> : <span className="size-4" />} {label}
                    </li>
                  ))}
                </ol>
                <p className="mt-6 text-xs text-charcoal-400">Demo — no bank is contacted.</p>
              </div>
            )}

            {stage === 'success' && (
              <div className="flex min-h-[30rem] flex-col items-center justify-center p-8 text-center" role="status">
                <span className="relative grid size-24 place-items-center">
                  <span className="absolute inset-0 animate-ping rounded-full bg-leaf-400/30 motion-reduce:hidden" />
                  <span className="relative grid size-24 animate-pop place-items-center rounded-full bg-leaf-500 text-white shadow-lift">
                    <Check className="size-12" strokeWidth={3} />
                  </span>
                </span>
                <p className="mt-6 font-display text-3xl font-semibold text-forest-900">Payment successful</p>
                <p className="mt-1 text-charcoal-500">{formatINR(order.total)} · Order {order.orderNumber}</p>
                <p className="mt-3 rounded-full bg-turmeric-100 px-3 py-1 text-xs font-bold text-[#6b4500]">Demo payment — no money was charged</p>
                <p className="mt-6 text-sm text-charcoal-500">Taking you to live order tracking…</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
