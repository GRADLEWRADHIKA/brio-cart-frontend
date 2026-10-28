import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, Boxes, CalendarDays, ExternalLink, FileCheck, LayoutDashboard, LogOut, Menu, Package, ShoppingBag, Store, Wallet, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { shopApi } from '@/api/shop';
import { Logo } from '@/components/ui/Brand';
import { Spinner } from '@/components/ui/misc';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { RequireRole } from '@/auth/guards';
import { NotificationBell, NotificationList } from '@/components/notifications/Notifications';
import { CatalogScopeProvider, type CatalogScope } from '@/components/admin/CatalogScope';
import { PageHeader } from '@/components/admin/kit';
import { cn } from '@/utils';
import { VerificationPanel } from '@/components/verification/VerificationPanel';

const SellerDashboard = lazy(() => import('./SellerDashboard'));
const SellerOrders = lazy(() => import('./SellerOrders'));
const SellerOrderDetail = lazy(() => import('./SellerOrderDetail'));
const SellerEarnings = lazy(() => import('./SellerEarnings'));
const SellerSettings = lazy(() => import('./SellerSettings'));
// The store dashboard's catalogue pages, pointed at this shop through the catalog scope.
const Products = lazy(() => import('@/pages/admin/Products'));
const ProductEditor = lazy(() => import('@/pages/admin/ProductEditor'));
const Stock = lazy(() => import('@/pages/admin/Stock'));
const DailySummary = lazy(() => import('@/pages/admin/DailySummary'));

const NAV = [
  { to: '/seller', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/seller/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/seller/products', label: 'Products', icon: Package },
  { to: '/seller/stock', label: 'Stock', icon: Boxes },
  { to: '/seller/daily', label: 'Daily summary', icon: CalendarDays },
  { to: '/seller/earnings', label: 'Earnings', icon: Wallet },
  { to: '/seller/documents', label: 'Documents', icon: FileCheck },
  { to: '/seller/settings', label: 'Shop settings', icon: Store },
  { to: '/seller/notifications', label: 'Notifications', icon: Bell },
];

/** Shop owners can do everything to their own catalogue; the server scopes it to their shop. */
const sellerScope: CatalogScope = { base: '/seller', key: 'seller', can: () => true, api: shopApi };

function Shell() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const { data: shop } = useQuery({ queryKey: ['seller', 'me'], queryFn: shopApi.me });
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    document.title = `${shop?.name ?? 'Shop'} — Brio Seller`;
  }, [shop?.name]);
  const scope = useMemo(() => sellerScope, []);

  return (
    <div className="min-h-dvh bg-ivory-100 lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className={cn('fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-forest-900 p-4 text-ivory-50 transition-transform lg:static lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center justify-between px-2 py-2">
          <Link to="/seller">
            <Logo tone="ivory" />
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell tone="dark" align="left" className="hidden lg:block" />
            <button type="button" className="grid size-9 place-items-center rounded-full bg-white/10 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
              <X className="size-4" />
            </button>
          </div>
        </div>
        <p className="mt-2 px-3 text-[0.65rem] font-extrabold uppercase tracking-[0.2em] text-lime-300/80">Seller · {shop?.name ?? '…'}</p>
        <nav className="mt-4 flex flex-1 flex-col gap-1 overflow-y-auto" aria-label="Seller">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => cn('flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-bold transition', isActive ? 'bg-lime-300 text-forest-900' : 'text-ivory-50/75 hover:bg-white/10 hover:text-ivory-50')}
            >
              <Icon className="size-[1.1rem]" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-1 border-t border-white/10 pt-4">
          {shop && (
            <Link to={`/shops/${shop.slug}`} className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-bold text-ivory-50/75 hover:bg-white/10">
              <ExternalLink className="size-4" /> View my shop page
            </Link>
          )}
          <button type="button" onClick={() => logout.mutate()} className="flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-bold text-ivory-50/75 hover:bg-white/10">
            <LogOut className="size-4" /> Sign out
          </button>
          <p className="truncate px-4 pt-2 text-xs text-ivory-50/50">{user?.name}</p>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-ivory-50/90 px-4 backdrop-blur lg:hidden">
          <button type="button" onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-full hover:bg-ivory-200" aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <span className="flex-1 truncate font-display text-lg font-semibold">{shop?.name ?? 'Brio Seller'}</span>
          <NotificationBell />
        </header>
        {shop && shop.isActive && shop.verificationStatus !== 'APPROVED' && loc.pathname !== '/seller/documents' && (
          <Link to="/seller/documents" className="block bg-turmeric-100 px-4 py-3 text-center text-sm font-semibold text-[#6b4500] hover:underline" data-testid="verify-banner">
            {shop.verificationStatus === 'PENDING'
              ? 'Brio Cart is checking your documents. Your products go live once they are approved.'
              : shop.verificationStatus === 'REJECTED'
                ? 'Your documents need attention. Fix them to start selling →'
                : 'Upload your documents to start selling. Your products stay hidden until Brio Cart approves them →'}
          </Link>
        )}
        {shop && !shop.isActive && (
          <p role="alert" className="bg-tomato-100 px-4 py-3 text-center text-sm font-semibold text-tomato-500">
            Your shop is suspended by Brio Cart. Your products are hidden and you can’t take orders. Contact Brio Cart support to reactivate it.
          </p>
        )}
        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <ErrorBoundary resetKey={loc.pathname}>
            <CatalogScopeProvider value={scope}>
              <Suspense
                fallback={
                  <div className="grid min-h-[40vh] place-items-center text-leaf-600">
                    <Spinner className="size-7" />
                  </div>
                }
              >
                <Routes>
                  <Route index element={<SellerDashboard />} />
                  <Route path="orders" element={<SellerOrders />} />
                  <Route path="orders/:id" element={<SellerOrderDetail />} />
                  <Route path="products" element={<Products />} />
                  <Route path="products/new" element={<ProductEditor />} />
                  <Route path="products/:id" element={<ProductEditor />} />
                  <Route path="stock" element={<Stock />} />
                  <Route path="daily" element={<DailySummary />} />
                  <Route path="earnings" element={<SellerEarnings />} />
                  <Route path="settings" element={<SellerSettings />} />
                  <Route
                    path="documents"
                    element={
                      <>
                        <PageHeader title="Documents" subtitle="Brio Cart checks these before your products go live." />
                        <VerificationPanel className="max-w-3xl" />
                      </>
                    }
                  />
                  <Route
                    path="notifications"
                    element={
                      <>
                        <PageHeader title="Notifications" subtitle="New orders, riders collecting, low stock and payments. Refreshes every 30 seconds." />
                        <NotificationList />
                      </>
                    }
                  />
                  <Route path="*" element={<Navigate to="/seller" replace />} />
                </Routes>
              </Suspense>
            </CatalogScopeProvider>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

/** Shop owners only; others are sent to their own home. */
export default function SellerApp() {
  return (
    <RequireRole roles={['SHOP_OWNER']}>
      <Shell />
    </RequireRole>
  );
}
