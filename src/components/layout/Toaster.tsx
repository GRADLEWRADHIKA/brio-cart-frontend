import { Link } from 'react-router-dom';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useUi } from '@/store/ui';
import { ProductImage } from '@/components/ui/misc';
import { cn } from '@/utils';

export function Toaster() {
  const { toasts, dismiss, setCartOpen } = useUi();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[90] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:px-6" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex w-full max-w-sm animate-fade-up items-center gap-3 rounded-3xl bg-forest-900 p-2.5 pr-3 text-ivory-50 shadow-2xl ring-1 ring-white/10"
        >
          {t.imageUrl ? (
            <ProductImage src={t.imageUrl} alt="" className="size-12 shrink-0 rounded-2xl bg-ivory-50 p-1" />
          ) : (
            <span className={cn('grid size-10 shrink-0 place-items-center rounded-2xl', t.tone === 'error' ? 'bg-tomato-500/20 text-tomato-100' : 'bg-white/10 text-lime-300')}>
              {t.tone === 'error' ? <XCircle className="size-5" /> : t.tone === 'success' ? <CheckCircle2 className="size-5" /> : <Info className="size-5" />}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold">{t.title}</p>
            {t.description && <p className="truncate text-xs text-ivory-50/70">{t.description}</p>}
          </div>
          {t.action && (
            <Link
              to={t.action.to}
              onClick={(e) => {
                if (t.action?.to === '/cart') {
                  e.preventDefault();
                  setCartOpen(true);
                }
                dismiss(t.id);
              }}
              className="shrink-0 rounded-full bg-lime-300 px-3 py-1.5 text-xs font-extrabold text-forest-900"
            >
              {t.action.label}
            </Link>
          )}
          <button type="button" onClick={() => dismiss(t.id)} className="grid size-7 shrink-0 place-items-center rounded-full text-ivory-50/60 hover:bg-white/10" aria-label="Dismiss">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
