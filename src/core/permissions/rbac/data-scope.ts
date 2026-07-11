/**
 * Generalised RBAC Data-Scope Builder
 *
 * Provides a single, reusable `buildDataScope(payload)` that any API route
 * can call to obtain Prisma WHERE clauses for every major entity in the
 * system, scoped to the authenticated user's role.
 *
 * Consumed by:
 *   - src/app/api/invoices/…
 *   - src/app/api/work-orders/…
 *   - src/app/api/quotations/…
 *   - src/app/api/equipment/…
 *   - src/app/api/customers/…
 *   - Any future API route that needs role-based data filtering
 *
 * Security guarantee: The frontend NEVER receives records the user is not
 * authorised to access, regardless of URL manipulation or API parameters.
 */

import type { Prisma } from '@prisma/client';
import type { NextRequest } from 'next/server';
import {
  buildAuthContext,
  buildComplaintWhereClause,
  resolveDepartmentTechnicianIds,
} from './complaint-access';
import { verifyToken } from '@/core/auth/auth-lib';

// ── Public shape ────────────────────────────────────────────────────────────

/**
 * Pre-built Prisma WHERE clauses for every entity type.
 *
 * Each field can be spread directly into a `prisma.xxx.findMany({ where: … })`
 * call.  When a role has no access to an entity, the clause uses the
 * `__NEVER_MATCH__` sentinel value so the query always returns zero rows.
 */
export interface DataScope {
  /** WHERE clause for Complaint queries (delegated to the RBAC engine) */
  complaint: Prisma.ComplaintWhereInput;
  /** WHERE clause for WorkOrder queries */
  workOrder: Prisma.WorkOrderWhereInput;
  /** WHERE clause for Invoice queries */
  invoice: Prisma.InvoiceWhereInput;
  /** WHERE clause for Quotation queries */
  quotation: Prisma.QuotationWhereInput;
  /** WHERE clause for Equipment queries */
  equipment: Prisma.EquipmentWhereInput;
  /** WHERE clause for Customer queries */
  customer: Prisma.CustomerWhereInput;
}

// ── Sentinel: deny access without exceptions ─────────────────────────────────

const DENIED_COMPLAINT: Prisma.ComplaintWhereInput = { id: '__NEVER_MATCH__' };
const DENIED_WORK_ORDER: Prisma.WorkOrderWhereInput = { id: '__NEVER_MATCH__' };
const DENIED_INVOICE: Prisma.InvoiceWhereInput = { id: '__NEVER_MATCH__' };
const DENIED_QUOTATION: Prisma.QuotationWhereInput = { id: '__NEVER_MATCH__' };
const DENIED_EQUIPMENT: Prisma.EquipmentWhereInput = { id: '__NEVER_MATCH__' };
const DENIED_CUSTOMER: Prisma.CustomerWhereInput = { id: '__NEVER_MATCH__' };

// ── Core builder ────────────────────────────────────────────────────────────

/**
 * Build a complete `DataScope` from a JWT payload.
 *
 * Resolves the user's auth context (department, linked customer, etc.) via
 * `buildAuthContext`, then constructs Prisma WHERE clauses for every entity
 * based on the user's role.
 *
 * Returns `null` when the auth context cannot be resolved (unauthorised).
 *
 * @example
 * ```ts
 * const auth = await verifyAuth(request);
 * if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *
 * const scope = await buildDataScope(auth.user);
 * if (!scope) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
 *
 * const invoices = await db.invoice.findMany({ where: scope.invoice });
 * ```
 */
