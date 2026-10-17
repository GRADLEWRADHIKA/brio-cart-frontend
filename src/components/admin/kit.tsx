import type { ReactNode } from 'react';
import { cn } from '@/utils';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold text-forest-900 sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-charcoal-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className, title, actions }: { children: ReactNode; className?: string; title?: string; actions?: ReactNode }) {
  return (
    <section className={cn('rounded-3xl border border-line bg-white p-5 sm:p-6', className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-sans text-base font-extrabold tracking-tight text-forest-900">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, tone = 'default' }: { label: string; value: ReactNode; hint?: string; tone?: 'default' | 'lime' | 'warn' }) {
  return (
    <div className={cn('rounded-3xl p-5', tone === 'lime' ? 'bg-forest-800 text-ivory-50' : tone === 'warn' ? 'bg-turmeric-100' : 'border border-line bg-white')}>
      <p className={cn('text-xs font-extrabold uppercase tracking-wider', tone === 'lime' ? 'text-lime-300' : 'text-charcoal-500')}>{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{value}</p>
      {hint && <p className={cn('mt-1 text-xs', tone === 'lime' ? 'text-ivory-50/60' : 'text-charcoal-500')}>{hint}</p>}
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50', checked ? 'bg-leaf-500' : 'bg-charcoal-400/40')}
    >
      <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', checked ? 'left-[1.4rem]' : 'left-0.5')} />
    </button>
  );
}

export const th = 'px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-charcoal-500';
export const td = 'px-4 py-3 align-middle';
