import { createContext, useContext, type ReactNode } from 'react';
import type { Permission } from '@shared/core';
import { adminApi, type AdminProduct, type DailySummary, type LowStockItem, type ProductPayload, type StockMovementRow } from '@/api/admin';
import { usePermission } from '@/auth/guards';
import type { StockReason } from '@shared/core';

/**
 * The product, stock and daily-summary pages are shared by the store dashboard (Brio Cart's own
 * catalogue) and the shop portal (one shop's catalogue). This scope tells them which API and which
 * links to use, and what the current user may do there.
 */
export interface CatalogScope {
  /** Route prefix: "/admin" or "/shop". */
  base: string;
  /** Query-key prefix, so the two areas never share cached data. */
  key: string;
  can: (p: 'create' | 'update' | 'delete' | 'inventory' | 'stockAdjust') => boolean;
  api: {
    categories: () => Promise<Array<{ id: string; name: string }>>;
    products: (q: { q?: string; category?: string; archived?: string }) => Promise<AdminProduct[]>;
    product: (id: string) => Promise<AdminProduct>;
    createProduct: (p: ProductPayload) => Promise<AdminProduct>;
    updateProduct: (id: string, p: ProductPayload) => Promise<AdminProduct>;
    deleteProduct: (id: string) => Promise<unknown>;
    patchVariant: (id: string, data: Partial<{ isAvailable: boolean; stockQty: number; trackInventory: boolean; price: number }>) => Promise<unknown>;
    upload: (file: File) => Promise<{ url: string }>;
    lowStock: (threshold?: number) => Promise<{ threshold: number; items: LowStockItem[] }>;
    adjustStock: (variantId: string, body: { delta: number; reason: StockReason; note?: string }) => Promise<{ id: string; stockQty: number }>;
    stockMovements: (productId: string, page?: number) => Promise<{ total: number; totalPages: number; items: StockMovementRow[] }>;
    dailySummary: (date?: string) => Promise<DailySummary>;
  };
}

const PERMS: Record<Parameters<CatalogScope['can']>[0], Permission> = {
  create: 'product:create',
  update: 'product:update',
  delete: 'product:delete',
  inventory: 'inventory:update',
  stockAdjust: 'stock:adjust',
};

function useAdminScope(): CatalogScope {
  const allowed = {
    create: usePermission(PERMS.create),
    update: usePermission(PERMS.update),
    delete: usePermission(PERMS.delete),
    inventory: usePermission(PERMS.inventory),
    stockAdjust: usePermission(PERMS.stockAdjust),
  };
  return { base: '/admin', key: 'admin', can: (p) => allowed[p], api: adminApi };
}

const Ctx = createContext<CatalogScope | null>(null);

export function CatalogScopeProvider({ value, children }: { value: CatalogScope; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** The surrounding area's scope; the store dashboard when none is provided. */
export function useCatalogScope(): CatalogScope {
  const admin = useAdminScope();
  return useContext(Ctx) ?? admin;
}
