import { useState } from 'react';
import { Crosshair, MapPinCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface Pin {
  lat: number;
  lng: number;
}

/**
 * "Pin my door": the phone's GPS position, saved with the address. With a pin the rider is marked
 * arrived automatically within 80 m, and the customer gets the "rider has arrived" alert.
 */
export function PinLocation({ value, onChange, className }: { value: Pin | null; onChange: (p: Pin | null) => void; className?: string }) {
  const [state, setState] = useState<{ busy: boolean; error?: string; accuracy?: number }>({ busy: false });

  const locate = () => {
    if (!('geolocation' in navigator)) return setState({ busy: false, error: 'This browser can’t share your location.' });
    setState({ busy: true });
    navigator.geolocation.getCurrentPosition(
      (p) => {
        onChange({ lat: Number(p.coords.latitude.toFixed(6)), lng: Number(p.coords.longitude.toFixed(6)) });
        setState({ busy: false, accuracy: p.coords.accuracy });
      },
      (e) => setState({ busy: false, error: e.code === e.PERMISSION_DENIED ? 'Location is blocked. Allow it for this site in your browser settings.' : 'Couldn’t get your location. Try again near a window or outdoors.' }),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );
  };

  return (
    <div className={className} data-testid="pin-location">
      {value ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-mint-100 p-3 text-sm text-forest-800">
          <MapPinCheck className="size-5 shrink-0" />
          <span className="min-w-0 flex-1">
            <strong>Door location pinned</strong>
            {state.accuracy !== undefined && <span className="text-forest-700"> · accurate to about {Math.round(state.accuracy)} m</span>}
            <span className="block text-xs text-forest-700">You’ll get an alert the moment your rider reaches you.</span>
          </span>
          <button type="button" onClick={locate} className="font-bold underline underline-offset-2">
            Re-pin
          </button>
          <button type="button" onClick={() => onChange(null)} className="grid size-7 place-items-center rounded-full hover:bg-white/70" aria-label="Remove pinned location">
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-forest-700/30 p-3">
          <Button type="button" variant="outline" size="sm" icon={<Crosshair className="size-4" />} loading={state.busy} onClick={locate}>
            Pin my exact location
          </Button>
          <p className="mt-1.5 text-xs text-charcoal-500">Optional. Do this at your door so we can tell you the moment your rider arrives.</p>
        </div>
      )}
      {state.accuracy !== undefined && state.accuracy > 60 && value && (
        <p className="mt-1 text-xs font-semibold text-[#8a5a00]">Your phone’s GPS is rough right now. Re-pin outdoors for a more exact spot.</p>
      )}
      {state.error && (
        <p className="mt-1 text-xs font-semibold text-tomato-500" role="alert">
          {state.error}
        </p>
      )}
    </div>
  );
}
