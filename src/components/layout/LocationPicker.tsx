import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, MapPin, Truck } from 'lucide-react';
import { catalogApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import { useStoreInfo } from '@/hooks/useStoreInfo';
import { useShopperLocation } from '@/hooks/useShopper';
import { usePrefs } from '@/store/prefs';
import type { PincodeInfo } from '@/types';
import { cn } from '@/utils';

/**
 * Where to deliver: any Indian PIN code, or one of Brio Cart's Lucknow localities. A locality gets
 * next-morning rider delivery of everything; anywhere else gets Grocery and Handmade by courier.
 */
export function LocationPicker({ tone = 'light', variant = 'full', className }: { tone?: 'light' | 'dark'; variant?: 'full' | 'pill'; className?: string }) {
  const { data } = useStoreInfo();
  const areas = data?.areas ?? [];
  const { areaId, setArea, courier, setCourier } = usePrefs();
  const shopper = useShopperLocation();
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

  const chosen = current || courier;
  const label = chosen ? shopper.label : 'Lucknow';

  return (
    <div ref={ref} className={cn('relative', className)}>
      {variant === 'pill' ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={`Delivery location: ${chosen ? shopper.label : 'not chosen'}`}
          className="flex h-11 items-center gap-2 whitespace-nowrap rounded-full border border-line bg-white px-3.5 text-sm font-medium text-charcoal-900 transition hover:border-forest-700/40"
        >
          <MapPin className="size-4 text-charcoal-700" />
          <span className="max-w-32 truncate">{label}</span>
          <ChevronDown className={cn('size-4 text-charcoal-500 transition', open && 'rotate-180')} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="dialog"
          className={cn('flex items-center gap-2 rounded-full py-1.5 pl-2 pr-3 text-left transition', tone === 'light' ? 'hover:bg-ivory-200' : 'text-ivory-50 hover:bg-white/10')}
        >
          <span className={cn('grid size-9 place-items-center rounded-full', tone === 'light' ? 'bg-mint-100 text-forest-700' : 'bg-white/10')}>
            <MapPin className="size-[1.1rem]" />
          </span>
          <span className="leading-tight">
            <span className={cn('block text-[0.68rem] font-bold uppercase tracking-wider', tone === 'light' ? 'text-charcoal-500' : 'text-ivory-50/60')}>Deliver to</span>
            <span className="flex items-center gap-1 text-sm font-extrabold">
              <span className="max-w-40 truncate">{chosen ? shopper.label : 'Choose location'}</span>
              <ChevronDown className={cn('size-4 transition', open && 'rotate-180')} />
            </span>
          </span>
        </button>
      )}
      {open && (
        <LocationPanel
          onDone={() => setOpen(false)}
          areas={areas}
          areaId={areaId}
          setArea={setArea}
          courierPin={courier?.pincode ?? null}
          setCourier={setCourier}
        />
      )}
    </div>
  );
}

function LocationPanel({
  onDone,
  areas,
  areaId,
  setArea,
  courierPin,
  setCourier,
}: {
  onDone: () => void;
  areas: Array<{ id: string; name: string; pincode: string | null }>;
  areaId: string | null;
  setArea: (id: string | null) => void;
  courierPin: string | null;
  setCourier: ReturnType<typeof usePrefs.getState>['setCourier'];
}) {
  const [pin, setPin] = useState(courierPin ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PincodeInfo | null>(null);
  const valid = /^[1-9]\d{5}$/.test(pin);

  const check = async () => {
    if (!valid) return setError('Enter a 6-digit PIN code');
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const info = await catalogApi.pincode(pin);
      if (info.areas.length === 1) {
        setArea(info.areas[0]!.id);
        onDone();
        return;
      }
      if (info.areas.length > 1) {
        setResult(info); // several localities share this PIN: let them pick
        return;
      }
      if (!info.state) return setError('We couldn’t find that PIN code. Please check it.');
      setCourier({ pincode: info.pincode, city: info.city, state: info.state, stateName: info.stateName, inCity: info.inCity });
      setResult(info);
    } catch (e) {
      setError(e instanceof ApiError && e.status === 404 ? 'Enter a valid 6-digit PIN code' : 'Couldn’t check that PIN code. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="dialog" aria-label="Delivery location" className="absolute left-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-line bg-white p-3 text-charcoal-900 shadow-lift">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void check();
        }}
      >
        <label htmlFor="loc-pin" className="px-1 text-sm font-bold">
          Enter your PIN code
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="loc-pin"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={6}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, '').slice(0, 6));
              setError(null);
            }}
            placeholder="e.g. 226024 or 110001"
            className="h-11 min-w-0 flex-1 rounded-full border border-line px-4 text-sm focus:border-leaf-500 focus:outline-none focus:ring-4 focus:ring-leaf-500/15"
          />
          <button type="submit" disabled={busy} className="btn-solid h-11 px-5 text-sm">
            {busy ? <Loader2 className="size-4 animate-spin" /> : 'Check'}
          </button>
        </div>
      </form>
      {error && (
        <p role="alert" className="mt-2 px-1 text-sm font-semibold text-tomato-500">
          {error}
        </p>
      )}
      {result && result.areas.length > 1 && (
        <p className="mt-2 px-1 text-sm text-charcoal-700">That PIN code covers several localities. Choose yours below.</p>
      )}
      {result && !result.areas.length && (
        <div className="mt-3 rounded-2xl bg-mint-50 p-3 text-sm">
          <p className="flex items-center gap-2 font-bold text-forest-800">
            <Truck className="size-4" /> {result.city ? `${result.city}, ` : ''}
            {result.stateName}
          </p>
          <p className="mt-1 text-charcoal-700">
            Grocery and Handmade come by courier, <b>{result.courierEta.toLowerCase()}</b>.{' '}
            {result.inCity ? 'Fresh fruit and vegetables are delivered next morning only in our Lucknow localities below.' : 'Fresh fruit and vegetables are delivered only in Lucknow for now. Coming soon to your city.'}
          </p>
          <button type="button" onClick={onDone} className="btn-outline mt-3 h-9 w-full text-sm">
            Continue shopping
          </button>
        </div>
      )}

      <p className="mt-4 px-1 text-xs font-bold uppercase tracking-wider text-charcoal-500">Or pick your Lucknow locality</p>
      <p className="px-1 text-xs text-charcoal-500">Everything delivered next morning, including Fresh.</p>
      <ul role="listbox" aria-label="Lucknow locality" className="mt-1 max-h-64 overflow-y-auto">
        {areas
          .filter((a) => !result || result.areas.length < 2 || result.areas.some((x) => x.id === a.id))
          .map((a) => (
            <li key={a.id} role="option" aria-selected={a.id === areaId}>
              <button
                type="button"
                onClick={() => {
                  setArea(a.id);
                  onDone();
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
  );
}
