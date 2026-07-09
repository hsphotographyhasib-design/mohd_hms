/**
 * Dashboard Scope Builder
 *
 * Centralised role-based scoping for all three dashboard API routes
 * (KPI, Charts, Recent).  Returns Prisma WHERE clauses and visibility
 * flags so every route applies the exact same access rules.
 *
 * Consumed by:
 *   - src/app/api/dashboard/kpi/route.ts
 *   - src/app/api/dashboard/charts/route.ts
 *   - src/app/api/dashboard/recent/route.ts
 */

import type { Prisma } from '@prisma/client';
import { buildAuthContext, buildComplaintWhereClause, resolveDepartmentTechnicianIds } from '@/core/permissions/rbac';

// ── Public shape ────────────────────────────────────────────────────────────

export interface DashboardScope {
  /** WHERE clause for complaint queries (already RBAC-scoped) */
  complaintWhere: Prisma.ComplaintWhereInput;
  /** WHERE clause for work-order queries */
  workOrderWhere: Prisma.WorkOrderWhereInput;
  /** WHERE clause for invoice queries */
  invoiceWhere: Prisma.InvoiceWhereInput;
  /** WHERE clause for quotation queries */
  quotationWhere: Prisma.QuotationWhereInput;
  /** WHERE clause for equipment queries */
  equipmentWhere: Prisma.EquipmentWhereInput;
  /** Whether the role may see revenue / invoice financial data */
  canSeeRevenue: boolean;
  /** Whether the role may see inventory (low-stock) data */
  canSeeInventory: boolean;
  /** Whether the role may see PM schedule data */
  canSeePm: boolean;
  /** Whether the role may see employee counts */
  canSeeEmployees: boolean;
  /** Whether the role may see customer counts */
  canSeeCustomers: boolean;
  /** Whether the role may see equipment data */
  canSeeEquipment: boolean;
  /** Resolved customer ID (non-null only for customer role) */
  customerId: string | null;
}

// ── Builder ─────────────────────────────────────────────────────────────────

/**
 * Build a complete `DashboardScope` from a JWT payload.
 *
 * Returns `null` when the auth context cannot be resolved (unauthorised).
 */
export async function buildDashboardScope(payload: {
  userId: string;
  tenantId: string;
  role: string;
  email?: string;
}): Promise<DashboardScope | null> {
  // 1. Resolve the full auth context (enriches with departmentId, customerId, …)
  const ctx = await buildAuthContext(payload, { resolveCustomer: true });
  if (!ctx) return null;

  // 2. Build complaint WHERE via the enterprise RBAC engine
  const { where: complaintWhere } = await buildComplaintWhereClause(ctx);

  const { role, tenantId, userId } = ctx;

  // 3. Build work-order WHERE
  let workOrderWhere: Prisma.WorkOrderWhereInput = { tenantId };

  if (role === 'technician') {
    workOrderWhere = { tenantId, assignedToId: userId };
  } else if (role === 'supervisor') {
    const deptTechIds = ctx.departmentId
      ? await resolveDepartmentTechnicianIds(tenantId, ctx.departmentId)
      : [];
    workOrderWhere = {
      tenantId,
      OR: [
        { complaint: { supervisorId: userId } },
        { assignedToId: { in: deptTechIds } },
      ],
    };
  } else if (role === 'customer') {
    workOrderWhere = ctx.customerId
      ? { tenantId, complaint: { customerId: ctx.customerId } }
      : ({ tenantId, id: '__NEVER_MATCH__' } as Prisma.WorkOrderWhereInput);
  } else if (role === 'hr' || role === 'finance') {
    workOrderWhere = { tenantId, id: '__NEVER_MATCH__' } as Prisma.WorkOrderWhereInput;
  }

  // 4. Build invoice WHERE
  let invoiceWhere: Prisma.InvoiceWhereInput = { tenantId };

  if (role === 'customer') {
    invoiceWhere = ctx.customerId
      ? { tenantId, customerId: ctx.customerId }
      : ({ tenantId, id: '__NEVER_MATCH__' } as Prisma.InvoiceWhereInput);
  } else if (!['super_admin', 'admin', 'manager', 'finance'].includes(role)) {
    invoiceWhere = { tenantId, id: '__NEVER_MATCH__' } as Prisma.InvoiceWhereInput;
  }

  // 5. Build quotation WHERE (mirrors invoice logic)
  let quotationWhere: Prisma.QuotationWhereInput = { tenantId };

  if (role === 'customer') {
    quotationWhere = ctx.customerId
      ? { tenantId, customerId: ctx.customerId }
      : ({ tenantId, id: '__NEVER_MATCH__' } as Prisma.QuotationWhereInput);
  } else if (!['super_admin', 'admin', 'manager', 'finance'].includes(role)) {
    quotationWhere = { tenantId, id: '__NEVER_MATCH__' } as Prisma.QuotationWhereInput;
  }

  // 6. Build equipment WHERE
  let equipmentWhere: Prisma.EquipmentWhereInput = { tenantId };

  if (role === 'customer' && ctx.customerId) {
    equipmentWhere = { tenantId, customerId: ctx.customerId };
  } else if (role === 'supervisor' || role === 'hr' || role === 'finance') {
    equipmentWhere = { tenantId, id: '__NEVER_MATCH__' } as Prisma.EquipmentWhereInput;
  }

  // 7. Permission flags
  const canSeeRevenue = ['super_admin', 'admin', 'manager', 'finance'].includes(role);
  const canSeeInventory = ['super_admin', 'admin', 'manager'].includes(role);
  const canSeePm = ['super_admin', 'admin', 'manager', 'supervisor'].includes(role);
  const canSeeEmployees = ['super_admin', 'admin', 'manager', 'hr'].includes(role);
  const canSeeCustomers = ['super_admin', 'admin', 'manager', 'finance'].includes(role);
  const canSeeEquipment =
    ['super_admin', 'admin', 'manager', 'technician'].includes(role) ||
    (role === 'customer' && !!ctx.customerId);

  return {
    complaintWhere,
    workOrderWhere,
    invoiceWhere,
    quotationWhere,
    equipmentWhere,
    canSeeRevenue,
    canSeeInventory,
    canSeePm,
    canSeeEmployees,
    canSeeCustomers,
    canSeeEquipment,
    customerId: ctx.customerId ?? null,
  };
}