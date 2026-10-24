import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CartValidation, Product, Variant } from '@/types';

export interface CartLine {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  nameHi: string | null;
  variantLabel: string;
  /** Last known price — always re-validated by the server before ordering. */
  unitPrice: number;
  mrp: number | null;
  imageUrl: string | null;
  quantity: number;
  maxQty: number;
  /** The shop selling it; null/absent for Brio Cart's own. Items from each seller become a separate order. */
  shop?: { id: string; name: string } | null;
  /** Set when the server reports the item can no longer be bought as-is. */
  issue?: { code: string; message: string } | null;
  /** Other pack sizes, so the customer can switch variant from the cart. */
  options?: Array<{ id: string; label: string; price: number; mrp: number | null; inStock: boolean; maxQty: number }>;
}

interface CartState {
  lines: CartLine[];
  add: (product: Product, variant: Variant, quantity?: number) => 'added' | 'limit' | 'unavailable';
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  changeVariant: (fromVariantId: string, toVariantId: string) => void;
  clear: () => void;
  /** Re-add lines (e.g. “Order again”), merging with what is already in the cart. */
  addLines: (lines: CartLine[]) => void;
  applyValidation: (v: Pick<CartValidation, 'lines' | 'issues'>) => { priceChanged: boolean };
}

const clampQty = (q: number, max: number) => Math.max(0, Math.min(Math.floor(q), max));

function lineFrom(product: Product, variant: Variant, quantity: number): CartLine {
  return {
    variantId: variant.id,
    productId: product.id,
    slug: product.slug,
    name: product.name,
    nameHi: product.nameHi,
    variantLabel: variant.label,
    unitPrice: variant.price,
    mrp: variant.mrp,
    imageUrl: product.imageUrl,
    quantity,
    maxQty: variant.maxQty,
    shop: product.shop ? { id: product.shop.id, name: product.shop.name } : null,
    issue: null,
    options: product.variants.map((v) => ({ id: v.id, label: v.label, price: v.price, mrp: v.mrp, inStock: v.inStock, maxQty: v.maxQty })),
  };
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],

      add(product, variant, quantity = 1) {
        if (!variant.inStock || variant.maxQty < 1) return 'unavailable';
        const existing = get().lines.find((l) => l.variantId === variant.id);
        const current = existing?.quantity ?? 0;
        if (current >= variant.maxQty) return 'limit';
        const next = clampQty(current + quantity, variant.maxQty);
        set((s) => ({
          lines: existing
            ? s.lines.map((l) => (l.variantId === variant.id ? { ...lineFrom(product, variant, next) } : l))
            : [...s.lines, lineFrom(product, variant, next)],
        }));
        return next - current < quantity ? 'limit' : 'added';
      },

      setQuantity(variantId, quantity) {
        set((s) => ({
          lines: s.lines
            .map((l) => (l.variantId === variantId ? { ...l, quantity: clampQty(quantity, l.maxQty) } : l))
            .filter((l) => l.quantity > 0),
        }));
      },

      remove(variantId) {
        set((s) => ({ lines: s.lines.filter((l) => l.variantId !== variantId) }));
      },

      changeVariant(fromId, toId) {
        set((s) => {
          const line = s.lines.find((l) => l.variantId === fromId);
          const opt = line?.options?.find((o) => o.id === toId);
          if (!line || !opt || !opt.inStock) return s;
          const merged = s.lines.find((l) => l.variantId === toId);
          const nextLine: CartLine = {
            ...line,
            variantId: opt.id,
            variantLabel: opt.label,
            unitPrice: opt.price,
            mrp: opt.mrp,
            maxQty: opt.maxQty,
            quantity: clampQty(line.quantity + (merged?.quantity ?? 0), opt.maxQty),
            issue: null,
          };
          return {
            lines: s.lines.filter((l) => l.variantId !== toId).map((l) => (l.variantId === fromId ? nextLine : l)),
          };
        });
      },

      clear() {
        set({ lines: [] });
      },

      addLines(incoming) {
        set((s) => {
          const next = [...s.lines];
          for (const l of incoming) {
            const i = next.findIndex((x) => x.variantId === l.variantId);
            if (i >= 0) next[i] = { ...next[i]!, quantity: clampQty(next[i]!.quantity + l.quantity, l.maxQty), unitPrice: l.unitPrice, maxQty: l.maxQty, issue: null };
            else next.push({ ...l, quantity: clampQty(l.quantity, l.maxQty) });
          }
          return { lines: next.filter((l) => l.quantity > 0) };
        });
      },

      /** Refresh prices/limits from the server and mark lines that can't be ordered. */
      applyValidation(v) {
        let priceChanged = false;
        const byId = new Map(v.lines.map((l) => [l.variantId, l]));
        const issues = new Map(v.issues.map((i) => [i.variantId, i]));
        set((s) => ({
          lines: s.lines.map((l) => {
            const fresh = byId.get(l.variantId);
            if (fresh) {
              if (fresh.unitPrice !== l.unitPrice) priceChanged = true;
              return { ...l, unitPrice: fresh.unitPrice, mrp: fresh.mrp, maxQty: fresh.maxQty, name: fresh.productName, shop: fresh.shop ?? null, issue: null };
            }
            const issue = issues.get(l.variantId);
            if (issue?.code === 'QUANTITY_LIMIT' && issue.maxQty) {
              return { ...l, maxQty: issue.maxQty, issue: { code: issue.code, message: issue.message } };
            }
            return issue ? { ...l, issue: { code: issue.code, message: issue.message } } : l;
          }),
        }));
        return { priceChanged };
      },
    }),
    {
      name: 'briocart.cart.v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines }),
    },
  ),
);

export const selectCount = (s: CartState) => s.lines.reduce((n, l) => n + l.quantity, 0);
export const selectOrderable = (s: CartState) => s.lines.filter((l) => !l.issue);
