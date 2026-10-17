import { create } from 'zustand';

export interface Toast {
  id: number;
  title: string;
  description?: string;
  tone?: 'success' | 'info' | 'error';
  imageUrl?: string | null;
  action?: { label: string; to: string };
}

interface UiState {
  cartOpen: boolean;
  menuOpen: boolean;
  searchOpen: boolean;
  toasts: Toast[];
  setCartOpen: (open: boolean) => void;
  setMenuOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  toast: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
  /** Closes the top-most overlay; returns false if nothing was open (used by Android back). */
  closeTopOverlay: () => boolean;
}

let nextId = 1;

export const useUi = create<UiState>()((set, get) => ({
  cartOpen: false,
  menuOpen: false,
  searchOpen: false,
  toasts: [],
  setCartOpen: (cartOpen) => set({ cartOpen, menuOpen: false, searchOpen: false }),
  setMenuOpen: (menuOpen) => set({ menuOpen, cartOpen: false, searchOpen: false }),
  setSearchOpen: (searchOpen) => set({ searchOpen, cartOpen: false, menuOpen: false }),
  toast: (t) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id }] }));
    setTimeout(() => get().dismiss(id), 3800);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  closeTopOverlay: () => {
    const s = get();
    if (s.cartOpen || s.menuOpen || s.searchOpen) {
      set({ cartOpen: false, menuOpen: false, searchOpen: false });
      return true;
    }
    return false;
  },
}));
