import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Apple, Check, Hand, HeartPulse, Smile, Sparkles, Users, Wheat, X } from 'lucide-react';
import {
  AGE_GROUP_LABELS,
  AGE_GROUPS,
  HEALTH_NEED_LABELS,
  HEALTH_NEEDS,
  SECTION_LABELS,
  SECTIONS,
  TASTE_LABELS,
  TASTES,
  type ShopperPreferences,
} from '@shared/core';
import { accountApi } from '@/api/endpoints';
import { useAuth } from '@/hooks/useAuth';
import { usePrefs } from '@/store/prefs';
import { useUi } from '@/store/ui';
import { cn } from '@/utils';

/** Pages where a pop-up would get in the way of finishing something. */
const QUIET = /^\/(checkout|pay|orders|login|register|track)/;

/**
 * First-visit questions: age group, taste, health needs and interests. Shown once to new visitors
 * (with Skip), and any time from the account menu. Answers stay on the device and, once signed in,
 * on the account, and reorder the home page, "Recommended for you" and search.
 */
export function PreferenceQuestions() {
  const { user } = useAuth();
  const loc = useLocation();
  const qc = useQueryClient();
  const open = useUi((s) => s.prefsOpen);
  const setOpen = useUi((s) => s.setPrefsOpen);
  const { answers, askedAt, setAnswers, markAsked } = usePrefs();
  const isCustomer = !user || user.role === 'CUSTOMER';

  // First visit: ask once, after the page has settled.
  useEffect(() => {
    if (askedAt || !isCustomer || QUIET.test(loc.pathname)) return;
    const t = setTimeout(() => setOpen(true), 2500);
    return () => clearTimeout(t);
  }, [askedAt, isCustomer, loc.pathname, setOpen]);

  // Signed in: the account's answers win; answers given before signing in are saved to the account.
  useEffect(() => {
    if (!user || user.role !== 'CUSTOMER') return;
    let cancelled = false;
    void accountApi
      .preferences()
      .then((saved) => {
        if (cancelled) return;
        const local = usePrefs.getState().answers;
        if (saved) usePrefs.setState({ answers: saved, askedAt: usePrefs.getState().askedAt ?? Date.now() });
        else if (local) void accountApi.savePreferences(local);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!open || !isCustomer) return null;

  const close = () => {
    if (!askedAt) markAsked();
    setOpen(false);
  };
  const save = (p: ShopperPreferences) => {
    setAnswers(p);
    setOpen(false);
    void qc.invalidateQueries({ queryKey: ['recommended'] });
    void qc.invalidateQueries({ queryKey: ['products'] });
    if (user?.role === 'CUSTOMER') void accountApi.savePreferences(p).catch(() => undefined);
  };
  return <Dialog initial={answers} onSkip={close} onSave={save} />;
}

function Dialog({ initial, onSkip, onSave }: { initial: ShopperPreferences | null; onSkip: () => void; onSave: (p: ShopperPreferences) => void }) {
  const [age, setAge] = useState<ShopperPreferences['ageGroup']>(initial?.ageGroup ?? null);
  const [tastes, setTastes] = useState<NonNullable<ShopperPreferences['tastes']>>(initial?.tastes ?? []);
  const [health, setHealth] = useState<NonNullable<ShopperPreferences['health']>>(initial?.health ?? []);
  const [interests, setInterests] = useState<NonNullable<ShopperPreferences['interests']>>(initial?.interests ?? []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onSkip();
    document.addEventListener('keydown', onKey);
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = '';
    };
  }, [onSkip]);

  const toggle = <T,>(list: T[], v: T, set: (x: T[]) => void) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const chip = (on: boolean) =>
    cn('inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition', on ? 'border-forest-800 bg-forest-800 text-white' : 'border-line bg-white text-charcoal-900 hover:border-forest-700/40');
  const sectionIcon = { FRESH: Apple, GROCERY: Wheat, HANDMADE: Hand } as const;

  return (
    <div className="fixed inset-0 z-[90] grid place-items-end bg-forest-950/50 sm:place-items-center" role="dialog" aria-modal="true" aria-labelledby="prefs-title">
      <div className="safe-bottom max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-lift sm:max-w-xl sm:rounded-[2rem] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-leaf-600">
              <Sparkles className="size-3.5" /> Make Brio Cart yours
            </p>
            <h2 id="prefs-title" className="mt-1 font-sans text-2xl font-bold tracking-tight text-charcoal-900">
              A few quick questions
            </h2>
            <p className="mt-1 text-sm text-charcoal-500">We’ll show you the products that suit you first. You can change this any time.</p>
          </div>
          <button type="button" onClick={onSkip} className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-ivory-100" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>

        <fieldset className="mt-6">
          <legend className="flex items-center gap-2 text-sm font-bold text-charcoal-900">
            <Users className="size-4 text-leaf-600" /> Who are you shopping for?
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {AGE_GROUPS.map((a) => (
              <button key={a} type="button" aria-pressed={age === a} onClick={() => setAge(age === a ? null : a)} className={chip(age === a)}>
                {age === a && <Check className="size-3.5" />} {AGE_GROUP_LABELS[a]}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="flex items-center gap-2 text-sm font-bold text-charcoal-900">
            <Smile className="size-4 text-leaf-600" /> Taste you prefer <span className="font-normal text-charcoal-500">(any)</span>
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {TASTES.map((t) => (
              <button key={t} type="button" aria-pressed={tastes.includes(t)} onClick={() => toggle(tastes, t, setTastes)} className={chip(tastes.includes(t))}>
                {tastes.includes(t) && <Check className="size-3.5" />} {TASTE_LABELS[t]}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="flex items-center gap-2 text-sm font-bold text-charcoal-900">
            <HeartPulse className="size-4 text-leaf-600" /> Any health needs?
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {HEALTH_NEEDS.map((h) => {
              const on = health.includes(h);
              return (
                <button
                  key={h}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setHealth(h === 'NONE' ? (on ? [] : ['NONE']) : on ? health.filter((x) => x !== h) : [...health.filter((x) => x !== 'NONE'), h])}
                  className={chip(on)}
                >
                  {on && <Check className="size-3.5" />} {HEALTH_NEED_LABELS[h]}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="flex items-center gap-2 text-sm font-bold text-charcoal-900">
            <Sparkles className="size-4 text-leaf-600" /> What are you most interested in?
          </legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {SECTIONS.map((s) => {
              const Icon = sectionIcon[s];
              const on = interests.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(interests, s, setInterests)}
                  className={cn('flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-sm font-bold transition', on ? 'border-forest-800 bg-mint-50 text-forest-800' : 'border-line hover:border-forest-700/40')}
                >
                  <Icon className="size-6" /> {SECTION_LABELS[s]}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onSkip} className="h-12 rounded-full px-6 text-sm font-bold text-charcoal-700 hover:bg-ivory-100">
            Skip for now
          </button>
          <button type="button" onClick={() => onSave({ ageGroup: age, tastes, health, interests })} className="btn-solid h-12 px-8 text-sm">
            Show my picks
          </button>
        </div>
      </div>
    </div>
  );
}
