import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { WifiOff } from 'lucide-react';
import { Header, MobileTabBar } from './Header';
import { Footer } from './Footer';
import { Toaster } from './Toaster';
import { ErrorBoundary } from './ErrorBoundary';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { initNative, watchConnectivity } from '@/native/native';
import { Spinner } from '@/components/ui/misc';
import { DeliveryCodePopup } from '@/components/checkout/DeliveryCodePopup';

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, search]);
  return null;
}

function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const qc = useQueryClient();
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    void watchConnectivity((o) => {
      setOnline(o);
      if (o) void qc.invalidateQueries();
    }).then((c) => (cleanup = c));
    const onResume = () => void qc.invalidateQueries({ queryKey: ['store'] });
    window.addEventListener('brio:resume', onResume);
    return () => {
      cleanup?.();
      window.removeEventListener('brio:resume', onResume);
    };
  }, [qc]);
  if (online) return null;
  return (
    <div role="alert" className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-charcoal-900 px-4 py-2.5 text-sm font-semibold text-ivory-50 safe-top">
      <WifiOff className="size-4" /> You’re offline. Your cart is saved — we’ll reconnect automatically.
    </div>
  );
}

export function PageFallback() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-leaf-600">
      <Spinner className="size-8" />
    </div>
  );
}

export function AppShell() {
  const navigate = useNavigate();
  const loc = useLocation();
  useEffect(() => {
    void initNative((d) => navigate(d));
  }, [navigate]);

  return (
    <div className="flex min-h-dvh flex-col pt-[env(safe-area-inset-top)]">
      {/* Backdrop for the Android status bar in edge-to-edge mode (zero-height on the web). */}
      <div aria-hidden className="fixed inset-x-0 top-0 z-[65] h-[env(safe-area-inset-top)] bg-forest-900" />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-forest-800 focus:px-4 focus:py-2 focus:text-ivory-50">
        Skip to content
      </a>
      <OfflineBanner />
      <DeliveryCodePopup />
      <ScrollToTop />
      <Header />
      <main id="main" className="flex-1">
        <ErrorBoundary resetKey={loc.pathname}>
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
      <MobileTabBar />
      <CartDrawer />
      <Toaster />
    </div>
  );
}
