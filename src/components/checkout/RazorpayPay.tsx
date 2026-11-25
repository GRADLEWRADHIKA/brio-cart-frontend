import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { formatINR } from '@shared/core';
import { orderApi } from '@/api/endpoints';
import type { Order } from '@/types';
import { BrioMark } from '@/components/ui/Brand';
import { Button } from '@/components/ui/Button';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void };
  }
}

let checkoutScript: Promise<void> | null = null;
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  checkoutScript ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      checkoutScript = null;
      reject(new Error('Could not load the payment window. Check your connection and try again.'));
    };
    document.head.appendChild(s);
  });
  return checkoutScript;
}

/**
 * Pay online with Razorpay Checkout (UPI, cards, net banking, wallets). The server creates the Razorpay
 * order for its own total and verifies the payment afterwards; card and UPI details only go to Razorpay.
 */
export function RazorpayPay({ order, accessKey, testMode }: { order: Order; accessKey?: string; testMode: boolean }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(order.paymentStatus === 'PAID');
  const orderUrl = `/orders/${order.orderNumber}${accessKey ? `?key=${encodeURIComponent(accessKey)}` : ''}`;

  useEffect(() => {
    if (!paid) return;
    void qc.invalidateQueries({ queryKey: ['order', order.orderNumber] });
    const t = setTimeout(() => navigate(orderUrl, { replace: true }), 2200);
    return () => clearTimeout(t);
  }, [paid, navigate, orderUrl, qc, order.orderNumber]);

  const pay = async () => {
    setError(null);
    setBusy('Opening secure payment…');
    try {
      const [rz] = await Promise.all([orderApi.razorpayOrder(order.orderNumber, accessKey), loadCheckout()]);
      if (rz.alreadyPaid || !rz.razorpayOrderId) return setPaid(true);
      const checkout = new window.Razorpay!({
        key: rz.keyId,
        order_id: rz.razorpayOrderId,
        amount: rz.amount,
        currency: rz.currency,
        name: 'Brio Cart',
        description: `Order ${order.orderNumber}`,
        prefill: { name: order.customer.name, contact: order.customer.phone },
        notes: { orderNumber: order.orderNumber },
        theme: { color: '#0c2a1b' },
        handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          setBusy('Confirming payment…');
          try {
            await orderApi.razorpayVerify(order.orderNumber, { razorpayOrderId: r.razorpay_order_id, razorpayPaymentId: r.razorpay_payment_id, razorpaySignature: r.razorpay_signature }, accessKey);
            setPaid(true);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(null);
          }
        },
        modal: { ondismiss: () => setBusy(null) },
      });
      checkout.on('payment.failed', (r) => {
        setError(r.error?.description ?? 'The payment failed. Please try again.');
        setBusy(null);
      });
      checkout.open();
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  };

  const items = order.items.reduce((n, i) => n + i.quantity, 0);
  return (
    <div className="min-h-[80vh] bg-ivory-100 py-6 sm:py-10">
      <div className="container-page max-w-lg">
        <Link to={orderUrl} className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-forest-700">
          <ArrowLeft className="size-4" /> Back to order
        </Link>
        <div className="overflow-hidden rounded-[2rem] bg-white shadow-lift">
          <div className="bg-forest-900 px-6 py-7 text-center text-ivory-50">
            <BrioMark className="mx-auto h-10 w-auto" tone="ivory" />
            <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.2em] text-lime-300">Order {order.orderNumber}</p>
            <p className="mt-1 font-display text-5xl font-semibold tabular-nums">{formatINR(order.total)}</p>
            <p className="mt-1 text-sm text-ivory-50/75">
              {items} item{items === 1 ? '' : 's'} · {order.customer.areaName}
            </p>
          </div>
          <div className="p-6">
            {paid ? (
              <div className="py-4 text-center" role="status">
                <span className="mx-auto grid size-16 animate-pop place-items-center rounded-full bg-leaf-500 text-white">
                  <Check className="size-8" strokeWidth={3} />
                </span>
                <p className="mt-4 font-sans text-2xl font-bold text-charcoal-900">Payment successful</p>
                <p className="mt-1 text-sm text-charcoal-500">Taking you to your order…</p>
              </div>
            ) : (
              <>
                {testMode && (
                  <p className="mb-4 flex items-start gap-2 rounded-2xl border-2 border-dashed border-turmeric-400 bg-turmeric-100 p-3 text-sm font-semibold text-[#6b4500]" role="note">
                    <Sparkles className="mt-0.5 size-4 shrink-0" /> Razorpay test mode: use a Razorpay test card (e.g. 4386 2894 0766 0153, any future expiry, any CVV and OTP). No real money moves.
                  </p>
                )}
                {error && (
                  <p className="mb-4 rounded-2xl bg-tomato-100 p-3 text-sm font-semibold text-tomato-500" role="alert">
                    {error}
                  </p>
                )}
                <Button size="lg" block loading={!!busy} onClick={() => void pay()} icon={<Lock className="size-4" />}>
                  {busy ?? `Pay ${formatINR(order.total)} securely`}
                </Button>
                <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-charcoal-500">
                  <ShieldCheck className="size-4 text-leaf-600" /> UPI, cards, net banking and wallets via Razorpay
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
