import { useEffect, type ReactNode } from 'react';
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { buildWhatsAppUrl, formatINR } from '@shared/core';
import { useContact, useStoreInfo } from '@/hooks/useStoreInfo';
import { Button } from '@/components/ui/Button';
import { WhatsAppIcon } from '@/components/ui/Brand';
import { openExternal } from '@/utils';

function Prose({ children }: { children: ReactNode }) {
  return <div className="space-y-4 text-charcoal-700 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-forest-900 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">{children}</div>;
}

function Help() {
  const { whatsapp, phoneDisplay, email } = useContact();
  const { data } = useStoreInfo();
  const s = data?.settings;
  const topics = [
    ['Delivery & timings', 'Hello Brio Cart, I have a question about morning delivery timings.'],
    ['Order status / changes', 'Hello Brio Cart, I would like to check or change my order. My order number is: '],
    ['Item request', 'Hello Brio Cart, I am looking for an item that is not listed: '],
    ['Payment & billing', 'Hello Brio Cart, I have a question about payment for my order.'],
    ['Bulk / wholesale order', 'Hello Brio Cart, I am interested in a bulk order. Items and quantities: '],
  ];
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <a href={`tel:+91${whatsapp.replace(/\D/g, '').slice(-10)}`} className="flex items-center gap-4 rounded-[1.5rem] border border-line bg-white p-5 hover:shadow-soft">
          <Phone className="size-6 text-leaf-600" />
          <span><span className="block text-sm text-charcoal-500">Call us</span><span className="font-bold">{phoneDisplay}</span></span>
        </a>
        {email && (
          <a href={`mailto:${email}`} className="flex items-center gap-4 rounded-[1.5rem] border border-line bg-white p-5 hover:shadow-soft">
            <Mail className="size-6 text-leaf-600" />
            <span className="min-w-0"><span className="block text-sm text-charcoal-500">Email</span><span className="block truncate font-bold">{email}</span></span>
          </a>
        )}
      </div>
      <section className="mt-8 rounded-[1.75rem] bg-[#f3fbf5] p-6">
        <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-forest-900"><MessageCircle className="size-5" /> Message us on WhatsApp</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {topics.map(([label, msg]) => (
            <Button key={label} variant="outline" size="sm" icon={<WhatsAppIcon className="size-4 text-[#1fae55]" />} onClick={() => openExternal(buildWhatsAppUrl(whatsapp, msg))}>
              {label}
            </Button>
          ))}
        </div>
      </section>
      <Prose>
        <h2>Frequently asked questions</h2>
        <p><strong>When will my order arrive?</strong> {s?.deliveryNote ?? 'Order by 12 AM for next-morning delivery.'} Available slots: {s?.deliverySlots.join(', ') || '6–8 AM, 8–10 AM'}.</p>
        <p><strong>Where do you deliver?</strong> <MapPin className="inline size-4" /> {data?.areas.map((a) => a.name).join(', ')} in Lucknow.</p>
        <p><strong>How much is delivery?</strong> {s ? (s.freeDeliveryThreshold > 0 ? `${formatINR(s.deliveryFee)} on orders below ${formatINR(s.freeDeliveryThreshold)}; free above that.` : `${formatINR(s.deliveryFee)} per order.`) : 'Shown in your cart before you order.'}</p>
        <p><strong>How can I pay?</strong> Cash or UPI when your order is delivered. Online payment is not available yet.</p>
        <p><strong>Can I cancel?</strong> You can cancel from your order page while it is still pending. After that, please message us on WhatsApp.</p>
        <p><Clock className="inline size-4" /> Fresh produce weights can vary slightly piece to piece.</p>
      </Prose>
    </>
  );
}

function Privacy() {
  const { email } = useContact();
  return (
    <Prose>
      <p>This policy explains what information Brio Cart collects when you use our website or app, and how we use it.</p>
      <h2>Information we collect</h2>
      <ul>
        <li>Order details: your name, mobile number, delivery address, delivery instructions and the items you order.</li>
        <li>Account details, if you create an account: name, mobile number, optional email, and a securely hashed password (we never store your password itself).</li>
        <li>Device storage: your cart, chosen locality and, only if you opt in, your delivery details are saved on your device to speed up checkout.</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To prepare, deliver and support your orders, and to contact you about them.</li>
        <li>To keep the service secure and prevent misuse.</li>
      </ul>
      <p>We do not sell your personal information. We do not collect or store card details. When you choose to message us on WhatsApp, your message is handled under WhatsApp’s own terms.</p>
      <h2>Your choices</h2>
      <p>You can edit your profile and saved addresses in your account, and ask us to delete your account by contacting {email ?? 'us'}.</p>
      <p className="text-sm text-charcoal-500">This policy should be reviewed by the business owner before publication.</p>
    </Prose>
  );
}

function Terms() {
  return (
    <Prose>
      <p>By placing an order with Brio Cart you agree to these terms.</p>
      <h2>Orders</h2>
      <ul>
        <li>An order is placed when you receive an order number on the confirmation screen. Requests sent on WhatsApp are confirmed by our team separately.</li>
        <li>Prices are confirmed when you place your order. Fresh produce weights may vary slightly.</li>
        <li>If an item becomes unavailable after you order, we will contact you before delivery.</li>
      </ul>
      <h2>Delivery</h2>
      <ul>
        <li>We deliver only to the localities listed at checkout, in the slots shown.</li>
        <li>Delivery charges, if any, are shown before you confirm your order.</li>
      </ul>
      <h2>Payment</h2>
      <p>Payment is collected on delivery by cash or UPI. Online payment is not currently offered.</p>
      <h2>Cancellations</h2>
      <p>You may cancel a pending order from your order page. Once an order is being prepared, please contact us.</p>
      <p className="text-sm text-charcoal-500">These terms should be reviewed by the business owner before publication.</p>
    </Prose>
  );
}

const PAGES = {
  help: { title: 'Help & contact', subtitle: 'We’re a phone call or WhatsApp message away.', body: Help },
  privacy: { title: 'Privacy policy', subtitle: 'Last updated October 2026', body: Privacy },
  terms: { title: 'Terms of service', subtitle: 'Last updated October 2026', body: Terms },
};

export default function InfoPage({ page }: { page: keyof typeof PAGES }) {
  const p = PAGES[page];
  useEffect(() => {
    document.title = `${p.title} — Brio Cart`;
  }, [p.title]);
  const Body = p.body;
  return (
    <div className="container-page max-w-3xl py-10 sm:py-14">
      <h1 className="font-display text-4xl font-semibold text-forest-900 sm:text-5xl">{p.title}</h1>
      <p className="mt-2 text-charcoal-500">{p.subtitle}</p>
      <div className="mt-8">
        <Body />
      </div>
    </div>
  );
}
