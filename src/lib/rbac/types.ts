/**
 * Enterprise RBAC Type Definitions
 * MOHD.HMS ENTERPRISE — Role-Based Access Control System
 */

import type { Prisma } from '@prisma/client';

/** All supported roles in the system */
export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'manager'
  | 'supervisor'
  | 'technician'
  | 'finance'
  | 'hr'
  | 'customer'
  | 'vendor'
  | 'guest';

/** Resolved authentication context extracted from JWT + optional DB enrichment */
export interface AuthContext {
  userId: string;
  tenantId: string;
  role: UserRole;
  email: string | undefined;
  phone: string | undefined;
  departmentId: string | null;
  /** Resolved only for customer role: the linked Customer.id */
  customerId: string | null;
}

/** Level of access granted to the user */
export type AccessLevel =
  | 'own'           // Customer: only own complaints
  | 'assigned'      // Technician: only assigned complaints
  | 'team'          // Supervisor: team complaints
  | 'department'    // Manager: department complaints
  | 'financial'     // Finance: invoice/payment-related complaints
  | 'tenant'        // Admin: full tenant access
  | 'platform'      // Super Admin: full platform access
  | 'none';         // No access (guest, vendor, hr for complaints)

/** Result of building RBAC complaint query filter */
export interface ComplaintAccessResult {
  /** Prisma WHERE clause to apply */
  where: Prisma.ComplaintWhereInput;
  /** Human-readable access level for logging */
  accessLevel: AccessLevel;
  /** Description of what this user can access */
  description: string;
}

/** Audit log entry for complaint access */
export interface ComplaintAuditEntry {
  userId: string;
  role: string;
  complaintId?: string;
  action: string;
  result: 'ALLOWED' | 'DENIED';
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}