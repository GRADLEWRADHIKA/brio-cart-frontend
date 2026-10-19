import { useEffect, useState } from 'react';
import type { SlotDay } from '@/types';
import { cn } from '@/utils';

const REASONS: Record<string, string> = { FULL: 'Full', PAST: 'Closed', CUTOFF: 'Closed for today' };

function dayName(date: string, i: number) {
  if (i === 0) return 'Today';
  if (i === 1) return 'Tomorrow';
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Date tabs and slot choices. Full or past slots are shown but can't be picked; the server re-checks. */
export function SlotPicker({ days, value, onChange }: { days: SlotDay[]; value: { slotId: string; date: string } | null; onChange: (v: { slotId: string; date: string } | null) => void }) {
  const firstOpen = days.findIndex((d) => d.slots.some((s) => s.available));
  const [dayIdx, setDayIdx] = useState(Math.max(0, firstOpen));
  const day = days[dayIdx];
  useEffect(() => {
    // Drop a choice that is no longer bookable after a refresh.
    if (value && !days.some((d) => d.date === value.date && d.slots.some((s) => s.id === value.slotId && s.available))) onChange(null);
  }, [days, value, onChange]);
  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Delivery day">
        {days.map((d, i) => (
          <button key={d.date} type="button" role="tab" aria-selected={i === dayIdx} onClick={() => setDayIdx(i)} className={cn('shrink-0 rounded-full px-4 py-2 text-sm font-bold', i === dayIdx ? 'bg-forest-800 text-ivory-50' : 'bg-ivory-100')}>
            {dayName(d.date, i)}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Delivery slot">
        {day?.slots.map((s) => {
          const checked = value?.slotId === s.id && value.date === day.date;
          return (
            <label key={s.id} className={cn('flex items-center gap-3 rounded-2xl border-2 p-4 transition', !s.available ? 'cursor-not-allowed border-line opacity-50' : checked ? 'cursor-pointer border-forest-700 bg-mint-50' : 'cursor-pointer border-line hover:border-forest-700/40')}>
              <input type="radio" name="slot" disabled={!s.available} checked={checked} onChange={() => onChange({ slotId: s.id, date: day.date })} className="size-4 accent-forest-700" />
              <span>
                <span className="block font-bold">{s.label}</span>
                <span className="text-sm text-charcoal-500">{s.available ? (s.remaining <= 3 ? `${s.remaining} left` : 'Available') : REASONS[s.reason ?? ''] ?? 'Unavailable'}</span>
              </span>
            </label>
          );
        })}
        {day && day.slots.length === 0 && <p className="text-sm text-charcoal-500">No deliveries on this day.</p>}
      </div>
    </div>
  );
}
