import { Router, Request, Response } from 'express';
import { db } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ─── GET / — Main dashboard ────────────────────────────────────────────────
router.route('/').get(requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const role = (req.user!.role as string).toLowerCase();

    // Build RBAC-aware WHERE clauses
    const complaintWhere: Record<string, unknown> = { tenantId };
    let workOrderWhere: Record<string, unknown> = { tenantId };

    if (role === 'technician') {
      complaintWhere.assignedToId = req.user!.userId;
      workOrderWhere.assignedToId = req.user!.userId;
    } else if (role === 'customer') {
      // Find linked customer
      const user = await db.user.findUnique({
        where: { id: req.user!.userId as string },
        select: { id: true, email: true, phone: true },
      });
      if (user) {
        const linkedCustomer = await db.customer.findFirst({
          where: {
            tenantId,
            OR: [
              ...(user.email ? [{ email: user.email }] : []),
              ...(user.phone ? [{ phone: user.phone }] : []),
            ],
          },
          select: { id: true },
        });
        if (linkedCustomer) {
          (complaintWhere as any).customerId = linkedCustomer.id;
        }
      }
      workOrderWhere = { tenantId, id: '__NEVER_MATCH__' };
    }

    const isFinance = ['super_admin', 'admin', 'manager', 'finance'].includes(role);
    const isInventory = ['super_admin', 'admin', 'manager'].includes(role);
    const isPm = ['super_admin', 'admin', 'manager', 'supervisor'].includes(role);

    const [
      totalEquipment, activeEquipment, complaintStatusCounts,
      workOrderStatusCounts, paidInvoiceRevenue, pendingInvoicesCount,
      overdueInvoicesCount, totalCustomers, totalEmployees, lowStockItemsRaw,
      pmAll, monthlyRevenueRaw, complaintsByCategoryRaw, recentComplaints,
      recentWorkOrders, upcomingPm,
    ] = await Promise.all([
      db.equipment.count({ where: { tenantId } }),
      db.equipment.count({ where: { tenantId, status: 'active' } }),
      db.complaint.groupBy({ by: ['status'], where: complaintWhere, _count: { id: true } }),
      db.workOrder.groupBy({ by: ['status'], where: workOrderWhere, _count: { id: true } }),
      isFinance
        ? db.invoice.aggregate({ where: { tenantId, status: 'PAID' }, _sum: { total: true } })
        : Promise.resolve({ _sum: { total: 0 } }),
      isFinance
        ? db.invoice.count({ where: { tenantId, status: 'PENDING' } })
        : Promise.resolve(0),
      isFinance
        ? db.invoice.count({ where: { tenantId, status: 'OVERDUE' } })
        : Promise.resolve(0),
      role === 'customer'
        ? Promise.resolve(1)
        : db.customer.count({ where: { tenantId, isActive: true } }),
      role === 'customer'
        ? Promise.resolve(0)
        : db.user.count({ where: { tenantId, isActive: true } }),
      isInventory
        ? db.inventoryItem.findMany({ where: { tenantId, isActive: true }, select: { id: true, quantity: true, minStock: true } })
        : Promise.resolve([]),
      isPm
        ? db.pmSchedule.findMany({ where: { tenantId } })
        : Promise.resolve([]),
      isFinance
        ? db.invoice.findMany({ where: { tenantId, status: 'PAID', paidAt: { not: null } }, select: { total: true, paidAt: true } })
        : Promise.resolve([]),
      db.complaint.groupBy({ by: ['category'], where: { ...complaintWhere, category: { not: null } }, _count: { id: true } }),
      db.complaint.findMany({
        where: complaintWhere,
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      db.workOrder.findMany({
        where: workOrderWhere,
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      isPm
        ? db.pmSchedule.findMany({
            where: { tenantId, status: 'active', nextDueDate: { gte: new Date() } },
            take: 5,
            orderBy: { nextDueDate: 'asc' },
          })
        : Promise.resolve([]),
    ]);

    // Process complaint status counts
    const statusMap: Record<string, number> = {};
    (complaintStatusCounts as any[]).forEach((c: any) => { statusMap[c.status] = c._count.id; });
    const openComplaints = statusMap['OPEN'] || statusMap['NEW'] || 0;
    const inProgressComplaints = statusMap['IN_PROGRESS'] || 0;

    // Process work order status counts
    const woStatusMap: Record<string, number> = {};
    (workOrderStatusCounts as any[]).forEach((c: any) => { woStatusMap[c.status] = c._count.id; });
    const totalWorkOrders = (workOrderStatusCounts as any[]).reduce((sum: number, c: any) => sum + c._count.id, 0);
    const pendingWorkOrders = woStatusMap['PENDING'] || 0;
    const completedWorkOrders = woStatusMap['COMPLETED'] || 0;

    // PM compliance
    const pmTotal = (pmAll as any[]).length;
    const pmCompleted = (pmAll as any[]).filter((pm: any) => pm.status === 'completed').length;
    const pmCompliance = pmTotal > 0 ? Math.round((pmCompleted / pmTotal) * 100) : 0;

    // Monthly revenue for last 6 months
    const now = new Date();
    const monthlyRevenue: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const monthName = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const rev = (monthlyRevenueRaw as any[])
        .filter((inv: any) => {
          const paid = new Date(inv.paidAt!);
          return paid >= d && paid <= end;
        })
        .reduce((sum: number, inv: any) => sum + inv.total, 0);
      monthlyRevenue.push({ month: monthName, revenue: Math.round(rev * 100) / 100 });
    }

    // Format recent complaints — fetch related names separately
    const complaintIds = (recentComplaints as any[]).map((c: any) => c.id);
    const [customers, assignees, supervisors, eqList] = await Promise.all([
      complaintIds.length > 0
        ? db.customer.findMany({ where: { id: { in: (recentComplaints as any[]).map((c: any) => c.customerId).filter(Boolean) } }, select: { id: true, name: true } })
        : Promise.resolve([]),
      db.user.findMany({ where: { id: { in: (recentComplaints as any[]).map((c: any) => c.assignedToId).filter(Boolean) } }, select: { id: true, name: true } }),
      db.user.findMany({ where: { id: { in: (recentComplaints as any[]).map((c: any) => c.supervisorId).filter(Boolean) } }, select: { id: true, name: true } }),
      db.equipment.findMany({ where: { id: { in: (recentComplaints as any[]).map((c: any) => c.equipmentId).filter(Boolean) } }, select: { id: true, name: true } }),
    ]);
    const custMap = new Map((customers as any[]).map((c: any) => [c.id, c.name]));
    const assignMap = new Map((assignees as any[]).map((u: any) => [u.id, u.name]));
    const supMap = new Map((supervisors as any[]).map((u: any) => [u.id, u.name]));
    const eqMap = new Map((eqList as any[]).map((e: any) => [e.id, e.name]));

    const formattedComplaints = (recentComplaints as any[]).map((c: any) => ({
      id: c.id, tenantId: c.tenantId, customerId: c.customerId, customerName: custMap.get(c.customerId) || null,
      equipmentId: c.equipmentId, equipmentName: eqMap.get(c.equipmentId) || null,
      title: c.title, description: c.description, priority: c.priority, status: c.status, category: c.category,
      assignedToId: c.assignedToId, assignedToName: assignMap.get(c.assignedToId) || null,
      supervisorId: c.supervisorId, supervisorName: supMap.get(c.supervisorId) || null,
      resolvedAt: c.resolvedAt?.toISOString?.() || null, closedAt: c.closedAt?.toISOString?.() || null,
      createdAt: c.createdAt?.toISOString?.() || c.createdAt, updatedAt: c.updatedAt?.toISOString?.() || c.updatedAt,
    }));

    // Format work orders — fetch related names separately
    const woIds = (recentWorkOrders as any[]).map((wo: any) => wo.id);
    const [woAssignees, woEquip] = await Promise.all([
      db.user.findMany({ where: { id: { in: (recentWorkOrders as any[]).map((wo: any) => wo.assignedToId).filter(Boolean) } }, select: { id: true, name: true } }),
      db.equipment.findMany({ where: { id: { in: (recentWorkOrders as any[]).map((wo: any) => wo.equipmentId).filter(Boolean) } }, select: { id: true, name: true } }),
    ]);
    const woAssignMap = new Map((woAssignees as any[]).map((u: any) => [u.id, u.name]));
    const woEqMap = new Map((woEquip as any[]).map((e: any) => [e.id, e.name]));

    const formattedWorkOrders = (recentWorkOrders as any[]).map((wo: any) => ({
      id: wo.id, tenantId: wo.tenantId, complaintId: wo.complaintId,
      equipmentId: wo.equipmentId, equipmentName: woEqMap.get(wo.equipmentId) || null,
      title: wo.title, description: wo.description, status: wo.status, priority: wo.priority,
      type: wo.type, assignedToId: wo.assignedToId, assignedToName: woAssignMap.get(wo.assignedToId) || null,
      scheduledDate: wo.scheduledDate?.toISOString?.() || null, completedAt: wo.completedAt?.toISOString?.() || null,
      totalCost: wo.totalCost,
      createdAt: wo.createdAt?.toISOString?.() || wo.createdAt, updatedAt: wo.updatedAt?.toISOString?.() || wo.updatedAt,
    }));

    const formattedPm = (upcomingPm as any[]).map((pm: any) => ({
      id: pm.id, tenantId: pm.tenantId, equipmentId: pm.equipmentId, equipmentName: pm.equipment?.name,
      title: pm.title, description: pm.description, frequency: pm.frequency,
      lastExecuted: pm.lastExecuted?.toISOString?.() || null, nextDueDate: pm.nextDueDate?.toISOString?.() || null,
      assignedToId: pm.assignedToId, assignedToName: pm.assignedTo?.name, status: pm.status,
      createdAt: pm.createdAt?.toISOString?.() || null, updatedAt: pm.updatedAt?.toISOString?.() || null,
    }));

    const complaintsByCategory = (complaintsByCategoryRaw as any[]).map((c: any) => ({
      category: c.category || 'Unknown', count: c._count.id,
    }));

    const complaintsByStatus = (complaintStatusCounts as any[]).map((c: any) => ({
      status: c.status, count: c._count.id,
    }));

    res.json({
      totalEquipment: totalEquipment as number,
      activeEquipment: activeEquipment as number,
      openComplaints,
      inProgressComplaints,
      totalWorkOrders,
      pendingWorkOrders,
      completedWorkOrders,
      totalRevenue: ((paidInvoiceRevenue as any)?._sum?.total) || 0,
      pendingInvoices: pendingInvoicesCount as number,
      overdueInvoices: overdueInvoicesCount as number,
      pmCompliance,
      totalCustomers: totalCustomers as number,
      totalEmployees: totalEmployees as number,
      lowStockItems: (lowStockItemsRaw as any[]).filter((i: any) => i.quantity <= i.minStock).length,
      monthlyRevenue,
      complaintsByCategory,
      complaintsByStatus,
      recentComplaints: formattedComplaints,
      recentWorkOrders: formattedWorkOrders,
      upcomingPm: formattedPm,
    });
  } catch (error) {
    console.error('Dashboard DB error:', error);
    res.status(500).json({ error: 'Internal server error', debug: (error as any)?.message || String(error) });
  }
});

// ─── GET /kpi — Fast KPI endpoint ────────────────────────────────────────────
router.route('/kpi').get(requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const role = (req.user!.role as string).toLowerCase();

    const complaintWhere: Record<string, unknown> = { tenantId };
    let workOrderWhere: Record<string, unknown> = { tenantId };

    if (role === 'technician') {
      complaintWhere.assignedToId = req.user!.userId;
      workOrderWhere.assignedToId = req.user!.userId;
    } else if (role === 'customer') {
      const user = await db.user.findUnique({
        where: { id: req.user!.userId as string },
        select: { id: true, email: true, phone: true },
      });
      if (user) {
        const linkedCustomer = await db.customer.findFirst({
          where: {
            tenantId,
            OR: [
              ...(user.email ? [{ email: user.email }] : []),
              ...(user.phone ? [{ phone: user.phone }] : []),
            ],
          },
          select: { id: true },
        });
        if (linkedCustomer) {
          (complaintWhere as any).customerId = linkedCustomer.id;
        }
      }
      workOrderWhere = { tenantId, id: '__NEVER_MATCH__' };
    }

    const isFinance = ['super_admin', 'admin', 'manager', 'finance'].includes(role);
    const isInventory = ['super_admin', 'admin', 'manager'].includes(role);
    const isPm = ['super_admin', 'admin', 'manager', 'supervisor'].includes(role);

    const [
      complaintStatusCounts, workOrderStatusCounts, paidInvoiceRevenue,
      pendingInvoicesCount, overdueInvoicesCount, totalCustomers, totalEmployees,
      totalEquipment, activeEquipment, lowStockItemsRaw, pmAll,
    ] = await Promise.all([
      db.complaint.groupBy({ by: ['status'], where: complaintWhere, _count: { id: true } }),
      db.workOrder.groupBy({ by: ['status'], where: workOrderWhere, _count: { id: true } }),
      isFinance
        ? db.invoice.aggregate({ where: { tenantId, status: 'PAID' }, _sum: { total: true } })
        : Promise.resolve({ _sum: { total: 0 } }),
      isFinance ? db.invoice.count({ where: { tenantId, status: 'PENDING' } }) : Promise.resolve(0),
      isFinance ? db.invoice.count({ where: { tenantId, status: 'OVERDUE' } }) : Promise.resolve(0),
      role === 'customer' ? Promise.resolve(1) : db.customer.count({ where: { tenantId, isActive: true } }),
      role === 'customer' ? Promise.resolve(0) : db.user.count({ where: { tenantId, isActive: true } }),
      db.equipment.count({ where: { tenantId } }),
      db.equipment.count({ where: { tenantId, status: 'active' } }),
      isInventory
        ? db.inventoryItem.findMany({ where: { tenantId, isActive: true }, select: { quantity: true, minStock: true } })
        : Promise.resolve([]),
      isPm
        ? db.pmSchedule.findMany({ where: { tenantId }, select: { status: true } })
        : Promise.resolve([]),
    ]);

    const statusMap: Record<string, number> = {};
    (complaintStatusCounts as any[]).forEach((c: any) => { statusMap[c.status] = c._count.id; });
    const openComplaints = statusMap['OPEN'] || statusMap['NEW'] || 0;
    const inProgressComplaints = statusMap['IN_PROGRESS'] || statusMap['ACCEPTED'] || 0;

    const woStatusMap: Record<string, number> = {};
    (workOrderStatusCounts as any[]).forEach((c: any) => { woStatusMap[c.status] = c._count.id; });
    const totalWorkOrders = (workOrderStatusCounts as any[]).reduce((sum: number, c: any) => sum + c._count.id, 0);
    const pendingWorkOrders = woStatusMap['PENDING'] || 0;
    const completedWorkOrders = woStatusMap['COMPLETED'] || 0;

    const lowStockItems = (lowStockItemsRaw as any[]).filter((i: any) => i.quantity <= i.minStock).length;

    const pmTotal = (pmAll as any[]).length;
    const pmCompleted = (pmAll as any[]).filter((pm: any) => pm.status === 'completed').length;
    const pmCompliance = pmTotal > 0 ? Math.round((pmCompleted / pmTotal) * 100) : 0;

    res.json({
      totalEquipment: totalEquipment as number,
      activeEquipment: activeEquipment as number,
      openComplaints,
      inProgressComplaints,
      totalWorkOrders,
      pendingWorkOrders,
      completedWorkOrders,
      totalRevenue: ((paidInvoiceRevenue as any)?._sum?.total) || 0,
      pendingInvoices: pendingInvoicesCount as number,
      overdueInvoices: overdueInvoicesCount as number,
      pmCompliance,
      totalCustomers: totalCustomers as number,
      totalEmployees: totalEmployees as number,
      lowStockItems,
    });
  } catch (error) {
    console.error('Dashboard KPI error:', error);
    res.status(500).json({ error: 'Internal server error', debug: (error as any)?.message || String(error) });
  }
});

