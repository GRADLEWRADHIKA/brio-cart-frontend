import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Non-sensitive per-device preferences. Customer details are only kept here if they opt in at checkout. */
interface PrefsState {
  areaId: string | null;
  setArea: (id: string | null) => void;
  savedDetails: { name: string; phone: string; house: string; street: string; landmark?: string } | null;
  setSavedDetails: (d: PrefsState['savedDetails']) => void;
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      areaId: null,
      setArea: (areaId) => set({ areaId }),
      savedDetails: null,
      setSavedDetails: (savedDetails) => set({ savedDetails }),
    }),
    { name: 'briocart.prefs.v1', storage: createJSONStorage(() => localStorage) },
  ),
);
