import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Activity, Banknote, BarChart3, Bell, CalendarDays, FileCheck, Truck, LifeBuoy, Bike, Boxes, Clock, Undo2, ExternalLink, LayoutDashboard, LogOut, Map as MapIcon, MapPin, Megaphone, Menu, Package, ScrollText, Settings, ShoppingCart, Store, Tag, Tags, UserCheck, Users as UsersIcon, X } from 'lucide-react';
import { hasPermission, ROLE_LABELS, type Permission } from '@shared/core';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/ui/Brand';
import { Spinner } from '@/components/ui/misc';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { RequirePermission, RequireRole } from '@/auth/guards';
import { NotificationBell } from '@/components/notifications/Notifications';
import { cn } from '@/utils';

const Dashboard = lazy(() => import('./Dashboard'));
const Orders = lazy(() => import('./Orders'));
const OrderDetail = lazy(() => import('./OrderDetail'));
const Products = lazy(() => import('./Products'));
const ProductEditor = lazy(() => import('./ProductEditor'));
const Categories = lazy(() => import('./Categories'));
const Banners = lazy(() => import('./Banners'));
const Areas = lazy(() => import('./Areas'));
const StoreSettingsPage = lazy(() => import('./StoreSettings'));
const LiveOps = lazy(() => import('./LiveOps'));
const Riders = lazy(() => import('./Riders'));
const Coupons = lazy(() => import('./Coupons'));
const Users = lazy(() => import('./Users'));
const RiderApprovals = lazy(() => import('./RiderApprovals'));
const AuditLog = lazy(() => import('./AuditLog'));
const AdminNotifications = lazy(() => import('./Notifications'));
const Stock = lazy(() => import('./Stock'));
const Settlements = lazy(() => import('./Settlements'));
const DeliverySlots = lazy(() => import('./DeliverySlots'));
const Returns = lazy(() => import('./Returns'));
const Analytics = lazy(() => import('./Analytics'));
const DailySummary = lazy(() => import('./DailySummary'));
const Shops = lazy(() => import('./Shops'));
const ShopCatalog = lazy(() => import('./ShopCatalog'));
const Verification = lazy(() => import('./Verification'));
const Shipping = lazy(() => import('./Shipping'));
const Tickets = lazy(() => import('./Tickets'));
const SystemStatus = lazy(() => import('./SystemStatus'));

/** Navigation is filtered by the shared permission map; the API enforces the same map. */
const NAV: Array<{ to: string; label: string; icon: typeof Bell; end?: boolean; permission: Permission }> = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true, permission: 'order:view_all' },
  { to: '/admin/live', label: 'Live operations', icon: MapIcon, permission: 'order:view_all' },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart, permission: 'order:view_all' },
  { to: '/admin/daily', label: 'Daily summary', icon: CalendarDays, permission: 'analytics:view' },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3, permission: 'analytics:view' },
  { to: '/admin/tickets', label: 'Support', icon: LifeBuoy, permission: 'support:manage' },
  { to: '/admin/returns', label: 'Returns', icon: Undo2, permission: 'return:manage' },
  { to: '/admin/riders', label: 'Delivery partners', icon: Bike, permission: 'rider:view' },
  { to: '/admin/settlements', label: 'Rider cash', icon: Banknote, permission: 'settlement:manage' },
  { to: '/admin/rider-approvals', label: 'Rider approvals', icon: UserCheck, permission: 'rider:approve' },
  { to: '/admin/coupons', label: 'Coupons', icon: Tag, permission: 'coupon:manage' },
  { to: '/admin/shops', label: 'Shops', icon: Store, permission: 'shop:view' },
  { to: '/admin/verification', label: 'Verification', icon: FileCheck, permission: 'kyc:review' },
  { to: '/admin/shipping', label: 'Courier orders', icon: Truck, permission: 'shipping:manage' },
  { to: '/admin/products', label: 'Products', icon: Package, permission: 'catalog:view' },
  { to: '/admin/stock', label: 'Stock', icon: Boxes, permission: 'stock:view' },
  { to: '/admin/categories', label: 'Categories', icon: Tags, permission: 'category:manage' },
  { to: '/admin/banners', label: 'Product banners', icon: Megaphone, permission: 'settings:manage' },
  { to: '/admin/slots', label: 'Delivery slots', icon: Clock, permission: 'slot:manage' },
  { to: '/admin/areas', label: 'Delivery areas', icon: MapPin, permission: 'settings:manage' },
  { to: '/admin/settings', label: 'Settings & campaigns', icon: Settings, permission: 'settings:manage' },
  { to: '/admin/users', label: 'Users', icon: UsersIcon, permission: 'user:manage' },
  { to: '/admin/system', label: 'System status', icon: Activity, permission: 'system:status' },
  { to: '/admin/audit', label: 'Audit log', icon: ScrollText, permission: 'audit:view' },
  { to: '/admin/notifications', label: 'Notifications', icon: Bell, permission: 'notification:read' },
];

