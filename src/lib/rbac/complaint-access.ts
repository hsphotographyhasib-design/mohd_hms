/**
 * Enterprise Complaint RBAC Engine
 *
 * Builds Prisma WHERE clauses that enforce role-based access control at the
 * database query level. Every complaint query MUST pass through this module.
 *
 * Security guarantee: The frontend NEVER receives complaints the user is not
 * authorized to access, regardless of URL manipulation or API parameters.
 *
 * Roles handled:
 *   - super_admin  → platform-wide access (all tenants)
 *   - admin        → full tenant access
 *   - manager      → department complaints + supervised complaints
 *   - supervisor   → complaints supervised by this user
 *   - technician   → complaints assigned to this user
 *   - finance      → complaints with invoices or in financial workflow
 *   - customer     → only their own complaints (linked via email/phone)
 *   - hr           → no direct complaint access (denied)
 *   - vendor       → no complaint access (denied)
 *   - guest        → no complaint access (denied)
 */

import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import type {
  AuthContext,
  ComplaintAccessResult,
  AccessLevel,
  UserRole,
} from './types';

// ── In-memory cache for customer/department lookups (short TTL) ─────────────

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000; // 1 minute
const customerCache = new Map<string, CacheEntry<string | null>>();
const deptTechCache = new Map<string, CacheEntry<string[]>>();

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T) {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── Customer Link Resolution ────────────────────────────────────────────────

/**
 * Find the Customer.id linked to a user by matching email or phone.
 * Results are cached for 1 minute.
 */
async function resolveCustomerId(
  tenantId: string,
  email?: string,
  phone?: string
): Promise<string | null> {
  const cacheKey = `${tenantId}:${email || ''}:${phone || ''}`;
  const cached = getCached(customerCache, cacheKey);
  if (cached !== null) return cached;

  const orConditions: Prisma.CustomerWhereInput[] = [];
  if (email) orConditions.push({ email });
  if (phone) orConditions.push({ phone });

  if (orConditions.length === 0) {
    setCache(customerCache, cacheKey, null);
    return null;
  }

  const customer = await db.customer.findFirst({
    where: { tenantId, OR: orConditions },
    select: { id: true },
  });

  const result = customer?.id ?? null;
  setCache(customerCache, cacheKey, result);
  return result;
}

// ── Department Technician Resolution ────────────────────────────────────────

/**
 * Find all technician user IDs within a department.
 * Results are cached for 1 minute.
 */
async function resolveDepartmentTechnicianIds(
  tenantId: string,
  departmentId: string
): Promise<string[]> {
  const cacheKey = `${tenantId}:${departmentId}`;
  const cached = getCached(deptTechCache, cacheKey);
  if (cached !== null) return cached;

  const users = await db.user.findMany({
    where: {
      tenantId,
      departmentId,
      role: 'technician',
      isActive: true,
    },
    select: { id: true },
  });

  const ids = users.map((u) => u.id);
  setCache(deptTechCache, cacheKey, ids);
  return ids;
}

// ── Roles that have NO complaint access ─────────────────────────────────────

const DENIED_ROLES: UserRole[] = ['vendor', 'guest'];

// ── Core: Build complaint WHERE clause ──────────────────────────────────────

/**
 * Build a Prisma WHERE clause that restricts complaint queries to only
 * those the authenticated user is authorized to access.
 *
 * This is the single source of truth for complaint access control.
 * ALL complaint list/detail queries MUST use this.
 */
export async function buildComplaintWhereClause(
  ctx: AuthContext
): Promise<ComplaintAccessResult> {
  const { role, tenantId, userId, email, phone, departmentId, customerId } = ctx;

  // ─── Super Admin: full platform access ───
  if (role === 'super_admin') {
    return {
      where: {}, // No restriction
      accessLevel: 'platform',
      description: 'Super Admin: full platform access',
    };
  }

  // ─── Admin: full tenant access ───
  if (role === 'admin') {
    return {
      where: { tenantId },
      accessLevel: 'tenant',
      description: 'Admin: full tenant access',
    };
  }

  // ─── Manager: department + supervised complaints ───
  if (role === 'manager') {
    if (departmentId) {
      const techIds = await resolveDepartmentTechnicianIds(tenantId, departmentId);

      const where: Prisma.ComplaintWhereInput = {
        tenantId,
        OR: [
          { assignedToId: { in: techIds } },
          { supervisorId: userId },
        ],
      };

      // If no technicians in department, fall back to supervisor-only
      if (techIds.length === 0) {
        where.OR = [{ supervisorId: userId }];
      }

      return {
        where,
        accessLevel: 'department',
        description: `Manager: department ${departmentId} (${techIds.length} technicians) + supervised`,
      };
    }

    // Manager without department = full tenant access (acts like admin)
    return {
      where: { tenantId },
      accessLevel: 'tenant',
      description: 'Manager (no department): full tenant access',
    };
  }

  // ─── Supervisor: complaints they supervise ───
  if (role === 'supervisor') {
    return {
      where: { tenantId, supervisorId: userId },
      accessLevel: 'team',
      description: 'Supervisor: supervised complaints only',
    };
  }

  // ─── Technician: only assigned complaints ───
  if (role === 'technician') {
    return {
      where: { tenantId, assignedToId: userId },
      accessLevel: 'assigned',
      description: 'Technician: assigned complaints only',
    };
  }

  // ─── Finance: only invoice/payment-related complaints ───
  if (role === 'finance') {
    return {
      where: {
        tenantId,
        OR: [
          { invoiceId: { not: null } },
          { status: { in: ['INVOICE_APPROVED', 'INVOICE_SENT', 'PAID', 'CLIENT_CONFIRMED'] } },
        ],
      },
      accessLevel: 'financial',
      description: 'Finance: invoice/payment-related complaints only',
    };
  }

  // ─── Customer: only own complaints ───
  if (role === 'customer') {
    // Use pre-resolved customerId if available
    let linkedCustomerId = customerId;

    if (!linkedCustomerId) {
      linkedCustomerId = await resolveCustomerId(tenantId, email, phone);
    }

    if (!linkedCustomerId) {
      return {
        where: { tenantId, id: '__NEVER_MATCH__' },
        accessLevel: 'none',
        description: 'Customer: no linked customer record found',
      };
    }

    return {
      where: { tenantId, customerId: linkedCustomerId },
      accessLevel: 'own',
      description: `Customer: own complaints (customer=${linkedCustomerId})`,
    };
  }

  // ─── HR: no direct complaint access ───
  if (role === 'hr') {
    return {
      where: { tenantId, id: '__NEVER_MATCH__' },
      accessLevel: 'none',
      description: 'HR: no direct complaint access',
    };
  }

  // ─── Vendor / Guest: no access ───
  if (DENIED_ROLES.includes(role)) {
    return {
      where: { tenantId, id: '__NEVER_MATCH__' },
      accessLevel: 'none',
      description: `${role}: no complaint access`,
    };
  }

  // ─── Unknown role: deny by default ───
  return {
    where: { tenantId, id: '__NEVER_MATCH__' },
    accessLevel: 'none',
    description: `Unknown role '${role}': no access`,
  };
}

// ── Ownership Check for Single Complaint ────────────────────────────────────

/**
 * Check if a user has access to a specific complaint by ID.
 * Returns true if the complaint passes the RBAC WHERE clause.
 */
export async function canAccessComplaint(
  ctx: AuthContext,
  complaintId: string
): Promise<boolean> {
  const { where } = await buildComplaintWhereClause(ctx);

  // Build the full where clause including the complaint ID
  const fullWhere: Prisma.ComplaintWhereInput = {
    ...where,
    id: complaintId,
  };

  // For super_admin, `where` is `{}` so we just check by ID
  const count = await db.complaint.count({ where: fullWhere });
  return count > 0;
}

// ── Role mutation permission checks ─────────────────────────────────────────

/** Actions that require specific roles */
export const ROLE_REQUIRED_ACTIONS: Record<string, UserRole[]> = {
  delete: ['super_admin', 'admin'],
  assign_technician: ['super_admin', 'admin', 'supervisor', 'manager'],
  reassign_technician: ['super_admin', 'admin', 'supervisor', 'manager'],
  override_status: ['super_admin', 'admin'],
  approve_completion: ['super_admin', 'admin', 'supervisor', 'manager'],
  start_work: ['super_admin', 'admin', 'supervisor', 'manager', 'technician'],
  complete_work: ['super_admin', 'admin', 'supervisor', 'manager', 'technician'],
  client_confirm: ['customer', 'super_admin', 'admin'],
  client_reject: ['customer', 'super_admin', 'admin'],
  record_payment: ['super_admin', 'admin', 'finance'],
  approve_invoice: ['super_admin', 'admin', 'finance', 'manager'],
  send_invoice: ['super_admin', 'admin', 'finance'],
  close: ['super_admin', 'admin', 'supervisor', 'manager'],
  update_fields: ['super_admin', 'admin', 'supervisor', 'manager', 'technician'],
  view: ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'finance', 'customer'],
  create: ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'customer'],
  view_timeline: ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'finance', 'customer'],
  view_assignment_history: ['super_admin', 'admin', 'manager', 'supervisor', 'technician', 'finance'],
};

