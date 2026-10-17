import type { ReactNode } from 'react';
import { assetUrl } from '@/config/env';

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="container-page grid min-h-[75vh] items-center gap-10 py-10 lg:grid-cols-2">
      <div className="mx-auto w-full max-w-md">
        <h1 className="font-display text-4xl font-semibold text-forest-900 sm:text-5xl">{title}</h1>
        <p className="mt-2 text-charcoal-500">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>
      <div className="grain relative hidden aspect-[4/5] overflow-hidden rounded-[2.5rem] bg-forest-800 lg:block" aria-hidden>
        <div className="absolute -right-20 -top-20 size-96 rounded-full bg-leaf-500/30 blur-3xl" />
        {[
          ['kinnaur-apple', 'left-[12%] top-[12%] size-44', '-6deg'],
          ['paneer', 'right-[10%] top-[26%] size-40', '8deg'],
          ['pomegranate', 'left-[20%] bottom-[24%] size-48', '4deg'],
          ['orange', 'right-[16%] bottom-[10%] size-36', '-10deg'],
        ].map(([slug, pos, r]) => (
          <div key={slug} className={`absolute ${pos}`} style={{ ['--r' as string]: r }}>
            <div className="grid size-full animate-float-slow place-items-center rounded-full bg-ivory-50 shadow-plate">
              <img src={assetUrl(`/uploads/products/${slug}.webp`) ?? ''} alt="" className="size-[90%] rounded-full object-cover" />
            </div>
          </div>
        ))}
        <p className="absolute inset-x-0 bottom-8 z-10 text-center font-display text-2xl italic text-ivory-50/90">Fresh • Safe • Responsible</p>
      </div>
    </div>
  );
}
