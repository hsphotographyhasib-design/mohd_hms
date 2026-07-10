/**
 * Feature-level permission map — DELEGATED to unified RBAC.
 *
 * @deprecated Import from '@/core/permissions/rbac' instead.
 * This file is kept for backward compatibility only.
 */

// Re-export everything from the unified source
export { FEATURE_PERMISSIONS as PERMISSIONS, canAccessFeature as canAccess, hasPermission, hasMinRole } from '@/core/permissions/rbac/permissions-matrix';