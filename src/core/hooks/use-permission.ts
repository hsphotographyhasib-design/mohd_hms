'use client';

import { useMemo } from 'react';
import { useAuthStore } from '@/app-shell/store';
import { canAccessFeature, canPerformAction as checkAction, hasMinRole, hasPermission } from '@/core/permissions/rbac/permissions-matrix';
import type { UserRole } from '@/core/types';

/**
 * Hook to check if the current user can access a feature.
 * @param feature - Feature name (e.g., 'hr', 'invoices', 'settings')
 */
export function useCanAccessFeature(feature: string): boolean {
  const user = useAuthStore(s => s.user);
  return useMemo(() => {
    if (!user) return false;
    return canAccessFeature(user.role, feature);
  }, [user, feature]);
}

/**
 * Hook to check if the current user can perform an action on an entity.
 * @param entity - Entity name (e.g., 'complaint', 'invoice')
 * @param action - Action name (e.g., 'delete', 'create')
 */
export function useCanPerformAction(entity: string, action: string): boolean {
  const user = useAuthStore(s => s.user);
  return useMemo(() => {
    if (!user) return false;
    return checkAction(user.role, entity, action);
  }, [user, entity, action]);
}

/**
 * Hook to check if the current user meets a minimum role level.
 * @param minRole - Minimum required role
 */
export function useHasMinRole(minRole: UserRole): boolean {
  const user = useAuthStore(s => s.user);
  return useMemo(() => {
    if (!user) return false;
    return hasMinRole(user.role, minRole);
  }, [user, minRole]);
}

/**
 * Hook to check if the current user's role is in a list.
 * @param roles - Required roles
 */
export function useHasPermission(roles: UserRole[]): boolean {
  const user = useAuthStore(s => s.user);
  return useMemo(() => {
    if (!user) return false;
    return hasPermission(user.role, roles);
  }, [user, roles]);
}

/**
 * Get the current user's role (convenience).
 */
export function useUserRole(): UserRole | null {
  return useAuthStore(s => s.user?.role ?? null);
}

/**
 * Check if current user is a Super Admin.
 */
export function useIsSuperAdmin(): boolean {
  const role = useUserRole();
  return role === 'super_admin';
}

/**
 * Check if current user is an Admin or higher.
 */
export function useIsAdmin(): boolean {
  const role = useUserRole();
  return hasMinRole(role || 'guest', 'admin');
}