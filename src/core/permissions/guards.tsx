'use client';

import React from 'react';
import { useAuthStore } from '@/app-shell/store';
import { canAccessFeature, canPerformAction, hasMinRole, hasPermission } from '@/core/permissions/rbac/permissions-matrix';
import type { UserRole } from '@/core/permissions/rbac/types';

// ─── FeatureGuard ───────────────────────────────────────────
// Wraps children — renders nothing if user lacks feature access.
// Usage: <FeatureGuard feature="hr"> <HrDashboard /> </FeatureGuard>

export function FeatureGuard({
  feature,
  children,
  fallback = null,
}: {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const role = useAuthStore((s) => s.user?.role);
  if (!role || !canAccessFeature(role, feature)) return <>{fallback}</>;
  return <>{children}</>;
}

// ─── ActionGuard ────────────────────────────────────────────
// Wraps children — renders nothing if user lacks action permission.
// Usage: <ActionGuard entity="complaint" action="delete"> <DeleteButton /> </ActionGuard>

export function ActionGuard({
  entity,
  action,
  children,
  fallback = null,
}: {
  entity: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const role = useAuthStore((s) => s.user?.role);
  if (!role || !canPerformAction(role, entity, action)) return <>{fallback}</>;
  return <>{children}</>;
}

// ─── RoleGuard ──────────────────────────────────────────────
// Wraps children — renders nothing if user's role is not in the list.
// Usage: <RoleGuard roles={['admin', 'super_admin']}> <AdminPanel /> </RoleGuard>

export function RoleGuard({
  roles,
  children,
  fallback = null,
}: {
  roles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const role = useAuthStore((s) => s.user?.role);
  if (!role || !hasPermission(role, roles)) return <>{fallback}</>;
  return <>{children}</>;
}

// ─── MinRoleGuard ───────────────────────────────────────────
// Wraps children — renders nothing if user's role is below the minimum.
// Usage: <MinRoleGuard minRole="admin"> <SensitiveData /> </MinRoleGuard>

export function MinRoleGuard({
  minRole,
  children,
  fallback = null,
}: {
  minRole: UserRole;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const role = useAuthStore((s) => s.user?.role);
  if (!role || !hasMinRole(role, minRole)) return <>{fallback}</>;
  return <>{children}</>;
}
