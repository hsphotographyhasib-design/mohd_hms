/**
 * RBAC utilities — DELEGATED to unified RBAC.
 *
 * @deprecated Import from '@/core/permissions/rbac' instead.
 * This file is kept for backward compatibility only.
 */

export { ROLE_HIERARCHY, canAccessFeature as canAccess, hasPermission, hasMinRole } from '@/core/permissions/rbac/permissions-matrix';