/**
 * Check if a role can perform a specific action.
 */
export function canPerformAction(role: string, action: string): boolean {
  const allowedRoles = ROLE_REQUIRED_ACTIONS[action];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role as UserRole);
}

// ── Auth Context Builder ────────────────────────────────────────────────────

/**
 * Build a full AuthContext from a JWT payload.
 * Optionally pre-resolves customer ID for customer-role users.
 */
export async function buildAuthContext(
  payload: { userId?: string; tenantId?: string; role?: string; email?: string },
  options?: { resolveCustomer?: boolean }
): Promise<AuthContext | null> {
  const userId = payload.userId as string;
  const tenantId = payload.tenantId as string;
  const role = (payload.role as string).toLowerCase() as UserRole;
  const email = payload.email;

  if (!userId || !tenantId || !role) return null;

  // Look up user to get phone and departmentId (not in JWT)
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { phone: true, departmentId: true, email: true, isActive: true },
  });

  if (!user || !user.isActive) return null;

  let customerId: string | null = null;
  if (options?.resolveCustomer && role === 'customer') {
    customerId = await resolveCustomerId(tenantId, user.email || email, user.phone || undefined);
  }

  return {
    userId,
    tenantId,
    role,
    email: user.email || email,
    phone: user.phone || undefined,
    departmentId: user.departmentId,
    customerId,
  };
}

/**
 * Build AuthContext from a NextRequest (extracts JWT automatically).
 */
export async function buildAuthContextFromRequest(
  request: Request,
  options?: { resolveCustomer?: boolean }
): Promise<AuthContext | null> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;

  const { verifyToken } = await import('@/lib/auth');
  const payload = verifyToken(token);
  if (!payload) return null;

  return buildAuthContext(payload, options);
}

// ── Field-level access control for sensitive complaint fields ───────────────

/**
 * Fields that should be redacted for customer-role users.
 */
export const CUSTOMER_HIDDEN_FIELDS: string[] = [
  'rejectionReason',
  'reworkReason',
  'assignmentReason',
  'reassignmentCount',
  'slaResponseDeadline',
];

/**
 * Determine if a field is visible to a given role.
 * Customer cannot see internal notes, financial details, etc.
 */
export function isFieldVisibleToRole(fieldName: string, role: string): boolean {
  if (role === 'customer' && CUSTOMER_HIDDEN_FIELDS.includes(fieldName)) {
    return false;
  }
  return true;
}