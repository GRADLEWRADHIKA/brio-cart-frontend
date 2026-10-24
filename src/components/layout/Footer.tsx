import { Link } from 'react-router-dom';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { buildWhatsAppUrl } from '@shared/core';
import { useCategories, useContact, useStoreInfo } from '@/hooks/useStoreInfo';
import { Logo, WhatsAppIcon } from '@/components/ui/Brand';
import { openExternal } from '@/utils';

export function Footer() {
  const { data: categories } = useCategories();
  const { data } = useStoreInfo();
  const { whatsapp, phoneDisplay, email } = useContact();
  const year = new Date().getFullYear();

  return (
    <footer className="grain relative mt-20 overflow-hidden bg-forest-900 pb-24 text-ivory-50 md:pb-0">
      {/* oversized wordmark watermark */}
      <p aria-hidden className="pointer-events-none absolute -bottom-10 left-1/2 z-0 -translate-x-1/2 select-none whitespace-nowrap font-display text-[22vw] font-semibold leading-none tracking-tighter text-white/[0.035] display-soft">
        brio cart
      </p>
      <div className="container-page relative z-10 grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Logo tone="ivory" />
          <p className="mt-5 max-w-sm text-ivory-50/70">
            Lucknow’s neighbourhood grocery service. Fresh sabzi, fruits, dairy and daily essentials — sorted, packed and delivered every morning.
          </p>
          <button
            type="button"
            onClick={() => openExternal(buildWhatsAppUrl(whatsapp, 'Hello Brio Cart, I would like to place an order.'))}
            className="mt-6 inline-flex items-center gap-2.5 rounded-full bg-[#1fae55] px-5 py-3 font-bold text-white transition hover:bg-[#199a4a]"
          >
            <WhatsAppIcon className="size-5" /> Order on WhatsApp
          </button>
        </div>

        <div>
          <h2 className="eyebrow text-lime-300">Shop</h2>
          <ul className="mt-4 space-y-2.5 text-ivory-50/80">
            {categories?.map((c) => (
              <li key={c.id}>
                <Link to={`/shop?category=${c.slug}`} className="hover:text-white">
                  {c.name}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/shop?collection=essentials" className="hover:text-white">
                Daily Essentials
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="eyebrow text-lime-300">Help</h2>
          <ul className="mt-4 space-y-2.5 text-ivory-50/80">
            <li><Link to="/track" className="hover:text-white">Track your order</Link></li>
            <li><Link to="/shops" className="hover:text-white">Local shops</Link></li>
            <li><Link to="/seller/register" className="hover:text-white">Sell on Brio Cart</Link></li>
            <li><Link to="/account" className="hover:text-white">My account</Link></li>
            <li><Link to="/help" className="hover:text-white">Help & contact</Link></li>
            <li><Link to="/privacy" className="hover:text-white">Privacy policy</Link></li>
            <li><Link to="/terms" className="hover:text-white">Terms of service</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="eyebrow text-lime-300">Reach us</h2>
          <ul className="mt-4 space-y-3.5 text-ivory-50/80">
            <li className="flex gap-3">
              <Phone className="mt-0.5 size-4 shrink-0 text-lime-300" />
              <a href={`tel:+91${whatsapp.replace(/\D/g, '').slice(-10)}`} className="hover:text-white">
                {phoneDisplay} <span className="text-ivory-50/50">(Call / WhatsApp)</span>
              </a>
            </li>
            {email && (
              <li className="flex gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-lime-300" />
                <a href={`mailto:${email}`} className="break-all hover:text-white">{email}</a>
              </li>
            )}
            <li className="flex gap-3">
              <Clock className="mt-0.5 size-4 shrink-0 text-lime-300" />
              <span>{data?.settings.deliveryNote ?? 'Order by 12 AM for next-morning delivery.'}</span>
            </li>
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-lime-300" />
              <span>{(data?.areas ?? []).map((a) => a.name).join(' · ') || 'Aliganj · Vikas Nagar · Mahanagar · Nirala Nagar · Kalyanpur'} — Lucknow</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="relative z-10 border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-6 text-sm text-ivory-50/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Brio Cart, Lucknow. Fresh • Safe • Responsible.</p>
          <p>
            Crafted by <span className="font-semibold text-ivory-50/80">TheGradleW Technologies</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
