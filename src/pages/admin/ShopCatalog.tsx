import { lazy } from 'react';
import { Route, Routes, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';
import { RequirePermission } from '@/auth/guards';
import { CatalogScopeProvider, useShopStaffScope } from '@/components/admin/CatalogScope';

const Products = lazy(() => import('./Products'));
const ProductEditor = lazy(() => import('./ProductEditor'));

/** Staff managing one shop's products for it, with the same list and editor the shop uses. */
export default function ShopCatalog() {
  const { shopId = '' } = useParams();
  const { data } = useQuery({ queryKey: ['admin', 'shop', shopId], queryFn: () => adminApi.shop(shopId) });
  const scope = useShopStaffScope(shopId, data?.shop.name);
  return (
    <CatalogScopeProvider value={scope}>
      <Routes>
        <Route index element={<Products />} />
        <Route path="new" element={<RequirePermission permission="product:create"><ProductEditor /></RequirePermission>} />
        <Route path=":id" element={<RequirePermission permission="product:update"><ProductEditor /></RequirePermission>} />
      </Routes>
    </CatalogScopeProvider>
  );
}
