import { Router, Request, Response } from 'express';
import { db } from '@/lib/db.js';
import { requireAuth } from '@/middleware/auth.js';

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
        include: {
          customer: { select: { name: true } },
          assignedTo: { select: { name: true } },
          supervisor: { select: { name: true } },
          equipment: { select: { name: true } },
        },
      }),
      db.workOrder.findMany({
        where: workOrderWhere,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          assignedTo: { select: { name: true } },
          equipment: { select: { name: true } },
        },
      }),
      isPm
        ? db.pmSchedule.findMany({
            where: { tenantId, status: 'active', nextDueDate: { gte: new Date() } },
            take: 5,
            orderBy: { nextDueDate: 'asc' },
            include: {
              equipment: { select: { name: true } },
              assignedTo: { select: { name: true } },
            },
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

    // Format recent complaints
    const formattedComplaints = (recentComplaints as any[]).map((c: any) => ({
      id: c.id, tenantId: c.tenantId, customerId: c.customerId, customerName: c.customer?.name,
      equipmentId: c.equipmentId, equipmentName: c.equipment?.name,
      title: c.title, description: c.description, priority: c.priority, status: c.status, category: c.category,
      assignedToId: c.assignedToId, assignedToName: c.assignedTo?.name,
      supervisorId: c.supervisorId, supervisorName: c.supervisor?.name,
      resolvedAt: c.resolvedAt?.toISOString?.() || null, closedAt: c.closedAt?.toISOString?.() || null,
      createdAt: c.createdAt?.toISOString?.() || c.createdAt, updatedAt: c.updatedAt?.toISOString?.() || c.updatedAt,
    }));

    const formattedWorkOrders = (recentWorkOrders as any[]).map((wo: any) => ({
      id: wo.id, tenantId: wo.tenantId, complaintId: wo.complaintId,
      equipmentId: wo.equipmentId, equipmentName: wo.equipment?.name,
      title: wo.title, description: wo.description, status: wo.status, priority: wo.priority,
      type: wo.type, assignedToId: wo.assignedToId, assignedToName: wo.assignedTo?.name,
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
    res.status(500).json({ error: 'Internal server error' });
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
    res.status(500).json({ error: 'Internal server error' });
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
          customer: { select: { name: true } },
          assignedTo: { select: { name: true } },
          supervisor: { select: { name: true } },
          equipment: { select: { name: true } },
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
          assignedTo: { select: { name: true } },
          equipment: { select: { name: true } },
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
              equipment: { select: { name: true } },
              assignedTo: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    res.json({
      recentComplaints: (recentComplaints as any[]).map((c: any) => ({
        id: c.id, tenantId: c.tenantId, customerId: c.customerId,
        customerName: c.customer?.name || null,
        equipmentId: c.equipmentId, equipmentName: c.equipment?.name || null,
        title: c.title, description: c.description, priority: c.priority,
        status: c.status, category: c.category,
        assignedToId: c.assignedToId, assignedToName: c.assignedTo?.name || null,
        supervisorId: c.supervisorId, supervisorName: c.supervisor?.name || null,
        resolvedAt: c.resolvedAt?.toISOString?.() || null,
        closedAt: c.closedAt?.toISOString?.() || null,
        createdAt: c.createdAt?.toISOString?.() || c.createdAt,
        updatedAt: c.updatedAt?.toISOString?.() || c.updatedAt,
      })),
      recentWorkOrders: (recentWorkOrders as any[]).map((wo: any) => ({
        id: wo.id, tenantId: wo.tenantId, complaintId: wo.complaintId,
        equipmentId: wo.equipmentId, equipmentName: wo.equipment?.name || null,
        title: wo.title, description: wo.description, status: wo.status,
        priority: wo.priority, type: wo.type,
        assignedToId: wo.assignedToId, assignedToName: wo.assignedTo?.name || null,
        scheduledDate: wo.scheduledDate?.toISOString?.() || null,
        completedAt: wo.completedAt?.toISOString?.() || null,
        totalCost: wo.totalCost,
        createdAt: wo.createdAt?.toISOString?.() || wo.createdAt,
        updatedAt: wo.updatedAt?.toISOString?.() || wo.updatedAt,
      })),
      upcomingPm: (upcomingPm as any[]).map((pm: any) => ({
        id: pm.id, tenantId: pm.tenantId, equipmentId: pm.equipmentId,
        equipmentName: pm.equipment?.name || null,
        title: pm.title, description: pm.description, frequency: pm.frequency,
        lastExecuted: pm.lastExecuted?.toISOString?.() || null,
        nextDueDate: pm.nextDueDate?.toISOString?.() || null,
        assignedToId: pm.assignedToId, assignedToName: pm.assignedTo?.name || null,
        status: pm.status,
        createdAt: pm.createdAt?.toISOString?.() || null,
        updatedAt: pm.updatedAt?.toISOString?.() || null,
      })),
    });
  } catch (error) {
    console.error('Dashboard recent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;