// ─── GET /charts — Chart data endpoint ──────────────────────────────────────
router.route('/charts').get(requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const role = (req.user!.role as string).toLowerCase();

    // Build RBAC-aware WHERE clause for complaints
    const complaintWhere: Record<string, unknown> = { tenantId };

    if (role === 'technician') {
      complaintWhere.assignedToId = req.user!.userId;
    } else if (role === 'customer') {
      const user = await db.user.findUnique({
        where: { id: req.user!.userId as string },
        select: { id: true, email: true, phone: true },
      });
      if (user) {
        const linkedCustomer = await db.customer.findFirst({
          where: {
            tenantId,
            OR: [
              ...(user.email ? [{ email: user.email }] : []),
              ...(user.phone ? [{ phone: user.phone }] : []),
            ],
          },
          select: { id: true },
        });
        if (linkedCustomer) {
          (complaintWhere as any).customerId = linkedCustomer.id;
        }
      }
    }

    const isFinance = ['super_admin', 'admin', 'manager', 'finance'].includes(role);
    const isPm = ['super_admin', 'admin', 'manager', 'supervisor'].includes(role);

    const [
      complaintsByCategoryRaw,
      complaintsByStatusRaw,
      monthlyRevenueRaw,
      pmAll,
    ] = await Promise.all([
      // Category distribution
      db.complaint.groupBy({
        by: ['category'],
        where: { ...complaintWhere, category: { not: null } },
        _count: { id: true },
      }),
      // Status distribution
      db.complaint.groupBy({
        by: ['status'],
        where: complaintWhere,
        _count: { id: true },
      }),
      // Monthly revenue (finance/admin only)
      isFinance
        ? db.invoice.findMany({
            where: { tenantId, status: 'PAID', paidAt: { not: null } },
            select: { total: true, paidAt: true },
          })
        : Promise.resolve([]),
      // PM compliance breakdown
      isPm
        ? db.pmSchedule.findMany({ where: { tenantId }, select: { status: true } })
        : Promise.resolve([]),
    ]);

    // Monthly revenue for last 6 months
    const now = new Date();
    const monthlyRevenue: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const monthName = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const rev = (monthlyRevenueRaw as any[])
        .filter((inv: any) => {
          const paid = new Date(inv.paidAt!);
          return paid >= d && paid <= end;
        })
        .reduce((sum: number, inv: any) => sum + inv.total, 0);
      monthlyRevenue.push({ month: monthName, revenue: Math.round(rev * 100) / 100 });
    }

    // PM compliance counts
    const upcomingPmCounts = {
      completed: (pmAll as any[]).filter((pm: any) => pm.status === 'completed').length,
      overdue: (pmAll as any[]).filter((pm: any) => pm.status === 'overdue').length,
      scheduled: (pmAll as any[]).filter((pm: any) => pm.status === 'scheduled' || pm.status === 'active').length,
    };
    const pmTotal = (pmAll as any[]).length;
    const pmCompleted = upcomingPmCounts.completed;
    const pmCompliance = pmTotal > 0 ? Math.round((pmCompleted / pmTotal) * 100) : 0;

    res.json({
      monthlyRevenue,
      complaintsByCategory: (complaintsByCategoryRaw as any[]).map((c: any) => ({
        category: c.category || 'Unknown',
        count: c._count.id,
      })),
      complaintsByStatus: (complaintsByStatusRaw as any[]).map((c: any) => ({
        status: c.status,
        count: c._count.id,
      })),
      pmCompliance,
      upcomingPmCounts,
    });
  } catch (error) {
    console.error('Dashboard charts error:', error);
    res.status(500).json({ error: 'Internal server error', debug: (error as any)?.message || String(error) });
  }
});

