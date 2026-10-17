import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { hasPermission, homePathFor, type Permission, type Role } from '@shared/core';
import { useAuth } from '@/hooks/useAuth';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, Spinner } from '@/components/ui/misc';

function Loading() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-leaf-600" aria-busy>
      <Spinner className="size-8" />
    </div>
  );
}

/**
 * Route guard. Guests go to sign-in (unless `allowGuest`); a signed-in user with another role is
 * sent to their own home. UI only — the API enforces the same rules.
 */
export function RequireRole({ roles, allowGuest, children }: { roles: Role[]; allowGuest?: boolean; children: ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Loading />;
  if (!user) {
    if (allowGuest) return <>{children}</>;
    return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  }
  if (!roles.includes(user.role)) return <Navigate to={homePathFor(user.role)} replace />;
  return <>{children}</>;
}

/** Signed-out-only pages (e.g. rider sign-up): signed-in users go to their home. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (user) return <Navigate to={homePathFor(user.role)} replace />;
  return <>{children}</>;
}

export function usePermission(permission: Permission) {
  const { user } = useAuth();
  return hasPermission(user?.role, permission);
}

/** Page-level permission check inside an area the role can already enter. */
export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { user } = useAuth();
  if (hasPermission(user?.role, permission)) return <>{children}</>;
  return (
    <EmptyState className="min-h-[50vh] justify-center" icon={<ShieldAlert className="size-10" />} title="Not available for your role" action={<ButtonLink to={homePathFor(user?.role)}>Go back</ButtonLink>}>
      Ask a super admin if you need access to this page.
    </EmptyState>
  );
}