export async function buildDataScope(payload: {
  userId: string;
  tenantId: string;
  role: string;
  email?: string;
}): Promise<DataScope | null> {
  // 1. Resolve the full auth context (enriches with departmentId, customerId, …)
  const ctx = await buildAuthContext(payload, { resolveCustomer: true });
  if (!ctx) return null;

  // 2. Build complaint WHERE via the enterprise RBAC engine
  const { where: complaintWhere } = await buildComplaintWhereClause(ctx);

  const { role, tenantId, userId, departmentId, customerId } = ctx;

  // 3. Build entity-specific WHERE clauses based on role
  let workOrderWhere: Prisma.WorkOrderWhereInput;
  let invoiceWhere: Prisma.InvoiceWhereInput;
  let quotationWhere: Prisma.QuotationWhereInput;
  let equipmentWhere: Prisma.EquipmentWhereInput;
  let customerWhere: Prisma.CustomerWhereInput;

  // ─── super_admin: no restrictions ──────────────────────────────────────
  if (role === 'super_admin') {
    workOrderWhere = { tenantId };
    invoiceWhere = { tenantId };
    quotationWhere = { tenantId };
    equipmentWhere = { tenantId };
    customerWhere = { tenantId };

    return { complaint: complaintWhere, workOrder: workOrderWhere, invoice: invoiceWhere, quotation: quotationWhere, equipment: equipmentWhere, customer: customerWhere };
  }

  // ─── admin: full tenant access ────────────────────────────────────────
  if (role === 'admin') {
    workOrderWhere = { tenantId };
    invoiceWhere = { tenantId };
    quotationWhere = { tenantId };
    equipmentWhere = { tenantId };
    customerWhere = { tenantId };

    return { complaint: complaintWhere, workOrder: workOrderWhere, invoice: invoiceWhere, quotation: quotationWhere, equipment: equipmentWhere, customer: customerWhere };
  }

  // ─── manager: department + supervised complaints, full tenant for equipment/customers
  //   NO invoice or quotation access per permission spec ────────────────
  if (role === 'manager') {
    // Work orders: department technicians + supervised complaints
    if (departmentId) {
      const deptTechIds = await resolveDepartmentTechnicianIds(tenantId, departmentId);
      workOrderWhere = {
        tenantId,
        OR: [
          { complaint: { supervisorId: userId } },
          { assignedToId: { in: deptTechIds } },
        ],
      };
    } else {
      workOrderWhere = { tenantId };
    }

    // Invoices / Quotations: DENIED (manager has no commercial access)
    invoiceWhere = DENIED_INVOICE;
    quotationWhere = DENIED_QUOTATION;
    equipmentWhere = { tenantId };
    customerWhere = { tenantId };

    return { complaint: complaintWhere, workOrder: workOrderWhere, invoice: invoiceWhere, quotation: quotationWhere, equipment: equipmentWhere, customer: customerWhere };
  }

  // ─── supervisor: supervised complaints + department technicians for WOs
  //   Quotations: full tenant access (create/edit/send)
  //   Invoices: DENIED per permission spec ─────────────────────────────
  if (role === 'supervisor') {
    // Work orders: supervised complaints + department technicians
    if (departmentId) {
      const deptTechIds = await resolveDepartmentTechnicianIds(tenantId, departmentId);
      workOrderWhere = {
        tenantId,
        OR: [
          { complaint: { supervisorId: userId } },
          { assignedToId: { in: deptTechIds } },
        ],
      };
    } else {
      workOrderWhere = {
        tenantId,
        complaint: { supervisorId: userId },
      };
    }

    // Quotations: full tenant access (supervisor can create/edit/send)
    quotationWhere = { tenantId };
    // Invoices: DENIED (supervisor has no invoice access)
    invoiceWhere = DENIED_INVOICE;
    equipmentWhere = { tenantId };
    customerWhere = { tenantId };

    return { complaint: complaintWhere, workOrder: workOrderWhere, invoice: invoiceWhere, quotation: quotationWhere, equipment: equipmentWhere, customer: customerWhere };
  }

  // ─── technician: assigned complaints + own work orders, denied for invoicing ─
  if (role === 'technician') {
    workOrderWhere = { tenantId, assignedToId: userId };
    // Technicians can view assigned equipment
    equipmentWhere = { tenantId };
    // Invoices / Quotations / Customers: DENIED
    invoiceWhere = DENIED_INVOICE;
    quotationWhere = DENIED_QUOTATION;
    customerWhere = DENIED_CUSTOMER;

    return { complaint: complaintWhere, workOrder: workOrderWhere, invoice: invoiceWhere, quotation: quotationWhere, equipment: equipmentWhere, customer: customerWhere };
  }

  // ─── finance: financial complaints + full tenant invoices, denied for quotations/WOs/equipment
  //   Quotations: DENIED per permission spec (except convert_to_invoice) ──
  if (role === 'finance') {
    // Work orders: DENIED
    workOrderWhere = DENIED_WORK_ORDER;
    // Invoices: full tenant access
    invoiceWhere = { tenantId };
    // Quotations: DENIED (finance has no quotation access except convert)
    quotationWhere = DENIED_QUOTATION;
    // Equipment: DENIED
    equipmentWhere = DENIED_EQUIPMENT;
    customerWhere = { tenantId };

    return { complaint: complaintWhere, workOrder: workOrderWhere, invoice: invoiceWhere, quotation: quotationWhere, equipment: equipmentWhere, customer: customerWhere };
  }

  // ─── hr: no access to most entities ───────────────────────────────────
  if (role === 'hr') {
    workOrderWhere = DENIED_WORK_ORDER;
    invoiceWhere = DENIED_INVOICE;
    quotationWhere = DENIED_QUOTATION;
    equipmentWhere = DENIED_EQUIPMENT;
    customerWhere = DENIED_CUSTOMER;

    return { complaint: complaintWhere, workOrder: workOrderWhere, invoice: invoiceWhere, quotation: quotationWhere, equipment: equipmentWhere, customer: customerWhere };
  }

  // ─── customer: own data only ──────────────────────────────────────────
  if (role === 'customer') {
    if (customerId) {
      workOrderWhere = { tenantId, complaint: { customerId } };
      invoiceWhere = { tenantId, customerId };
      quotationWhere = { tenantId, customerId };
      equipmentWhere = { tenantId, customerId };
    } else {
      // No linked customer record — deny everything
      workOrderWhere = DENIED_WORK_ORDER;
      invoiceWhere = DENIED_INVOICE;
      quotationWhere = DENIED_QUOTATION;
      equipmentWhere = DENIED_EQUIPMENT;
    }

    // Customers should only see their own profile (denied in listing)
    customerWhere = DENIED_CUSTOMER;

    return { complaint: complaintWhere, workOrder: workOrderWhere, invoice: invoiceWhere, quotation: quotationWhere, equipment: equipmentWhere, customer: customerWhere };
  }

  // ─── vendor / guest / unknown: DENIED for everything ──────────────────
  return {
    complaint: DENIED_COMPLAINT,
    workOrder: DENIED_WORK_ORDER,
    invoice: DENIED_INVOICE,
    quotation: DENIED_QUOTATION,
    equipment: DENIED_EQUIPMENT,
    customer: DENIED_CUSTOMER,
  };
}

