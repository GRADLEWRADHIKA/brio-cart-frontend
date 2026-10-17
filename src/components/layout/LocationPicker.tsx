import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, MapPin } from 'lucide-react';
import { useStoreInfo } from '@/hooks/useStoreInfo';
import { usePrefs } from '@/store/prefs';
import { cn } from '@/utils';

/** Lets the shopper pick their locality; it pre-fills checkout and confirms serviceability. */
export function LocationPicker({ tone = 'light', className }: { tone?: 'light' | 'dark'; className?: string }) {
  const { data } = useStoreInfo();
  const areas = data?.areas ?? [];
  const { areaId, setArea } = usePrefs();
  const current = areas.find((a) => a.id === areaId);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (areaId && areas.length && !current) setArea(null); // area was disabled by the store
  }, [areaId, areas.length, current, setArea]);

  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          'flex items-center gap-2 rounded-full py-1.5 pl-2 pr-3 text-left transition',
          tone === 'light' ? 'hover:bg-ivory-200' : 'text-ivory-50 hover:bg-white/10',
        )}
      >
        <span className={cn('grid size-9 place-items-center rounded-full', tone === 'light' ? 'bg-mint-100 text-forest-700' : 'bg-white/10')}>
          <MapPin className="size-[1.1rem]" />
        </span>
        <span className="leading-tight">
          <span className={cn('block text-[0.68rem] font-bold uppercase tracking-wider', tone === 'light' ? 'text-charcoal-500' : 'text-ivory-50/60')}>Deliver to</span>
          <span className="flex items-center gap-1 text-sm font-extrabold">
            {current ? current.name : 'Choose locality'}
            <ChevronDown className={cn('size-4 transition', open && 'rotate-180')} />
          </span>
        </span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-3xl border border-line bg-white p-2 text-charcoal-900 shadow-lift">
          <p className="px-3 pb-2 pt-2 text-xs font-semibold text-charcoal-500">We currently deliver to these Lucknow localities</p>
          <ul role="listbox" aria-label="Delivery locality">
            {areas.map((a) => (
              <li key={a.id} role="option" aria-selected={a.id === areaId}>
                <button
                  type="button"
                  onClick={() => {
                    setArea(a.id);
                    setOpen(false);
                  }}
                  className={cn('flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left hover:bg-mint-50', a.id === areaId && 'bg-mint-50')}
                >
                  <span>
                    <span className="font-bold">{a.name}</span>
                    {a.pincode && <span className="ml-2 text-xs text-charcoal-500">{a.pincode}</span>}
                  </span>
                  {a.id === areaId && <Check className="size-4 text-leaf-600" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
