import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellPlus, BellRing } from 'lucide-react';
import { accountApi } from '@/api/endpoints';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { PushPrompt } from '@/components/notifications/RiderArrivedAlert';
import { cn } from '@/utils';

export const stockAlertsKey = ['account', 'stock-alerts'] as const;

/** The pack sizes the signed-in person is waiting for. Empty for guests. */
export function useStockAlerts() {
  const { user } = useAuth();
  return useQuery({ queryKey: stockAlertsKey, queryFn: accountApi.stockAlerts, enabled: !!user, staleTime: 60_000 });
}

/**
 * "Notify me when it's back" for an out-of-stock pack size. Signed-in customers get an in-app alert
 * (and a phone alert, if they turn those on) the moment it's restocked. Guests are asked to sign in.
 */
export function StockAlertButton({ variantId, label, className }: { variantId: string; label: string; className?: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const qc = useQueryClient();
  const alerts = useStockAlerts();
  const waiting = alerts.data?.includes(variantId) ?? false;
  const toggle = useMutation({
    mutationFn: async () => (waiting ? (await accountApi.removeStockAlert(variantId), { inStock: false }) : accountApi.addStockAlert(variantId)),
    onSuccess: (r) => {
      // Restocked in the meantime: the page's own data is stale.
      if (r.inStock) void qc.invalidateQueries({ queryKey: ['product'] });
      void qc.invalidateQueries({ queryKey: stockAlertsKey });
    },
  });

  if (!user) {
    return (
      <Button size="lg" className={className} icon={<BellPlus className="size-5" />} onClick={() => navigate(`/login?next=${encodeURIComponent(loc.pathname)}`)}>
        Notify me when it’s back
      </Button>
    );
  }
  return (
    <div className={cn('w-full space-y-3', className)}>
      {waiting ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-mint-50 px-4 py-3 text-sm font-bold text-forest-800" data-testid="stock-alert-on" aria-live="polite">
          <BellRing className="size-5 text-leaf-600" />
          <span className="flex-1">We’ll alert you the moment {label} is back.</span>
          <button type="button" className="text-charcoal-500 underline underline-offset-2" disabled={toggle.isPending} onClick={() => toggle.mutate()}>
            Cancel
          </button>
        </div>
      ) : (
        <Button size="lg" icon={<BellPlus className="size-5" />} loading={toggle.isPending || alerts.isLoading} onClick={() => toggle.mutate()}>
          Notify me when it’s back
        </Button>
      )}
      {waiting && <PushPrompt text="Turn on phone alerts to hear about it even when Brio Cart is closed." />}
      {toggle.error && <p className="text-sm font-semibold text-tomato-500">{(toggle.error as Error).message}</p>}
    </div>
  );
}
