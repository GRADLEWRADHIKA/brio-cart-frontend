import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ShopperPreferences } from '@shared/core';

/** Delivery outside Brio Cart's areas, by courier: any Indian PIN code. */
export interface CourierLocation {
  pincode: string;
  city: string | null;
  state: string;
  stateName: string | null;
  /** In Lucknow but outside the delivery areas (courier in 1–3 days). */
  inCity: boolean;
}

/** Non-sensitive per-device preferences. Customer details are only kept here if they opt in at checkout. */
interface PrefsState {
  /** One of Brio Cart's delivery areas (rider delivery). */
  areaId: string | null;
  setArea: (id: string | null) => void;
  /** Anywhere else in India (courier). Only one of `areaId` / `courier` is set. */
  courier: CourierLocation | null;
  setCourier: (c: CourierLocation | null) => void;
  savedDetails: { name: string; phone: string; house: string; street: string; landmark?: string } | null;
  setSavedDetails: (d: PrefsState['savedDetails']) => void;
  /** First-visit answers. Null = not answered (or skipped). */
  answers: ShopperPreferences | null;
  /** The questions were shown (answered or skipped), so they don't pop up again. */
  askedAt: number | null;
  setAnswers: (a: ShopperPreferences | null) => void;
  markAsked: () => void;
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      areaId: null,
      setArea: (areaId) => set(areaId ? { areaId, courier: null } : { areaId: null }),
      courier: null,
      setCourier: (courier) => set(courier ? { courier, areaId: null } : { courier: null }),
      savedDetails: null,
      setSavedDetails: (savedDetails) => set({ savedDetails }),
      answers: null,
      askedAt: null,
      setAnswers: (answers) => set({ answers, askedAt: Date.now() }),
      markAsked: () => set({ askedAt: Date.now() }),
    }),
    { name: 'briocart.prefs.v1', storage: createJSONStorage(() => localStorage) },
  ),
);
