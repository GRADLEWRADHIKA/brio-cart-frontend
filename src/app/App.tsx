import { lazy, Suspense } from 'react';
import { createBrowserRouter, createHashRouter, Navigate, RouterProvider, type RouteObject } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { isNative } from '@/config/env';
import { AppShell, PageFallback } from '@/components/layout/AppShell';
import HomePage from '@/pages/HomePage';
import { GuestOnly, RequireRole } from '@/auth/guards';

// Route-based code splitting: only the homepage ships in the initial bundle.
const ShopPage = lazy(() => import('@/pages/ShopPage'));
const ProductPage = lazy(() => import('@/pages/ProductPage'));
const CartPage = lazy(() => import('@/pages/CartPage'));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'));
const OrderPage = lazy(() => import('@/pages/OrderPage'));
const PaymentPage = lazy(() => import('@/pages/PaymentPage'));
const TrackPage = lazy(() => import('@/pages/TrackPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const AccountPage = lazy(() => import('@/pages/AccountPage'));
const InfoPage = lazy(() => import('@/pages/InfoPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const AdminApp = lazy(() => import('@/pages/admin/AdminApp'));
const RiderApp = lazy(() => import('@/pages/rider/RiderApp'));
const RiderRegisterPage = lazy(() => import('@/pages/rider/RiderRegisterPage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const SavedPage = lazy(() => import('@/pages/SavedPage'));
const SellerApp = lazy(() => import('@/pages/seller/SellerApp'));
const SellerRegisterPage = lazy(() => import('@/pages/seller/SellerRegisterPage'));
const ShopStorePage = lazy(() => import('@/pages/ShopStorePage'));
const SetupPage = lazy(() => import('@/pages/SetupPage'));

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
    },
  },
});

const customerRoutes: RouteObject[] = [
  { index: true, element: <HomePage /> },
  { path: 'shop', element: <ShopPage /> },
  { path: 'product/:slug', element: <ProductPage /> },
  { path: 'shops', element: <ShopStorePage /> },
  { path: 'shops/:slug', element: <ShopStorePage /> },
  { path: 'cart', element: <CartPage /> },
  { path: 'saved', element: <SavedPage /> },
  // Customer-only pages: guests may check out; staff and riders are sent to their own home.
  { path: 'checkout', element: <RequireRole roles={['CUSTOMER']} allowGuest><CheckoutPage /></RequireRole> },
  { path: 'orders/:orderNumber', element: <OrderPage /> },
  { path: 'pay/:orderNumber', element: <RequireRole roles={['CUSTOMER']} allowGuest><PaymentPage /></RequireRole> },
  { path: 'track', element: <TrackPage /> },
  { path: 'login', element: <LoginPage /> },
  { path: 'register', element: <RegisterPage /> },
  { path: 'account', element: <RequireRole roles={['CUSTOMER']}><AccountPage /></RequireRole> },
  { path: 'account/:tab', element: <RequireRole roles={['CUSTOMER']}><AccountPage /></RequireRole> },
  { path: 'notifications', element: <RequireRole roles={['CUSTOMER']}><NotificationsPage /></RequireRole> },
  { path: 'help', element: <InfoPage page="help" /> },
  { path: 'privacy', element: <InfoPage page="privacy" /> },
  { path: 'terms', element: <InfoPage page="terms" /> },
  { path: 'categories', element: <Navigate to="/shop" replace /> },
  { path: '*', element: <NotFoundPage /> },
];

const routes: RouteObject[] = [
  { path: '/', element: <AppShell />, children: customerRoutes },
  // Delivery-partner portal (role-checked on the server). Sign-up is public; the rest is riders only.
  {
    path: '/rider/register',
    element: (
      <Suspense fallback={<PageFallback />}>
        <GuestOnly>
          <RiderRegisterPage />
        </GuestOnly>
      </Suspense>
    ),
  },
  {
    path: '/rider/*',
    element: (
      <Suspense fallback={<PageFallback />}>
        <RequireRole roles={['RIDER']}>
          <RiderApp />
        </RequireRole>
      </Suspense>
    ),
  },
  // First-run setup: creates the first super admin, then switches itself off.
  {
    path: '/setup',
    element: (
      <Suspense fallback={<PageFallback />}>
        <SetupPage />
      </Suspense>
    ),
  },
  // Shop owner portal. Sign-up is public and needs no approval; the rest is shop owners only.
  {
    path: '/seller/register',
    element: (
      <Suspense fallback={<PageFallback />}>
        <GuestOnly>
          <SellerRegisterPage />
        </GuestOnly>
      </Suspense>
    ),
  },
  {
    path: '/seller/*',
    element: (
      <Suspense fallback={<PageFallback />}>
        <SellerApp />
      </Suspense>
    ),
  },
  // The store dashboard is web-only and separately bundled; it is not part of the Android app.
  ...(isNative
    ? []
    : [
        {
          path: '/admin/*',
          element: (
            <Suspense fallback={<PageFallback />}>
              <AdminApp />
            </Suspense>
          ),
        },
      ]),
];

// Hash routing inside the Android WebView keeps deep links and reloads working from local files.
const router = isNative ? createHashRouter(routes) : createBrowserRouter(routes);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
