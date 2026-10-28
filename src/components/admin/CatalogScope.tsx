import { createContext, useContext, type ReactNode } from 'react';
import type { Permission } from '@shared/core';
import { adminApi, type AdminProduct, type DailySummary, type LowStockItem, type ProductPayload, type StockMovementRow } from '@/api/admin';
import { usePermission } from '@/auth/guards';
import type { StockReason } from '@shared/core';

/**
 * The product, stock and daily-summary pages are shared by the store dashboard (Brio Cart's own
 * catalogue), the shop portal (one shop's catalogue) and staff managing a shop's catalogue for it.
 * This scope tells them which API and which links to use, and what the current user may do there.
 */
export interface CatalogScope {
  /** Route prefix: "/admin", "/seller" or "/admin/shops/<id>". */
  base: string;
  /** Whose catalogue this is, when it isn't the current user's own (e.g. the shop's name). */
  owner?: string;
  /** Where the product list's back link goes, when there is one. */
  back?: { to: string; label: string };
  /**
   * Staff acting on a shop's products: they can hide a product so the shop can't relist it, and
   * deleting asks for a reason the shop is told.
   */
  moderation?: boolean;
  /** Query-key prefix, so the two areas never share cached data. */
  key: string;
  can: (p: 'create' | 'update' | 'delete' | 'inventory' | 'stockAdjust') => boolean;
  api: {
    categories: () => Promise<Array<{ id: string; name: string }>>;
    products: (q: { q?: string; category?: string; archived?: string }) => Promise<AdminProduct[]>;
    product: (id: string) => Promise<AdminProduct>;
    createProduct: (p: ProductPayload) => Promise<AdminProduct>;
    updateProduct: (id: string, p: ProductPayload) => Promise<AdminProduct>;
    deleteProduct: (id: string, reason?: string) => Promise<unknown>;
    setHidden?: (id: string, hidden: boolean, reason?: string) => Promise<AdminProduct>;
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

const unsupported = () => Promise.reject(new Error('Not available for a shop’s catalogue.'));

/** Staff managing one shop's products on its behalf. */
export function useShopStaffScope(shopId: string, shopName?: string): CatalogScope {
  const admin = useAdminScope();
  return {
    base: `/admin/shops/${shopId}`,
    key: `admin-shop-${shopId}`,
    owner: shopName,
    back: { to: `/admin/shops/${shopId}`, label: shopName ?? 'Shop' },
    moderation: true,
    can: admin.can,
    api: {
      categories: adminApi.categories,
      products: (q) => adminApi.shopProducts(shopId, q).then((r) => r.items),
      product: (id) => adminApi.shopProduct(shopId, id),
      createProduct: (p) => adminApi.createShopProduct(shopId, p),
      updateProduct: (id, p) => adminApi.updateShopProduct(shopId, id, p),
      deleteProduct: (id, reason) => adminApi.deleteShopProduct(shopId, id, reason),
      setHidden: (id, hidden, reason) => adminApi.setShopProductHidden(shopId, id, hidden, reason),
      patchVariant: (id, data) => adminApi.patchShopVariant(shopId, id, data),
      upload: adminApi.upload,
      lowStock: unsupported,
      adjustStock: unsupported,
      stockMovements: unsupported,
      dailySummary: unsupported,
    },
  };
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
