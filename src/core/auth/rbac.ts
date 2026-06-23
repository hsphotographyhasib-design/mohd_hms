import type { UserRole } from '@/types';
import { PERMISSIONS } from './permissions';

/**
 * Numeric hierarchy for roles – higher number = more privilege.
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  admin: 90,
  manager: 80,
  supervisor: 70,
  finance: 60,
  technician: 50,
  customer: 10,
};

/**
 * Check whether `userRole` is present in `requiredRoles`.
 * An empty required list grants access to everyone.
 */
export function hasPermission(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  if (requiredRoles.length === 0) return true;
  return requiredRoles.includes(userRole);
}

/**
 * Check whether `userRole` meets or exceeds `minRole` in the role hierarchy.
 */
export function hasMinRole(userRole: UserRole, minRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

/**
 * Check whether `userRole` can access a named `feature` based on the
 * feature-level permission map.
 */
export function canAccess(userRole: UserRole, feature: string): boolean {
  return (PERMISSIONS[feature] || []).includes(userRole);
}