const guard = (permission: Permission, el: ReactNode) => <RequirePermission permission={permission}>{el}</RequirePermission>;

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
      {NAV.filter((n) => hasPermission(user?.role, n.permission)).map(({ to, label, icon: Icon, end }) => (
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
          <div className="flex items-center gap-1">
            <NotificationBell tone="dark" align="left" className="hidden lg:block" />
            <button type="button" className="grid size-9 place-items-center rounded-full bg-white/10 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
              <X className="size-4" />
            </button>
          </div>
        </div>
        <p className="mt-2 px-3 text-[0.65rem] font-extrabold uppercase tracking-[0.2em] text-lime-300/80">Store dashboard · {user ? ROLE_LABELS[user.role] : ''}</p>
        <div className="mt-4 flex-1 overflow-y-auto">{nav}</div>
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
          <span className="flex-1 font-display text-lg font-semibold">Brio Cart admin</span>
          <NotificationBell />
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
                <Route index element={guard('order:view_all', <Dashboard />)} />
                <Route path="orders" element={guard('order:view_all', <Orders />)} />
                <Route path="orders/:id" element={guard('order:view_all', <OrderDetail />)} />
                <Route path="products" element={guard('catalog:view', <Products />)} />
                <Route path="products/new" element={guard('product:create', <ProductEditor />)} />
                <Route path="products/:id" element={guard('product:update', <ProductEditor />)} />
                <Route path="settlements" element={guard('settlement:manage', <Settlements />)} />
                <Route path="system" element={guard('system:status', <SystemStatus />)} />
                <Route path="analytics" element={guard('analytics:view', <Analytics />)} />
                <Route path="daily" element={guard('analytics:view', <DailySummary />)} />
                <Route path="shops" element={guard('shop:view', <Shops />)} />
                <Route path="shops/:id" element={guard('shop:view', <Shops />)} />
                <Route path="shops/:shopId/products/*" element={guard('shop:view', <ShopCatalog />)} />
                <Route path="verification" element={guard('kyc:review', <Verification />)} />
                <Route path="verification/:userId" element={guard('kyc:review', <Verification />)} />
                <Route path="shipping" element={guard('shipping:manage', <Shipping />)} />
                <Route path="tickets" element={guard('support:manage', <Tickets />)} />
                <Route path="returns" element={guard('return:manage', <Returns />)} />
                <Route path="slots" element={guard('slot:manage', <DeliverySlots />)} />
                <Route path="stock" element={guard('stock:view', <Stock />)} />
                <Route path="categories" element={guard('category:manage', <Categories />)} />
                <Route path="banners" element={guard('settings:manage', <Banners />)} />
                <Route path="areas" element={guard('settings:manage', <Areas />)} />
                <Route path="settings" element={guard('settings:manage', <StoreSettingsPage />)} />
                <Route path="live" element={guard('order:view_all', <LiveOps />)} />
                <Route path="riders" element={guard('rider:view', <Riders />)} />
                <Route path="rider-approvals" element={guard('rider:approve', <RiderApprovals />)} />
                <Route path="coupons" element={guard('coupon:manage', <Coupons />)} />
                <Route path="users" element={guard('user:manage', <Users />)} />
                <Route path="audit" element={guard('audit:view', <AuditLog />)} />
                <Route path="notifications" element={guard('notification:read', <AdminNotifications />)} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

/** Store staff only (admin and super admin); others are sent to their own home. */
export default function AdminApp() {
  return (
    <RequireRole roles={['ADMIN', 'SUPERADMIN']}>
      <Shell />
    </RequireRole>
  );
}
