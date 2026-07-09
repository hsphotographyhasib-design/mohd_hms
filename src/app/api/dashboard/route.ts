import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request: NextRequest) {
  // ── Production: proxy to Render backend ────────────────────────────────
  if (BACKEND_URL) {
    try {
      const authHeader = request.headers.get('authorization') || '';
      const res = await fetch(`${BACKEND_URL}/api/dashboard`, {
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } catch (error) {
      console.error('Dashboard proxy error:', error);
      return NextResponse.json({ error: 'Backend service unavailable' }, { status: 502 });
    }
  }

  // ── Local dev: use Prisma/SQLite ───────────────────────────────────────
  try {
    const { db, getDbFriendlyMessage, getErrorHeaders } = await import('@/core/database/db');
    const { verifyToken } = await import('@/core/auth/auth-lib');
    const { buildAuthContext, buildComplaintWhereClause } = await import('@/core/permissions/rbac');
    const { ensureAllTablesSynced } = await import('@/core/database/db-sync');

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const role = (payload.role as string).toLowerCase();

    const ctx = await buildAuthContext(payload, { resolveCustomer: true });
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureAllTablesSynced();
    const { where: complaintRbacWhere } = await buildComplaintWhereClause(ctx);

    let workOrderWhere: Record<string, unknown> = { tenantId };
    if (role === 'technician') {
      workOrderWhere = { tenantId, assignedToId: ctx.userId };
    } else if (role === 'customer') {
      workOrderWhere = { tenantId, id: '__NEVER_MATCH__' };
    }

    const [
      totalEquipment, activeEquipment, complaintStatusCounts,
      workOrderStatusCounts, paidInvoiceRevenue, pendingInvoicesCount,
      overdueInvoicesCount, totalCustomers, totalEmployees, lowStockItemsRaw,
      pmAll, monthlyRevenueRaw, complaintsByCategoryRaw, recentComplaints,
      recentWorkOrders, upcomingPm,
    ] = await Promise.all([
      db.equipment.count({ where: { tenantId } }),
      db.equipment.count({ where: { tenantId, status: 'active' } }),
      db.complaint.groupBy({ by: ['status'], where: complaintRbacWhere, _count: { id: true } }),
      db.workOrder.groupBy({ by: ['status'], where: workOrderWhere, _count: { id: true } }),
      (['super_admin', 'admin', 'manager', 'finance'].includes(role))
        ? db.invoice.aggregate({ where: { tenantId, status: 'PAID' }, _sum: { total: true } })
        : Promise.resolve({ _sum: { total: 0 } }),
      (['super_admin', 'admin', 'manager', 'finance'].includes(role))
        ? db.invoice.count({ where: { tenantId, status: 'PENDING' } })
        : Promise.resolve(0),
      (['super_admin', 'admin', 'manager', 'finance'].includes(role))
        ? db.invoice.count({ where: { tenantId, status: 'OVERDUE' } })
        : Promise.resolve(0),
      (role === 'customer') ? Promise.resolve(1) : db.customer.count({ where: { tenantId, isActive: true } }),
      (role === 'customer') ? Promise.resolve(0) : db.user.count({ where: { tenantId, isActive: true } }),
      (['super_admin', 'admin', 'manager'].includes(role))
        ? db.inventoryItem.findMany({ where: { tenantId, isActive: true }, select: { id: true, quantity: true, minStock: true } })
        : Promise.resolve([]),
      (['super_admin', 'admin', 'manager', 'supervisor'].includes(role))
        ? db.pmSchedule.findMany({ where: { tenantId } })
        : Promise.resolve([]),
      (['super_admin', 'admin', 'manager', 'finance'].includes(role))
        ? db.invoice.findMany({ where: { tenantId, status: 'PAID', paidAt: { not: null } }, select: { total: true, paidAt: true } })
        : Promise.resolve([]),
      db.complaint.groupBy({ by: ['category'], where: { ...complaintRbacWhere, category: { not: null } }, _count: { id: true } }),
      db.complaint.findMany({
        where: complaintRbacWhere,
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
      (['super_admin', 'admin', 'manager', 'supervisor'].includes(role))
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

    const statusMap: Record<string, number> = {};
    complaintStatusCounts.forEach((c: any) => { statusMap[c.status] = c._count.id; });
    const openComplaints = statusMap['OPEN'] || statusMap['NEW'] || 0;
    const inProgressComplaints = statusMap['IN_PROGRESS'] || 0;

    const woStatusMap: Record<string, number> = {};
    workOrderStatusCounts.forEach((c: any) => { woStatusMap[c.status] = c._count.id; });
    const totalWorkOrders = workOrderStatusCounts.reduce((sum, c) => sum + c._count.id, 0);
    const pendingWorkOrders = woStatusMap['PENDING'] || 0;
    const completedWorkOrders = woStatusMap['COMPLETED'] || 0;

    const pmTotal = pmAll.length;
    const pmCompleted = pmAll.filter((pm: any) => pm.status === 'completed').length;
    const pmCompliance = pmTotal > 0 ? Math.round((pmCompleted / pmTotal) * 100) : 0;

    const now = new Date();
    const monthlyRevenue: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const monthName = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const rev = monthlyRevenueRaw
        .filter((inv: any) => {
          const paid = new Date(inv.paidAt!);
          return paid >= d && paid <= end;
        })
        .reduce((sum, inv: any) => sum + inv.total, 0);
      monthlyRevenue.push({ month: monthName, revenue: Math.round(rev * 100) / 100 });
    }

    const formattedComplaints = recentComplaints.map((c: any) => ({
      id: c.id, tenantId: c.tenantId, customerId: c.customerId, customerName: c.customer?.name,
      equipmentId: c.equipmentId, equipmentName: c.equipment?.name,
      title: c.title, description: c.description, priority: c.priority, status: c.status, category: c.category,
      assignedToId: c.assignedToId, assignedToName: c.assignedTo?.name,
      supervisorId: c.supervisorId, supervisorName: c.supervisor?.name,
      resolvedAt: c.resolvedAt?.toISOString() || null, closedAt: c.closedAt?.toISOString() || null,
      createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(),
    }));

    const formattedWorkOrders = recentWorkOrders.map((wo: any) => ({
      id: wo.id, tenantId: wo.tenantId, complaintId: wo.complaintId,
      equipmentId: wo.equipmentId, equipmentName: wo.equipment?.name,
      title: wo.title, description: wo.description, status: wo.status, priority: wo.priority,
      type: wo.type, assignedToId: wo.assignedToId, assignedToName: wo.assignedTo?.name,
      scheduledDate: wo.scheduledDate?.toISOString() || null, completedAt: wo.completedAt?.toISOString() || null,
      totalCost: wo.totalCost,
      createdAt: wo.createdAt.toISOString(), updatedAt: wo.updatedAt.toISOString(),
    }));

    const formattedPm = (upcomingPm as any[]).map((pm: any) => ({
      id: pm.id, tenantId: pm.tenantId, equipmentId: pm.equipmentId, equipmentName: pm.equipment?.name,
      title: pm.title, description: pm.description, frequency: pm.frequency,
      lastExecuted: pm.lastExecuted?.toISOString() || null, nextDueDate: pm.nextDueDate?.toISOString() || null,
      assignedToId: pm.assignedToId, assignedToName: pm.assignedTo?.name, status: pm.status,
      createdAt: pm.createdAt?.toISOString() || null, updatedAt: pm.updatedAt?.toISOString() || null,
    }));

    const complaintsByCategory = complaintsByCategoryRaw.map((c: any) => ({
      category: c.category || 'Unknown', count: c._count.id,
    }));

    const complaintsByStatus = complaintStatusCounts.map((c: any) => ({
      status: c.status, count: c._count.id,
    }));

    return NextResponse.json({
      totalEquipment, activeEquipment, openComplaints, inProgressComplaints,
      totalWorkOrders, pendingWorkOrders, completedWorkOrders,
      totalRevenue: paidInvoiceRevenue._sum.total || 0,
      pendingInvoices: pendingInvoicesCount, overdueInvoices: overdueInvoicesCount,
      pmCompliance, totalCustomers, totalEmployees,
      lowStockItems: lowStockItemsRaw.filter((i: any) => i.quantity <= i.minStock).length,
      monthlyRevenue, complaintsByCategory, complaintsByStatus,
      recentComplaints: formattedComplaints,
      recentWorkOrders: formattedWorkOrders,
      upcomingPm: formattedPm,
    });
  } catch (error) {
    console.error('Dashboard DB error:', error);
    const { getDbFriendlyMessage: gfm, getErrorHeaders: geh } = await import('@/core/database/db');
    return NextResponse.json({ error: gfm(error) }, { status: 500, headers: geh(error) });
  }
}