// ── Convenience wrapper: extract JWT from a NextRequest ──────────────────────

/**
 * Build a `DataScope` directly from a NextRequest object.
 *
 * Extracts the Bearer token, verifies it, and delegates to `buildDataScope`.
 * Returns `null` if the token is missing, invalid, or the auth context
 * cannot be resolved.
 *
 * @example
 * ```ts
 * const scope = await buildDataScopeFromRequest(request);
 * if (!scope) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
 *
 * const workOrders = await db.workOrder.findMany({ where: scope.workOrder });
 * ```
 */
export async function buildDataScopeFromRequest(
  request: NextRequest,
): Promise<DataScope | null> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload?.userId || !payload?.tenantId || !payload?.role) return null;

  return buildDataScope({
    userId: payload.userId as string,
    tenantId: payload.tenantId as string,
    role: payload.role as string,
    email: payload.email as string | undefined,
  });
}

// ── Per-entity convenience functions ─────────────────────────────────────────

/**
 * Build a WHERE clause for Invoice queries scoped to the authenticated user.
 *
 * @example
 * ```ts
 * const auth = await verifyAuth(request);
 * const invoiceWhere = await scopeInvoice(auth.user);
 * if (!invoiceWhere) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
 * const invoices = await db.invoice.findMany({ where: invoiceWhere });
 * ```
 */
export async function scopeInvoice(payload: {
  userId: string;
  tenantId: string;
  role: string;
  email?: string;
}): Promise<Prisma.InvoiceWhereInput | null> {
  const scope = await buildDataScope(payload);
  return scope?.invoice ?? null;
}

/**
 * Build a WHERE clause for WorkOrder queries scoped to the authenticated user.
 */
export async function scopeWorkOrder(payload: {
  userId: string;
  tenantId: string;
  role: string;
  email?: string;
}): Promise<Prisma.WorkOrderWhereInput | null> {
  const scope = await buildDataScope(payload);
  return scope?.workOrder ?? null;
}

/**
 * Build a WHERE clause for Quotation queries scoped to the authenticated user.
 */
export async function scopeQuotation(payload: {
  userId: string;
  tenantId: string;
  role: string;
  email?: string;
}): Promise<Prisma.QuotationWhereInput | null> {
  const scope = await buildDataScope(payload);
  return scope?.quotation ?? null;
}

/**
 * Build a WHERE clause for Equipment queries scoped to the authenticated user.
 */
export async function scopeEquipment(payload: {
  userId: string;
  tenantId: string;
  role: string;
  email?: string;
}): Promise<Prisma.EquipmentWhereInput | null> {
  const scope = await buildDataScope(payload);
  return scope?.equipment ?? null;
}

/**
 * Build a WHERE clause for Customer queries scoped to the authenticated user.
 */
export async function scopeCustomer(payload: {
  userId: string;
  tenantId: string;
  role: string;
  email?: string;
}): Promise<Prisma.CustomerWhereInput | null> {
  const scope = await buildDataScope(payload);
  return scope?.customer ?? null;
}