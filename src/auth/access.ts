import { homePathFor, type Role } from '@shared/core';

/**
 * Which signed-in roles may open a web route. This only shapes navigation: every API route
 * enforces the same rules on the server.
 */
export function pathAllowedFor(role: Role | null, path: string): boolean {
  const p = path.split(/[?#]/)[0] ?? '/';
  if (p === '/admin' || p.startsWith('/admin/')) return role === 'ADMIN' || role === 'SUPERADMIN';
  if (p === '/rider/register') return role === null;
  if (p === '/rider' || p.startsWith('/rider/')) return role === 'RIDER';
  if (p === '/account' || p.startsWith('/account/') || p === '/notifications') return role === 'CUSTOMER';
  // Guests may check out; staff and riders may not place orders on their work accounts.
  if (p === '/checkout' || p.startsWith('/pay/')) return role === null || role === 'CUSTOMER';
  return true;
}

/** Where to go after signing in: the requested page if this role may open it, else the role's home. */
export function postLoginPath(role: Role, next: string | null): string {
  const safe = next && next.startsWith('/') && !next.startsWith('//') ? next : null;
  if (safe && safe !== '/' && safe !== '/account' && pathAllowedFor(role, safe)) return safe;
  return homePathFor(role);
}
