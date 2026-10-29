import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Product } from '@/types';

/** What we keep about a saved product. Prices and stock are always fetched fresh. */
export interface SavedItem {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  savedAt: string;
}

const MAX_SAVED = 100;

interface WishlistState {
  items: SavedItem[];
  has: (productId: string) => boolean;
  toggle: (product: Pick<Product, 'id' | 'slug' | 'name' | 'imageUrl'>) => boolean;
  remove: (productId: string) => void;
}

/** Saved favourites, kept on this device (works for guests too). Newest first. */
export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      has: (id) => get().items.some((i) => i.productId === id),
      toggle: (p) => {
        if (get().has(p.id)) {
          set({ items: get().items.filter((i) => i.productId !== p.id) });
          return false;
        }
        set({ items: [{ productId: p.id, slug: p.slug, name: p.name, imageUrl: p.imageUrl, savedAt: new Date().toISOString() }, ...get().items].slice(0, MAX_SAVED) });
        return true;
      },
      remove: (id) => set({ items: get().items.filter((i) => i.productId !== id) }),
    }),
    { name: 'briocart.wishlist.v1', storage: createJSONStorage(() => localStorage), partialize: (s) => ({ items: s.items }) },
  ),
);
