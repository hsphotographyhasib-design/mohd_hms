/**
 * Enterprise RBAC — Public API
 *
 * Single entry point for all RBAC operations.
 * Import from '@/core/permissions/rbac' instead of individual sub-modules.
 */

// Types
export type { AuthContext, ComplaintAccessResult, AccessLevel, UserRole, ComplaintAuditEntry } from './types';

// Complaint RBAC engine
export { buildComplaintWhereClause, canAccessComplaint, canPerformComplaintAction, buildAuthContext, buildAuthContextFromRequest, isFieldVisibleToRole, CUSTOMER_HIDDEN_FIELDS, resolveDepartmentTechnicianIds } from './complaint-access';

// Complaint audit logging
export { logComplaintAccess, logComplaintAccessDenied, logComplaintAccessAllowed, extractIpAddress, extractUserAgent, extractDeviceType } from './audit-logger';

// Data scope builder
export type { DataScope } from './data-scope';
export { buildDataScope, buildDataScopeFromRequest, scopeInvoice, scopeWorkOrder, scopeQuotation, scopeEquipment, scopeCustomer } from './data-scope';

// Unified permissions matrix (SINGLE SOURCE OF TRUTH)
export { FEATURE_PERMISSIONS, ACTION_PERMISSIONS, ROLE_HIERARCHY, ROLE_TRANSITION_MATRIX, ALL_ROLES, canAccessFeature, canPerformAction, hasMinRole, hasPermission, canTransitionRole, parseRole } from './permissions-matrix';