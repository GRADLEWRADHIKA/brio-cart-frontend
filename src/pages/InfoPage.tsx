import { Link } from 'react-router-dom';
import { useEffect, type ReactNode } from 'react';
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { formatINR } from '@shared/core';
import { useContact, useStoreInfo } from '@/hooks/useStoreInfo';

function Prose({ children }: { children: ReactNode }) {
  return <div className="space-y-4 text-charcoal-700 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-forest-900 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">{children}</div>;
}

function Help() {
  const { whatsapp, phoneDisplay, email } = useContact();
  const { data } = useStoreInfo();
  const s = data?.settings;
  const topics = ['Delivery & timings', 'Order status / changes', 'Item request', 'Payment & billing', 'Bulk / wholesale order'];
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
      <section className="mt-8 rounded-2xl bg-mint-50 p-6">
        <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-forest-900"><MessageCircle className="size-5" /> Questions or support</h2>
        <p className="mt-2 text-charcoal-700">
          Call or WhatsApp us on <span className="select-all font-bold text-forest-800">{phoneDisplay}</span> about:
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {topics.map((label) => (
            <li key={label} className="rounded-full border border-line bg-white px-3 py-1.5 text-sm font-semibold text-charcoal-700">
              {label}
            </li>
          ))}
        </ul>
      </section>
      <section id="about" className="mt-8 scroll-mt-40 rounded-2xl border border-line bg-white p-6">
        <h2 className="font-display text-2xl font-semibold text-forest-900">About Brio Cart</h2>
        <p className="mt-2 text-charcoal-700">
          Brio Cart is Lucknow’s neighbourhood grocery service: fresh vegetables, fruits, dairy and daily essentials, sorted and packed every morning and delivered to{' '}
          {data?.areas.map((a) => a.name).join(', ') || 'our service areas'}. Grocery and Handmade also go by courier across India.
        </p>
        <Link to="/about" className="mt-3 inline-flex font-bold text-forest-700 underline underline-offset-2">
          Read our story →
        </Link>
      </section>
      <Prose>
        <h2 id="faq" className="scroll-mt-40">Frequently asked questions</h2>
        <p><strong>When will my order arrive?</strong> {s?.deliveryNote ?? 'Order by 12 AM for next-morning delivery.'} Available slots: {s?.deliverySlots.join(', ') || '6–8 AM, 8–10 AM'}.</p>
        <p><strong>Where do you deliver?</strong> <MapPin className="inline size-4" /> Everything, including Fresh, {s?.eta?.local.toLowerCase() ?? 'next morning'} to {data?.areas.map((a) => a.name).join(', ')} in Lucknow. Grocery and Handmade go by courier to the rest of Lucknow ({s?.eta?.city ?? '1–3 days'}) and the rest of India ({s?.eta?.india.toLowerCase() ?? 'within 7 days'}). Enter your PIN code at the top of the page to check.</p>
        <p><strong>How much is delivery?</strong> {s ? (s.freeDeliveryThreshold > 0 ? `${formatINR(s.deliveryFee)} on orders below ${formatINR(s.freeDeliveryThreshold)}; free above that.` : `${formatINR(s.deliveryFee)} per order.`) : 'Shown in your cart before you order.'}</p>
        <p><strong>How can I pay?</strong> Cash or UPI when your order is delivered, or online (UPI, cards, net banking) at checkout when it is switched on.</p>
        <p><strong>Can I cancel?</strong> You can cancel from your order page while it is still pending. After that, please call or WhatsApp us on {phoneDisplay}.</p>
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
