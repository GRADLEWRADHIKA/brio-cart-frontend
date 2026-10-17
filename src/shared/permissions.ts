import type { Role } from './domain';

/**
 * Central permission map. The server enforces it with `requirePermission()`; the web app uses the
 * same table only to hide UI a role cannot use. Keep this file identical in frontend and backend.
 */
export const PERMISSIONS = [
  // Customer
  'order:place',
  'order:view_own',
  'address:manage',
  // Every signed-in role
  'notification:read',
  // Store staff
  'order:view_all',
  'order:manage',
  'order:assign',
  'inventory:update',
  'coupon:manage',
  'catalog:view',
  'rider:view',
  // Super admin only
  'product:create',
  'product:update',
  'product:delete',
  'category:manage',
  'user:manage',
  'rider:approve',
  'audit:view',
  'settings:manage',
  // Rider
  'delivery:update',
  'earnings:view',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const STAFF: readonly Permission[] = [
  'notification:read',
  'order:view_all',
  'order:manage',
  'order:assign',
  'inventory:update',
  'coupon:manage',
  'catalog:view',
  'rider:view',
];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  CUSTOMER: ['order:place', 'order:view_own', 'address:manage', 'notification:read'],
  RIDER: ['delivery:update', 'earnings:view', 'notification:read'],
  ADMIN: STAFF,
  SUPERADMIN: [
    ...STAFF,
    'product:create',
    'product:update',
    'product:delete',
    'category:manage',
    'user:manage',
    'rider:approve',
    'audit:view',
    'settings:manage',
  ],
};

export function hasPermission(role: Role | null | undefined, permission: Permission): boolean {
  return !!role && (ROLE_PERMISSIONS[role] ?? []).includes(permission);
}

export const isStaffRole = (role: Role | null | undefined) => role === 'ADMIN' || role === 'SUPERADMIN';

/** Where each role lands after signing in. */
export function homePathFor(role: Role | null | undefined): string {
  if (role === 'ADMIN' || role === 'SUPERADMIN') return '/admin';
  if (role === 'RIDER') return '/rider';
  return '/';
}