// ─── GET /recent — Recent activity ──────────────────────────────────────────
router.route('/recent').get(requireAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const role = (req.user!.role as string).toLowerCase();

    const complaintWhere: Record<string, unknown> = { tenantId };
    let workOrderWhere: Record<string, unknown> = { tenantId };

    if (role === 'technician') {
      complaintWhere.assignedToId = req.user!.userId;
      workOrderWhere.assignedToId = req.user!.userId;
    } else if (role === 'customer') {
      const user = await db.user.findUnique({
        where: { id: req.user!.userId as string },
        select: { id: true, email: true, phone: true },
      });
      if (user) {
        const linkedCustomer = await db.customer.findFirst({
          where: {
            tenantId,
            OR: [
              ...(user.email ? [{ email: user.email }] : []),
              ...(user.phone ? [{ phone: user.phone }] : []),
            ],
          },
          select: { id: true },
        });
        if (linkedCustomer) {
          (complaintWhere as any).customerId = linkedCustomer.id;
        }
      }
      workOrderWhere = { tenantId, id: '__NEVER_MATCH__' };
    }

    const isPm = ['super_admin', 'admin', 'manager', 'supervisor'].includes(role);

    const [recentComplaints, recentWorkOrders, upcomingPm] = await Promise.all([
      db.complaint.findMany({
        where: complaintWhere,
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, tenantId: true, customerId: true, equipmentId: true,
          title: true, description: true, priority: true, status: true,
          category: true, assignedToId: true, supervisorId: true,
          createdAt: true, updatedAt: true, resolvedAt: true, closedAt: true,
        },
      }),
      db.workOrder.findMany({
        where: workOrderWhere,
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, tenantId: true, complaintId: true, equipmentId: true,
          title: true, description: true, status: true, priority: true,
          type: true, assignedToId: true, scheduledDate: true,
          completedAt: true, totalCost: true, createdAt: true, updatedAt: true,
        },
      }),
      isPm
        ? db.pmSchedule.findMany({
            where: { tenantId, status: 'active', nextDueDate: { gte: new Date() } },
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

    // Fetch related names separately (Supabase REST doesn't support Prisma include)
    const complaintIds = (recentComplaints as any[]).map((c: any) => c.id);
    const [customers, assignees, supervisors, eqList, pmEquip, pmAssign] = await Promise.all([
      complaintIds.length > 0
        ? db.customer.findMany({ where: { id: { in: (recentComplaints as any[]).map((c: any) => c.customerId).filter(Boolean) } }, select: { id: true, name: true } })
        : Promise.resolve([]),
      db.user.findMany({ where: { id: { in: [
        ...(recentComplaints as any[]).map((c: any) => c.assignedToId).filter(Boolean),
        ...(recentWorkOrders as any[]).map((wo: any) => wo.assignedToId).filter(Boolean),
      ] } }, select: { id: true, name: true } }),
      db.user.findMany({ where: { id: { in: (recentComplaints as any[]).map((c: any) => c.supervisorId).filter(Boolean) } }, select: { id: true, name: true } }),
      db.equipment.findMany({ where: { id: { in: [
        ...(recentComplaints as any[]).map((c: any) => c.equipmentId).filter(Boolean),
        ...(recentWorkOrders as any[]).map((wo: any) => wo.equipmentId).filter(Boolean),
      ] } }, select: { id: true, name: true } }),
      (upcomingPm as any[]).length > 0
        ? db.equipment.findMany({ where: { id: { in: (upcomingPm as any[]).map((pm: any) => pm.equipmentId).filter(Boolean) } }, select: { id: true, name: true } })
        : Promise.resolve([]),
      (upcomingPm as any[]).length > 0
        ? db.user.findMany({ where: { id: { in: (upcomingPm as any[]).map((pm: any) => pm.assignedToId).filter(Boolean) } }, select: { id: true, name: true } })
        : Promise.resolve([]),
    ]);

    const custMap = new Map((customers as any[]).map((c: any) => [c.id, c.name]));
    const assignMap = new Map((assignees as any[]).map((u: any) => [u.id, u.name]));
    const supMap = new Map((supervisors as any[]).map((u: any) => [u.id, u.name]));
    const eqMap = new Map((eqList as any[]).map((e: any) => [e.id, e.name]));
    const pmEqMap = new Map((pmEquip as any[]).map((e: any) => [e.id, e.name]));
    const pmAssignMap = new Map((pmAssign as any[]).map((u: any) => [u.id, u.name]));

    res.json({
      recentComplaints: (recentComplaints as any[]).map((c: any) => ({
        id: c.id, tenantId: c.tenantId, customerId: c.customerId,
        customerName: custMap.get(c.customerId) || null,
        equipmentId: c.equipmentId, equipmentName: eqMap.get(c.equipmentId) || null,
        title: c.title, description: c.description, priority: c.priority,
        status: c.status, category: c.category,
        assignedToId: c.assignedToId, assignedToName: assignMap.get(c.assignedToId) || null,
        supervisorId: c.supervisorId, supervisorName: supMap.get(c.supervisorId) || null,
        resolvedAt: c.resolvedAt?.toISOString?.() || null,
        closedAt: c.closedAt?.toISOString?.() || null,
        createdAt: c.createdAt?.toISOString?.() || c.createdAt,
        updatedAt: c.updatedAt?.toISOString?.() || c.updatedAt,
      })),
      recentWorkOrders: (recentWorkOrders as any[]).map((wo: any) => ({
        id: wo.id, tenantId: wo.tenantId, complaintId: wo.complaintId,
        equipmentId: wo.equipmentId, equipmentName: eqMap.get(wo.equipmentId) || null,
        title: wo.title, description: wo.description, status: wo.status,
        priority: wo.priority, type: wo.type,
        assignedToId: wo.assignedToId, assignedToName: assignMap.get(wo.assignedToId) || null,
        scheduledDate: wo.scheduledDate?.toISOString?.() || null,
        completedAt: wo.completedAt?.toISOString?.() || null,
        totalCost: wo.totalCost,
        createdAt: wo.createdAt?.toISOString?.() || wo.createdAt,
        updatedAt: wo.updatedAt?.toISOString?.() || wo.updatedAt,
      })),
      upcomingPm: (upcomingPm as any[]).map((pm: any) => ({
        id: pm.id, tenantId: pm.tenantId, equipmentId: pm.equipmentId,
        equipmentName: pmEqMap.get(pm.equipmentId) || null,
        title: pm.title, description: pm.description, frequency: pm.frequency,
        lastExecuted: pm.lastExecuted?.toISOString?.() || null,
        nextDueDate: pm.nextDueDate?.toISOString?.() || null,
        assignedToId: pm.assignedToId, assignedToName: pmAssignMap.get(pm.assignedToId) || null,
        status: pm.status,
        createdAt: pm.createdAt?.toISOString?.() || null,
        updatedAt: pm.updatedAt?.toISOString?.() || null,
      })),
    });
  } catch (error) {
    console.error('Dashboard recent error:', error);
    res.status(500).json({ error: 'Internal server error', debug: (error as any)?.message || String(error) });
  }
});

export default router;