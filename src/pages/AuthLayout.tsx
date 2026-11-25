import type { ReactNode } from 'react';
import { BadgePercent, ShieldCheck, Truck } from 'lucide-react';
import { assetUrl } from '@/config/env';
import { Logo } from '@/components/ui/Brand';

const PERKS = [
  { Icon: Truck, title: 'Fast Delivery', body: 'Get groceries at your doorstep' },
  { Icon: BadgePercent, title: 'Best Prices', body: 'Great deals & everyday savings' },
  { Icon: ShieldCheck, title: 'Safe & Secure', body: 'Your data is always protected' },
];

/** Sign in / create account: one card, illustration and perks on the left, the form on the right. */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="container-page py-8 sm:py-12">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] border border-line bg-white shadow-lift lg:grid-cols-2">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#e6f5ea] to-[#d3eedb] p-10 lg:flex" aria-hidden>
          <div className="absolute -right-24 -top-24 size-80 rounded-full bg-white/40 blur-2xl" />
          <div className="relative mx-auto mt-2 grid size-72 place-items-center">
            {[
              ['kinnaur-apple', 'left-0 top-6 size-28', '-6deg'],
              ['amul-gold-full-cream-milk', 'right-2 top-0 size-24', '8deg'],
              ['tomato', 'left-10 bottom-2 size-24', '4deg'],
              ['broccoli', 'right-0 bottom-8 size-28', '-10deg'],
            ].map(([slug, pos, r]) => (
              <div key={slug} className={`absolute ${pos}`} style={{ ['--r' as string]: r }}>
                <div className="grid size-full animate-float-slow place-items-center rounded-full bg-white shadow-lift">
                  <img src={assetUrl(`/uploads/products/${slug}.webp`) ?? ''} alt="" className="size-[88%] rounded-full object-cover" />
                </div>
              </div>
            ))}
            <span className="relative grid size-28 place-items-center rounded-[2rem] bg-white shadow-lift">
              <Logo compact />
            </span>
          </div>
          <ul className="relative mt-10 space-y-5">
            {PERKS.map(({ Icon, title: t, body }) => (
              <li key={t} className="flex items-center gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-forest-700 shadow-sm">
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block font-semibold text-charcoal-900">{t}</span>
                  <span className="block text-sm text-charcoal-500">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-6 sm:p-10">
          <div className="mx-auto w-full max-w-sm">
            <div className="flex justify-center">
              <Logo />
            </div>
            <h1 className="mt-5 text-center font-sans text-2xl font-bold tracking-tight text-charcoal-900">{title}</h1>
            <p className="mt-1.5 text-center text-sm text-charcoal-500">{subtitle}</p>
            <div className="mt-7">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
