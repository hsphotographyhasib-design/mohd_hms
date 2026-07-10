/**
 * Enterprise RBAC — Public API
 *
 * Single entry point for all RBAC operations.
 * Import from '@/core/permissions/rbac' instead of individual sub-modules.
 */

export type { AuthContext, ComplaintAccessResult, AccessLevel, UserRole, ComplaintAuditEntry } from './types';
export { buildComplaintWhereClause, canAccessComplaint, canPerformAction, buildAuthContext, buildAuthContextFromRequest, isFieldVisibleToRole, CUSTOMER_HIDDEN_FIELDS, ROLE_REQUIRED_ACTIONS, resolveDepartmentTechnicianIds } from './complaint-access';
export { logComplaintAccess, logComplaintAccessDenied, logComplaintAccessAllowed, extractIpAddress, extractUserAgent, extractDeviceType } from './audit-logger';
export type { DataScope } from './data-scope';
export { buildDataScope, buildDataScopeFromRequest, scopeInvoice, scopeWorkOrder, scopeQuotation, scopeEquipment, scopeCustomer } from './data-scope';