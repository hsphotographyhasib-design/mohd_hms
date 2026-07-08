import { Router, Request, Response } from 'express';
import { db } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface DashboardScope {
  complaintWhere: Record<string, unknown>;
  workOrderWhere: Record<string, unknown>;
  /** Supervisor & customer may need a second WHERE merged via OR (dual-query) */
  workOrderSecondaryWhere?: Record<string, unknown>;
  invoiceWhere: Record<string, unknown>;
  quotationWhere: Record<string, unknown>;
  equipmentWhere: Record<string, unknown>;
  pmWhere: Record<string, unknown>;
  canSeeRevenue: boolean;
  canSeeInventory: boolean;
  canSeePm: boolean;
  canSeeEmployees: boolean;
  canSeeCustomers: boolean;
  canSeeEquipment: boolean;
  canSeeComplaints: boolean;
  canSeeWorkOrders: boolean;
  /** Customer role returns 1 for totalCustomers */
  customerCountOverride?: number;
}

// Sentinel that never matches any real row — used to hide data for restricted roles.
const NEVER: Record<string, unknown> = { id: '__NEVER__' };

// ═══════════════════════════════════════════════════════════════════════════════
// Shared scope builder — resolves all WHERE clauses + visibility flags
// for a given (tenantId, userId, role) triple.
//
// Called once per request; each endpoint reuses the returned scope.
// ═══════════════════════════════════════════════════════════════════════════════

