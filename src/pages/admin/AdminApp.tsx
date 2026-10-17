import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Bike, ExternalLink, LayoutDashboard, LogOut, Map as MapIcon, MapPin, Menu, Package, Settings, ShieldAlert, ShoppingCart, Tag, Tags, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/ui/Brand';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, Spinner } from '@/components/ui/misc';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { cn } from '@/utils';

const Dashboard = lazy(() => import('./Dashboard'));
const Orders = lazy(() => import('./Orders'));
const OrderDetail = lazy(() => import('./OrderDetail'));
const Products = lazy(() => import('./Products'));
const ProductEditor = lazy(() => import('./ProductEditor'));
const Categories = lazy(() => import('./Categories'));
const Areas = lazy(() => import('./Areas'));
const StoreSettingsPage = lazy(() => import('./StoreSettings'));
const LiveOps = lazy(() => import('./LiveOps'));
const Riders = lazy(() => import('./Riders'));
const Coupons = lazy(() => import('./Coupons'));

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/live', label: 'Live operations', icon: MapIcon },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/admin/riders', label: 'Delivery partners', icon: Bike },
  { to: '/admin/coupons', label: 'Coupons', icon: Tag },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/categories', label: 'Categories', icon: Tags },
  { to: '/admin/areas', label: 'Delivery areas', icon: MapPin },
  { to: '/admin/settings', label: 'Settings & campaigns', icon: Settings },
];

function Gate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center text-leaf-600">
        <Spinner className="size-8" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login?next=/admin" replace />;
  // UI gate only — every admin API route independently enforces the ADMIN role.
  if (user.role !== 'ADMIN') {
    return (
      <EmptyState className="min-h-dvh justify-center" icon={<ShieldAlert className="size-10" />} title="Store staff only" action={<ButtonLink to="/">Back to the store</ButtonLink>}>
        Your account doesn’t have access to the store dashboard.
      </EmptyState>
    );
  }
  return <>{children}</>;
}

function Shell() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    document.title = 'Store dashboard — Brio Cart';
  }, []);

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Dashboard">
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
  );

  return (
    <div className="min-h-dvh bg-ivory-100 lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className={cn('fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-forest-900 p-4 text-ivory-50 transition-transform lg:static lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center justify-between px-2 py-2">
          <Link to="/admin">
            <Logo tone="ivory" />
          </Link>
          <button type="button" className="grid size-9 place-items-center rounded-full bg-white/10 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-2 px-3 text-[0.65rem] font-extrabold uppercase tracking-[0.2em] text-lime-300/80">Store dashboard</p>
        <div className="mt-4 flex-1">{nav}</div>
        <div className="space-y-1 border-t border-white/10 pt-4">
          <Link to="/" className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-bold text-ivory-50/75 hover:bg-white/10">
            <ExternalLink className="size-4" /> View storefront
          </Link>
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
          <span className="font-display text-lg font-semibold">Brio Cart admin</span>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <ErrorBoundary resetKey={loc.pathname}>
            <Suspense
              fallback={
                <div className="grid min-h-[40vh] place-items-center text-leaf-600">
                  <Spinner className="size-7" />
                </div>
              }
            >
              <Routes>
                <Route index element={<Dashboard />} />
                <Route path="orders" element={<Orders />} />
                <Route path="orders/:id" element={<OrderDetail />} />
                <Route path="products" element={<Products />} />
                <Route path="products/new" element={<ProductEditor />} />
                <Route path="products/:id" element={<ProductEditor />} />
                <Route path="categories" element={<Categories />} />
                <Route path="areas" element={<Areas />} />
                <Route path="settings" element={<StoreSettingsPage />} />
                <Route path="live" element={<LiveOps />} />
                <Route path="riders" element={<Riders />} />
                <Route path="coupons" element={<Coupons />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default function AdminApp() {
  return (
    <Gate>
      <Shell />
    </Gate>
  );
}
