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
  'invoice:view_own',
  'return:request',
  'wallet:view_own',
  'support:open',
  // Every signed-in role
  'notification:read',
  'account:sessions',
  'account:export',
  // Customer self-service
  'account:delete',
  // Store staff
  'order:view_all',
  'order:manage',
  'order:assign',
  'inventory:update',
  'coupon:manage',
  'catalog:view',
  'rider:view',
  'stock:view',
  'stock:adjust',
  'settlement:manage',
  'slot:manage',
  'invoice:view_all',
  'return:manage',
  'analytics:view',
  'export:run',
  'support:manage',
  // Super admin only
  'product:create',
  'product:update',
  'product:delete',
  'category:manage',
  'user:manage',
  'rider:approve',
  'audit:view',
  'settings:manage',
  'fee:manage',
  'system:status',
  // Rider
  'delivery:update',
  'delivery:claim',
  'earnings:view',
  'cash:view_own',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const STAFF: readonly Permission[] = [
  'notification:read',
  'account:sessions',
  'account:export',
  'order:view_all',
  'order:manage',
  'order:assign',
  'inventory:update',
  'coupon:manage',
  'catalog:view',
  'rider:view',
  'stock:view',
  'stock:adjust',
  'settlement:manage',
  'slot:manage',
  'invoice:view_all',
  'return:manage',
  'analytics:view',
  'export:run',
  'support:manage',
];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  CUSTOMER: ['order:place', 'order:view_own', 'address:manage', 'invoice:view_own', 'return:request', 'wallet:view_own', 'support:open', 'notification:read', 'account:sessions', 'account:export', 'account:delete'],
  RIDER: ['delivery:update', 'delivery:claim', 'earnings:view', 'cash:view_own', 'notification:read', 'account:sessions', 'account:export'],
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
    'fee:manage',
    'system:status',
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