async function buildDashboardScope(
  tenantId: string,
  userId: string,
  role: string,
): Promise<DashboardScope> {
  const base: Record<string, unknown> = { tenantId };
  const hidden: Record<string, unknown> = { ...base, ...NEVER };

  // ── Full-access roles ──────────────────────────────────────────────────
  if (['super_admin', 'admin', 'manager'].includes(role)) {
    return {
      complaintWhere: base,
      workOrderWhere: base,
      invoiceWhere: base,
      quotationWhere: base,
      equipmentWhere: base,
      pmWhere: base,
      canSeeRevenue: true,
      canSeeInventory: true,
      canSeePm: true,
      canSeeEmployees: true,
      canSeeCustomers: true,
      canSeeEquipment: true,
      canSeeComplaints: true,
      canSeeWorkOrders: true,
    };
  }

  // ── Supervisor ─────────────────────────────────────────────────────────
  if (role === 'supervisor') {
    // 1. Look up user to get departmentId
    const user = (await db.user.findUnique({
      where: { id: userId },
      select: { departmentId: true },
    })) as { departmentId?: string } | null;
    const deptId = user?.departmentId;

    // 2. Find all technician IDs in their department
    const techs = deptId
      ? ((await db.user.findMany({
          where: { tenantId, departmentId: deptId, role: 'technician', isActive: true },
          select: { id: true },
        })) as { id: string }[])
      : [];
    const techIds = techs.map((t) => t.id);

    // 3. Find complaint IDs supervised by this user (for work-order linking)
    const myComplaints = ((await db.complaint.findMany({
      where: { ...base, supervisorId: userId },
      select: { id: true },
    })) as { id: string }[]);
    const myComplaintIds = myComplaints.map((c) => c.id);

    return {
      complaintWhere: { ...base, supervisorId: userId },
      // Work orders: complaints I supervise OR dept techs are assigned
      workOrderWhere: myComplaintIds.length > 0
        ? { ...base, complaintId: { in: myComplaintIds } }
        : hidden,
      workOrderSecondaryWhere: techIds.length > 0
        ? { ...base, assignedToId: { in: techIds } }
        : hidden,
      invoiceWhere: hidden,
      quotationWhere: hidden,
      equipmentWhere: hidden,
      pmWhere: hidden,
      canSeeRevenue: false,
      canSeeInventory: false,
      canSeePm: false,
      canSeeEmployees: true,
      canSeeCustomers: true,
      canSeeEquipment: false,
      canSeeComplaints: true,
      canSeeWorkOrders: true,
    };
  }

  // ── Technician ────────────────────────────────────────────────────────
  if (role === 'technician') {
    return {
      complaintWhere: { ...base, assignedToId: userId },
      workOrderWhere: { ...base, assignedToId: userId },
      invoiceWhere: hidden,
      quotationWhere: hidden,
      equipmentWhere: base, // tenant-wide count
      pmWhere: hidden,
      canSeeRevenue: false,
      canSeeInventory: false,
      canSeePm: false,
      canSeeEmployees: false,
      canSeeCustomers: false,
      canSeeEquipment: true,
      canSeeComplaints: true,
      canSeeWorkOrders: true,
    };
  }

  // ── Finance ───────────────────────────────────────────────────────────
  if (role === 'finance') {
    return {
      complaintWhere: hidden,
      workOrderWhere: hidden,
      invoiceWhere: base,
      quotationWhere: base,
      equipmentWhere: hidden,
      pmWhere: hidden,
      canSeeRevenue: true,
      canSeeInventory: false,
      canSeePm: false,
      canSeeEmployees: false,
      canSeeCustomers: true,
      canSeeEquipment: false,
      canSeeComplaints: false,
      canSeeWorkOrders: false,
    };
  }

  // ── HR ────────────────────────────────────────────────────────────────
  if (role === 'hr') {
    return {
      complaintWhere: hidden,
      workOrderWhere: hidden,
      invoiceWhere: hidden,
      quotationWhere: hidden,
      equipmentWhere: hidden,
      pmWhere: hidden,
      canSeeRevenue: false,
      canSeeInventory: false,
      canSeePm: false,
      canSeeEmployees: true,
      canSeeCustomers: false,
      canSeeEquipment: false,
      canSeeComplaints: false,
      canSeeWorkOrders: false,
    };
  }

  // ── Customer ──────────────────────────────────────────────────────────
  if (role === 'customer') {
    // 1. Look up user to get email / phone
    const user = (await db.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true },
    })) as { email?: string | null; phone?: string | null } | null;

    // 2. Find linked Customer record via email/phone match
    const orConds: Record<string, unknown>[] = [];
    if (user?.email) orConds.push({ email: user.email });
    if (user?.phone) orConds.push({ phone: user.phone });

    const linked = orConds.length > 0
      ? ((await db.customer.findFirst({
          where: { tenantId, OR: orConds },
          select: { id: true },
        })) as { id: string } | null)
      : null;
    const custId = linked?.id;

    // 3. Find complaint IDs linked to this customer (for work-order linking)
    let complaintIds: string[] = [];
    if (custId) {
      const cc = ((await db.complaint.findMany({
        where: { tenantId, customerId: custId },
        select: { id: true },
      })) as { id: string }[]);
      complaintIds = cc.map((c) => c.id);
    }

    return {
      complaintWhere: custId ? { ...base, customerId: custId } : hidden,
      workOrderWhere: complaintIds.length > 0
        ? { ...base, complaintId: { in: complaintIds } }
        : hidden,
      invoiceWhere: custId ? { ...base, customerId: custId } : hidden,
      quotationWhere: custId ? { ...base, customerId: custId } : hidden,
      equipmentWhere: custId ? { ...base, customerId: custId } : hidden,
      pmWhere: hidden,
      canSeeRevenue: false,
      canSeeInventory: false,
      canSeePm: false,
      canSeeEmployees: false,
      canSeeCustomers: true,
      canSeeEquipment: true,
      canSeeComplaints: true,
      canSeeWorkOrders: true,
      customerCountOverride: 1,
    };
  }

  // ── Unknown role: deny everything ──────────────────────────────────────
  return {
    complaintWhere: hidden,
    workOrderWhere: hidden,
    invoiceWhere: hidden,
    quotationWhere: hidden,
    equipmentWhere: hidden,
    pmWhere: hidden,
    canSeeRevenue: false,
    canSeeInventory: false,
    canSeePm: false,
    canSeeEmployees: false,
    canSeeCustomers: false,
    canSeeEquipment: false,
    canSeeComplaints: false,
    canSeeWorkOrders: false,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers — work-order dual-WHERE queries (supervisor & customer)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * groupBy on work orders, merging results when a secondary WHERE exists
 * (supervisor needs complaint-linked + dept-tech-assigned WOs ORed together).
 */
async function woGroupBy(
  scope: DashboardScope,
  by: string[],
): Promise<Record<string, unknown>[]> {
  if (!scope.canSeeWorkOrders) return [];

  if (!scope.workOrderSecondaryWhere) {
    return db.workOrder.groupBy({
      by,
      where: scope.workOrderWhere,
      _count: { id: true },
    }) as Promise<Record<string, unknown>[]>;
  }

  const [g1, g2] = await Promise.all([
    db.workOrder.groupBy({ by, where: scope.workOrderWhere, _count: { id: true } }),
    db.workOrder.groupBy({ by, where: scope.workOrderSecondaryWhere, _count: { id: true } }),
  ]);

  const merged = new Map<string, Record<string, unknown>>();
  for (const item of [...(g1 as Record<string, unknown>[]), ...(g2 as Record<string, unknown>[])]) {
    const key = String((item as any)[by[0]] ?? '');
    const ex = merged.get(key);
    if (ex) {
      ((ex as any)._count as any).id += ((item as any)._count as any).id;
    } else {
      merged.set(key, { ...item, _count: { id: ((item as any)._count as any).id } });
    }
  }
  return Array.from(merged.values());
}

/**
 * findMany on work orders, deduplicating when a secondary WHERE exists.
 */
async function woFindMany(
  scope: DashboardScope,
  opts?: { take?: number; orderBy?: Record<string, string>; select?: Record<string, unknown> },
): Promise<Record<string, unknown>[]> {
  if (!scope.canSeeWorkOrders) return [];

  if (!scope.workOrderSecondaryWhere) {
    return db.workOrder.findMany({
      where: scope.workOrderWhere,
      ...opts,
    }) as Promise<Record<string, unknown>[]>;
  }

  const [r1, r2] = await Promise.all([
    db.workOrder.findMany({ where: scope.workOrderWhere, ...opts }),
    db.workOrder.findMany({ where: scope.workOrderSecondaryWhere, ...opts }),
  ]);

  const seen = new Set<string>();
  const merged: Record<string, unknown>[] = [];
  for (const wo of [...(r1 as Record<string, unknown>[]), ...(r2 as Record<string, unknown>[])]) {
    const id = String((wo as any).id);
    if (!seen.has(id)) {
      seen.add(id);
      merged.push(wo);
    }
  }

  // Re-apply sort & take
  if (opts?.orderBy) {
    const [key, dir] = Object.entries(opts.orderBy)[0];
    merged.sort((a, b) => {
      const va = (a as any)[key] as string;
      const vb = (b as any)[key] as string;
      if (!va && !vb) return 0;
      if (!va) return 1;
      if (!vb) return -1;
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return dir === 'desc' ? -cmp : cmp;
    });
  }
  return merged.slice(0, opts?.take ?? merged.length);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Shared formatters
// ═══════════════════════════════════════════════════════════════════════════════

function toStatusMap(rows: Record<string, unknown>[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const row of rows) {
    map[(row as any).status as string] = ((row as any)._count as any)?.id ?? 0;
  }
  return map;
}

function buildMonthlyRevenue(invoices: Record<string, unknown>[]): { month: string; revenue: number }[] {
  const now = new Date();
  const result: { month: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    const label = start.toLocaleString('default', { month: 'short', year: '2-digit' });
    const rev = invoices
      .filter((inv) => {
        const d = new Date((inv as any).paidAt as string);
        return d >= start && d <= end;
      })
      .reduce((s, inv) => s + Number((inv as any).total || 0), 0);
    result.push({ month: label, revenue: Math.round(rev * 100) / 100 });
  }
  return result;
}

function calcPmCompliance(pmList: Record<string, unknown>[]): number {
  if (!pmList.length) return 0;
  const completed = pmList.filter((pm) => (pm as any).status === 'completed').length;
  return Math.round((completed / pmList.length) * 100);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Name-enrichment helpers (resolve foreign keys → display names)
// ═══════════════════════════════════════════════════════════════════════════════

async function enrichComplaints(complaints: Record<string, unknown>[]) {
  if (!complaints.length) return [];
  const customerIds = [...new Set(complaints.map((c) => (c as any).customerId).filter(Boolean))] as string[];
  const assigneeIds = [...new Set(complaints.map((c) => (c as any).assignedToId).filter(Boolean))] as string[];
  const supervisorIds = [...new Set(complaints.map((c) => (c as any).supervisorId).filter(Boolean))] as string[];
  const equipmentIds = [...new Set(complaints.map((c) => (c as any).equipmentId).filter(Boolean))] as string[];

  const [customers, assignees, supervisors, equipment] = await Promise.all([
    customerIds.length
      ? db.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
    assigneeIds.length
      ? db.user.findMany({ where: { id: { in: assigneeIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
    supervisorIds.length
      ? db.user.findMany({ where: { id: { in: supervisorIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
    equipmentIds.length
      ? db.equipment.findMany({ where: { id: { in: equipmentIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ]);

  const cMap = new Map((customers as any[]).map((c) => [c.id, c.name]));
  const aMap = new Map((assignees as any[]).map((u) => [u.id, u.name]));
  const sMap = new Map((supervisors as any[]).map((u) => [u.id, u.name]));
  const eMap = new Map((equipment as any[]).map((e) => [e.id, e.name]));

  return complaints.map((c: any) => ({
    id: c.id,
    tenantId: c.tenantId,
    customerId: c.customerId,
    customerName: cMap.get(c.customerId) || null,
    equipmentId: c.equipmentId,
    equipmentName: eMap.get(c.equipmentId) || null,
    title: c.title,
    description: c.description,
    priority: c.priority,
    status: c.status,
    category: c.category,
    assignedToId: c.assignedToId,
    assignedToName: aMap.get(c.assignedToId) || null,
    supervisorId: c.supervisorId,
    supervisorName: sMap.get(c.supervisorId) || null,
    resolvedAt: c.resolvedAt?.toISOString?.() ?? c.resolvedAt ?? null,
    closedAt: c.closedAt?.toISOString?.() ?? c.closedAt ?? null,
    createdAt: c.createdAt?.toISOString?.() ?? c.createdAt ?? null,
    updatedAt: c.updatedAt?.toISOString?.() ?? c.updatedAt ?? null,
  }));
}

async function enrichWorkOrders(workOrders: Record<string, unknown>[], extraUserIds: string[] = []) {
  if (!workOrders.length) return [];
  const assigneeIds = [
    ...new Set([
      ...workOrders.map((wo) => (wo as any).assignedToId).filter(Boolean) as string[],
      ...extraUserIds,
    ]),
  ] as string[];
  const equipmentIds = [...new Set(workOrders.map((wo) => (wo as any).equipmentId).filter(Boolean))] as string[];

  const [assignees, equipment] = await Promise.all([
    assigneeIds.length
      ? db.user.findMany({ where: { id: { in: assigneeIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
    equipmentIds.length
      ? db.equipment.findMany({ where: { id: { in: equipmentIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ]);

  const aMap = new Map((assignees as any[]).map((u) => [u.id, u.name]));
  const eMap = new Map((equipment as any[]).map((e) => [e.id, e.name]));

  return workOrders.map((wo: any) => ({
    id: wo.id,
    tenantId: wo.tenantId,
    complaintId: wo.complaintId,
    equipmentId: wo.equipmentId,
    equipmentName: eMap.get(wo.equipmentId) || null,
    title: wo.title,
    description: wo.description,
    status: wo.status,
    priority: wo.priority,
    type: wo.type,
    assignedToId: wo.assignedToId,
    assignedToName: aMap.get(wo.assignedToId) || null,
    scheduledDate: wo.scheduledDate?.toISOString?.() ?? wo.scheduledDate ?? null,
    completedAt: wo.completedAt?.toISOString?.() ?? wo.completedAt ?? null,
    totalCost: wo.totalCost,
    createdAt: wo.createdAt?.toISOString?.() ?? wo.createdAt ?? null,
    updatedAt: wo.updatedAt?.toISOString?.() ?? wo.updatedAt ?? null,
  }));
}

async function enrichPmSchedules(pmList: Record<string, unknown>[]) {
  if (!pmList.length) return [];
  const equipmentIds = [...new Set(pmList.map((pm) => (pm as any).equipmentId).filter(Boolean))] as string[];
  const assigneeIds = [...new Set(pmList.map((pm) => (pm as any).assignedToId).filter(Boolean))] as string[];

  const [equipment, assignees] = await Promise.all([
    equipmentIds.length
      ? db.equipment.findMany({ where: { id: { in: equipmentIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
    assigneeIds.length
      ? db.user.findMany({ where: { id: { in: assigneeIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ]);

  const eMap = new Map((equipment as any[]).map((e) => [e.id, e.name]));
  const aMap = new Map((assignees as any[]).map((u) => [u.id, u.name]));

  return pmList.map((pm: any) => ({
    id: pm.id,
    tenantId: pm.tenantId,
    equipmentId: pm.equipmentId,
    equipmentName: eMap.get(pm.equipmentId) || null,
    title: pm.title,
    description: pm.description,
    frequency: pm.frequency,
    lastExecuted: pm.lastExecuted?.toISOString?.() ?? pm.lastExecuted ?? null,
    nextDueDate: pm.nextDueDate?.toISOString?.() ?? pm.nextDueDate ?? null,
    assignedToId: pm.assignedToId,
    assignedToName: aMap.get(pm.assignedToId) || null,
    status: pm.status,
    createdAt: pm.createdAt?.toISOString?.() ?? null,
    updatedAt: pm.updatedAt?.toISOString?.() ?? null,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET / — Full combined dashboard
// ═══════════════════════════════════════════════════════════════════════════════

router.route('/').get(requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.user!.userId as string;
    const role = (req.user!.role as string).toLowerCase();

    console.log(`[Dashboard/${role}] ${req.method} /api/dashboard${req.path} userId=${userId}`);

    const scope = await buildDashboardScope(tenantId, userId, role);

    // ── Parallel data fetch ───────────────────────────────────────────
    const [
      complaintStatusGroups,
      woStatusGroups,
      totalEquipment,
      activeEquipment,
      paidRevenue,
      pendingInvoiceCount,
      overdueInvoiceCount,
      totalCustomers,
      totalEmployees,
      lowStockRaw,
      pmAll,
      monthlyRevenueInvoices,
      complaintsByCategoryRaw,
      recentComplaintsRaw,
      recentWorkOrdersRaw,
      upcomingPmRaw,
    ] = await Promise.all([
      // Complaint status distribution
      scope.canSeeComplaints
        ? db.complaint.groupBy({ by: ['status'], where: scope.complaintWhere, _count: { id: true } })
        : Promise.resolve([]),

      // Work-order status distribution (may be dual-query for supervisor)
      woGroupBy(scope, ['status']),

      // Equipment
      scope.canSeeEquipment
        ? db.equipment.count({ where: scope.equipmentWhere })
        : Promise.resolve(0),

      scope.canSeeEquipment
        ? db.equipment.count({ where: { ...scope.equipmentWhere, status: 'active' } })
        : Promise.resolve(0),

      // Revenue
      scope.canSeeRevenue
        ? db.invoice.aggregate({ where: { ...scope.invoiceWhere, status: 'PAID' }, _sum: { total: true } })
        : Promise.resolve({ _sum: { total: 0 } }),

      scope.canSeeRevenue
        ? db.invoice.count({ where: { ...scope.invoiceWhere, status: 'PENDING' } })
        : Promise.resolve(0),

      scope.canSeeRevenue
        ? db.invoice.count({ where: { ...scope.invoiceWhere, status: 'OVERDUE' } })
        : Promise.resolve(0),

      // Customers
      scope.canSeeCustomers
        ? (scope.customerCountOverride != null
            ? Promise.resolve(scope.customerCountOverride)
            : db.customer.count({ where: { tenantId, isActive: true } }))
        : Promise.resolve(0),

      // Employees
      scope.canSeeEmployees
        ? db.user.count({ where: { tenantId, isActive: true } })
        : Promise.resolve(0),

      // Inventory
      scope.canSeeInventory
        ? db.inventoryItem.findMany({
            where: { tenantId, isActive: true },
            select: { id: true, quantity: true, minStock: true },
          })
        : Promise.resolve([]),

      // PM
      scope.canSeePm
        ? db.pmSchedule.findMany({ where: scope.pmWhere })
        : Promise.resolve([]),

      // Monthly revenue (last 6 months)
      scope.canSeeRevenue
        ? db.invoice.findMany({
            where: { ...scope.invoiceWhere, status: 'PAID', paidAt: { not: null } },
            select: { total: true, paidAt: true },
          })
        : Promise.resolve([]),

      // Complaint category distribution
      scope.canSeeComplaints
        ? db.complaint.groupBy({
            by: ['category'],
            where: { ...scope.complaintWhere, category: { not: null } },
            _count: { id: true },
          })
        : Promise.resolve([]),

      // Recent complaints
      scope.canSeeComplaints
        ? db.complaint.findMany({
            where: scope.complaintWhere,
            take: 5,
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),

      // Recent work orders
      woFindMany(scope, {
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),

      // Upcoming PM
      scope.canSeePm
        ? db.pmSchedule.findMany({
            where: { ...scope.pmWhere, status: 'active', nextDueDate: { gte: new Date() } },
            take: 5,
            orderBy: { nextDueDate: 'asc' },
          })
        : Promise.resolve([]),
    ]);

    // ── Process results ───────────────────────────────────────────────
    const cStatusMap = toStatusMap(complaintStatusGroups as Record<string, unknown>[]);
    const openComplaints = cStatusMap['OPEN'] ?? cStatusMap['NEW'] ?? 0;
    const inProgressComplaints = cStatusMap['IN_PROGRESS'] ?? 0;

    const woMap = toStatusMap(woStatusGroups as Record<string, unknown>[]);
    const totalWorkOrders = Object.values(woMap).reduce((s, v) => s + v, 0);
    const pendingWorkOrders = woMap['PENDING'] ?? 0;
    const completedWorkOrders = woMap['COMPLETED'] ?? 0;

    const pmCompliance = calcPmCompliance(pmAll as Record<string, unknown>[]);
    const monthlyRevenue = buildMonthlyRevenue(monthlyRevenueInvoices as Record<string, unknown>[]);
    const complaintsByCategory = (complaintsByCategoryRaw as Record<string, unknown>[]).map((c: any) => ({
      category: c.category || 'Unknown',
      count: c._count.id,
    }));
    const complaintsByStatus = (complaintStatusGroups as Record<string, unknown>[]).map((c: any) => ({
      status: c.status,
      count: c._count.id,
    }));

    // Enrich with names
    const [formattedComplaints, formattedWorkOrders, formattedPm] = await Promise.all([
      enrichComplaints(recentComplaintsRaw as Record<string, unknown>[]),
      enrichWorkOrders(recentWorkOrdersRaw as Record<string, unknown>[]),
      enrichPmSchedules(upcomingPmRaw as Record<string, unknown>[]),
    ]);

    const lowStockItems = scope.canSeeInventory
      ? (lowStockRaw as any[]).filter((i: any) => i.quantity <= i.minStock).length
      : 0;

    res.json({
      totalEquipment: totalEquipment as number,
      activeEquipment: activeEquipment as number,
      openComplaints,
      inProgressComplaints,
      totalWorkOrders,
      pendingWorkOrders,
      completedWorkOrders,
      totalRevenue: ((paidRevenue as any)?._sum?.total) || 0,
      pendingInvoices: pendingInvoiceCount as number,
      overdueInvoices: overdueInvoiceCount as number,
      pmCompliance,
      totalCustomers: totalCustomers as number,
      totalEmployees: totalEmployees as number,
      lowStockItems,
      monthlyRevenue,
      complaintsByCategory,
      complaintsByStatus,
      recentComplaints: formattedComplaints,
      recentWorkOrders: formattedWorkOrders,
      upcomingPm: formattedPm,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /kpi — Fast KPI numbers
// ═══════════════════════════════════════════════════════════════════════════════

router.route('/kpi').get(requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.user!.userId as string;
    const role = (req.user!.role as string).toLowerCase();

    console.log(`[Dashboard/${role}] ${req.method} /api/dashboard${req.path} userId=${userId}`);

    const scope = await buildDashboardScope(tenantId, userId, role);

    const [
      complaintStatusGroups,
      woStatusGroups,
      paidRevenue,
      pendingInvoiceCount,
      overdueInvoiceCount,
      totalCustomers,
      totalEmployees,
      totalEquipment,
      activeEquipment,
      lowStockRaw,
      pmAll,
    ] = await Promise.all([
      scope.canSeeComplaints
        ? db.complaint.groupBy({ by: ['status'], where: scope.complaintWhere, _count: { id: true } })
        : Promise.resolve([]),

      woGroupBy(scope, ['status']),

      scope.canSeeRevenue
        ? db.invoice.aggregate({ where: { ...scope.invoiceWhere, status: 'PAID' }, _sum: { total: true } })
        : Promise.resolve({ _sum: { total: 0 } }),

      scope.canSeeRevenue
        ? db.invoice.count({ where: { ...scope.invoiceWhere, status: 'PENDING' } })
        : Promise.resolve(0),

      scope.canSeeRevenue
        ? db.invoice.count({ where: { ...scope.invoiceWhere, status: 'OVERDUE' } })
        : Promise.resolve(0),

      scope.canSeeCustomers
        ? (scope.customerCountOverride != null
            ? Promise.resolve(scope.customerCountOverride)
            : db.customer.count({ where: { tenantId, isActive: true } }))
        : Promise.resolve(0),

      scope.canSeeEmployees
        ? db.user.count({ where: { tenantId, isActive: true } })
        : Promise.resolve(0),

      scope.canSeeEquipment
        ? db.equipment.count({ where: scope.equipmentWhere })
        : Promise.resolve(0),

      scope.canSeeEquipment
        ? db.equipment.count({ where: { ...scope.equipmentWhere, status: 'active' } })
        : Promise.resolve(0),

      scope.canSeeInventory
        ? db.inventoryItem.findMany({
            where: { tenantId, isActive: true },
            select: { quantity: true, minStock: true },
          })
        : Promise.resolve([]),

      scope.canSeePm
        ? db.pmSchedule.findMany({ where: scope.pmWhere, select: { status: true } })
        : Promise.resolve([]),
    ]);

    // ── Process ───────────────────────────────────────────────────────
    const cStatusMap = toStatusMap(complaintStatusGroups as Record<string, unknown>[]);
    const openComplaints = cStatusMap['OPEN'] ?? cStatusMap['NEW'] ?? 0;
    const inProgressComplaints = cStatusMap['IN_PROGRESS'] ?? cStatusMap['ACCEPTED'] ?? 0;

    const woMap = toStatusMap(woStatusGroups as Record<string, unknown>[]);
    const totalWorkOrders = Object.values(woMap).reduce((s, v) => s + v, 0);
    const pendingWorkOrders = woMap['PENDING'] ?? 0;
    const completedWorkOrders = woMap['COMPLETED'] ?? 0;

    const lowStockItems = scope.canSeeInventory
      ? (lowStockRaw as any[]).filter((i: any) => i.quantity <= i.minStock).length
      : 0;

    const pmCompliance = calcPmCompliance(pmAll as Record<string, unknown>[]);

    res.json({
      totalEquipment: totalEquipment as number,
      activeEquipment: activeEquipment as number,
      openComplaints,
      inProgressComplaints,
      totalWorkOrders,
      pendingWorkOrders,
      completedWorkOrders,
      totalRevenue: ((paidRevenue as any)?._sum?.total) || 0,
      pendingInvoices: pendingInvoiceCount as number,
      overdueInvoices: overdueInvoiceCount as number,
      pmCompliance,
      totalCustomers: totalCustomers as number,
      totalEmployees: totalEmployees as number,
      lowStockItems,
      accessLevel: role,
    });
  } catch (error) {
    console.error('Dashboard KPI error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /charts — Chart data
// ═══════════════════════════════════════════════════════════════════════════════

router.route('/charts').get(requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.user!.userId as string;
    const role = (req.user!.role as string).toLowerCase();

    console.log(`[Dashboard/${role}] ${req.method} /api/dashboard${req.path} userId=${userId}`);

    const scope = await buildDashboardScope(tenantId, userId, role);

    const [
      complaintsByCategoryRaw,
      complaintsByStatusRaw,
      monthlyRevenueInvoices,
      pmAll,
    ] = await Promise.all([
      scope.canSeeComplaints
        ? db.complaint.groupBy({
            by: ['category'],
            where: { ...scope.complaintWhere, category: { not: null } },
            _count: { id: true },
          })
        : Promise.resolve([]),

      scope.canSeeComplaints
        ? db.complaint.groupBy({
            by: ['status'],
            where: scope.complaintWhere,
            _count: { id: true },
          })
        : Promise.resolve([]),

      scope.canSeeRevenue
        ? db.invoice.findMany({
            where: { ...scope.invoiceWhere, status: 'PAID', paidAt: { not: null } },
            select: { total: true, paidAt: true },
          })
        : Promise.resolve([]),

      scope.canSeePm
        ? db.pmSchedule.findMany({ where: scope.pmWhere, select: { status: true } })
        : Promise.resolve([]),
    ]);

    // ── Process ───────────────────────────────────────────────────────
    const monthlyRevenue = buildMonthlyRevenue(monthlyRevenueInvoices as Record<string, unknown>[]);

    const complaintsByCategory = (complaintsByCategoryRaw as Record<string, unknown>[]).map((c: any) => ({
      category: c.category || 'Unknown',
      count: c._count.id,
    }));

    const complaintsByStatus = (complaintsByStatusRaw as Record<string, unknown>[]).map((c: any) => ({
      status: c.status,
      count: c._count.id,
    }));

    const pmCompliance = calcPmCompliance(pmAll as Record<string, unknown>[]);

    const upcomingPmCounts = {
      completed: (pmAll as any[]).filter((pm: any) => pm.status === 'completed').length,
      overdue: (pmAll as any[]).filter((pm: any) => pm.status === 'overdue').length,
      scheduled: (pmAll as any[]).filter(
        (pm: any) => pm.status === 'scheduled' || pm.status === 'active',
      ).length,
    };

    res.json({
      monthlyRevenue,
      complaintsByCategory,
      complaintsByStatus,
      pmCompliance,
      upcomingPmCounts,
    });
  } catch (error) {
    console.error('Dashboard charts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /recent — Recent activity
// ═══════════════════════════════════════════════════════════════════════════════

router.route('/recent').get(requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.user!.userId as string;
    const role = (req.user!.role as string).toLowerCase();

    console.log(`[Dashboard/${role}] ${req.method} /api/dashboard${req.path} userId=${userId}`);

    const scope = await buildDashboardScope(tenantId, userId, role);

    const [recentComplaintsRaw, recentWorkOrdersRaw, upcomingPmRaw] = await Promise.all([
      scope.canSeeComplaints
        ? db.complaint.findMany({
            where: scope.complaintWhere,
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true, tenantId: true, customerId: true, equipmentId: true,
              title: true, description: true, priority: true, status: true,
              category: true, assignedToId: true, supervisorId: true,
              createdAt: true, updatedAt: true, resolvedAt: true, closedAt: true,
            },
          })
        : Promise.resolve([]),

      woFindMany(scope, {
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, tenantId: true, complaintId: true, equipmentId: true,
          title: true, description: true, status: true, priority: true,
          type: true, assignedToId: true, scheduledDate: true,
          completedAt: true, totalCost: true, createdAt: true, updatedAt: true,
        },
      }),

      scope.canSeePm
        ? db.pmSchedule.findMany({
            where: { ...scope.pmWhere, status: 'active', nextDueDate: { gte: new Date() } },
            take: 6,
            orderBy: { nextDueDate: 'asc' },
            select: {
              id: true, tenantId: true, equipmentId: true, title: true,
              description: true, frequency: true, lastExecuted: true,
              nextDueDate: true, assignedToId: true, status: true,
              createdAt: true, updatedAt: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const [formattedComplaints, formattedWorkOrders, formattedPm] = await Promise.all([
      enrichComplaints(recentComplaintsRaw as Record<string, unknown>[]),
      enrichWorkOrders(recentWorkOrdersRaw as Record<string, unknown>[]),
      enrichPmSchedules(upcomingPmRaw as Record<string, unknown>[]),
    ]);

    res.json({
      recentComplaints: formattedComplaints,
      recentWorkOrders: formattedWorkOrders,
      upcomingPm: formattedPm,
    });
  } catch (error) {
    console.error('Dashboard recent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;