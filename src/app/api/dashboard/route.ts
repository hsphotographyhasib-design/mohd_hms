import { NextRequest, NextResponse } from 'next/server';
import { db, getDbFriendlyMessage, getErrorHeaders } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { ensureAllTablesSynced } from '@/lib/db-sync';
import { buildAuthContext, buildComplaintWhereClause } from '@/lib/rbac';
import type { Prisma } from '@prisma/client';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // --- Phase 1: Auth check ---
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  const payload = verifyToken(token || '');
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = payload.tenantId as string;
  const role = (payload.role as string).toLowerCase();

  // --- Phase 1.5: Build RBAC context ---
  const ctx = await buildAuthContext(payload, { resolveCustomer: true });
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // --- Phase 1.6: Auto-sync schema columns ---
  await ensureAllTablesSynced();

  // --- Phase 1.7: Build RBAC WHERE clause for complaints ---
  const { where: complaintRbacWhere, accessLevel } = await buildComplaintWhereClause(ctx);

  // --- Phase 2: Database queries ---
  try {
    // Build complaint WHERE clauses for different queries
    const baseComplaintWhere = complaintRbacWhere;
    const openComplaintWhere = { ...baseComplaintWhere, status: 'NEW' } as Prisma.ComplaintWhereInput;
    const inProgressComplaintWhere = { ...baseComplaintWhere, status: 'IN_PROGRESS' } as Prisma.ComplaintWhereInput;

    // Work order WHERE: same tenant, but filter by user's accessible complaints
    // For technicians, show only their work orders
    let workOrderWhere: Prisma.WorkOrderWhereInput = { tenantId };
    if (role === 'technician') {
      workOrderWhere = { tenantId, assignedToId: ctx.userId };
    } else if (role === 'customer') {
      // Customers don't see work orders directly
      workOrderWhere = { tenantId, id: '__NEVER_MATCH__' };
    }

    const [
      totalEquipment,
      activeEquipment,
      complaintStatusCounts,
      workOrderStatusCounts,
      paidInvoiceRevenue,
      pendingInvoicesCount,
      overdueInvoicesCount,
      totalCustomers,
      totalEmployees,
      lowStockItemsRaw,
      pmAll,
      monthlyRevenueRaw,
      complaintsByCategoryRaw,
      recentComplaints,
      recentWorkOrders,
      upcomingPm,
    ] = await Promise.all([
      // Total equipment (all roles see tenant equipment count)
      db.equipment.count({ where: { tenantId } }),
      // Active equipment
      db.equipment.count({ where: { tenantId, status: 'active' } }),
      // Complaints by status — RBAC filtered
      db.complaint.groupBy({
        by: ['status'],
        where: baseComplaintWhere,
        _count: { id: true },
      }),
      // Work orders by status — RBAC filtered
      db.workOrder.groupBy({
        by: ['status'],
        where: workOrderWhere,
        _count: { id: true },
      }),
      // Paid invoice revenue (finance/admin/manager/super_admin only)
      (['super_admin', 'admin', 'manager', 'finance'].includes(role))
        ? db.invoice.aggregate({
            where: { tenantId, status: 'PAID' },
            _sum: { total: true },
          })
        : Promise.resolve({ _sum: { total: 0 } }),
      // Pending invoices (finance/admin/manager only)
      (['super_admin', 'admin', 'manager', 'finance'].includes(role))
        ? db.invoice.count({ where: { tenantId, status: 'PENDING' } })
        : Promise.resolve(0),
      // Overdue invoices (finance/admin/manager only)
      (['super_admin', 'admin', 'manager', 'finance'].includes(role))
        ? db.invoice.count({ where: { tenantId, status: 'OVERDUE' } })
        : Promise.resolve(0),
      // Total customers
      (role === 'customer')
        ? Promise.resolve(1) // Customer sees "1" (themselves)
        : db.customer.count({ where: { tenantId, isActive: true } }),
      // Total employees (not shown to customers)
      (role === 'customer')
        ? Promise.resolve(0)
        : db.user.count({ where: { tenantId, isActive: true } }),
      // Low stock items (admin/manager/super_admin only)
      (['super_admin', 'admin', 'manager'].includes(role))
        ? db.inventoryItem.findMany({ where: { tenantId, isActive: true }, select: { id: true, quantity: true, minStock: true } })
        : Promise.resolve([]),
      // PM compliance (admin/manager/supervisor only)
      (['super_admin', 'admin', 'manager', 'supervisor'].includes(role))
        ? db.pmSchedule.findMany({ where: { tenantId } })
        : Promise.resolve([]),
      // Monthly revenue (finance/admin/manager only)
      (['super_admin', 'admin', 'manager', 'finance'].includes(role))
        ? db.invoice.findMany({
            where: { tenantId, status: 'PAID', paidAt: { not: null } },
            select: { total: true, paidAt: true },
          })
        : Promise.resolve([]),
      // Complaints by category — RBAC filtered
      db.complaint.groupBy({
        by: ['category'],
        where: { ...baseComplaintWhere, category: { not: null } } as Prisma.ComplaintWhereInput,
        _count: { id: true },
      }),
      // Recent complaints — RBAC filtered
      db.complaint.findMany({
        where: baseComplaintWhere,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true } },
          assignedTo: { select: { name: true } },
          supervisor: { select: { name: true } },
          equipment: { select: { name: true } },
        },
      }),
      // Recent work orders — RBAC filtered
      db.workOrder.findMany({
        where: workOrderWhere,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          assignedTo: { select: { name: true } },
          equipment: { select: { name: true } },
        },
      }),
      // Upcoming PM (admin/manager/supervisor only)
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

    // Calculate complaint status counts
    const statusMap: Record<string, number> = {};
    complaintStatusCounts.forEach((c) => { statusMap[c.status] = c._count.id; });
    const openComplaints = statusMap['OPEN'] || statusMap['NEW'] || 0;
    const inProgressComplaints = statusMap['IN_PROGRESS'] || 0;

    // Calculate work order status counts
    const woStatusMap: Record<string, number> = {};
    workOrderStatusCounts.forEach((c) => { woStatusMap[c.status] = c._count.id; });
    const totalWorkOrders = workOrderStatusCounts.reduce((sum, c) => sum + c._count.id, 0);
    const pendingWorkOrders = woStatusMap['PENDING'] || 0;
    const completedWorkOrders = woStatusMap['COMPLETED'] || 0;

    // PM compliance
    const pmTotal = pmAll.length;
    const pmCompleted = pmAll.filter((pm) => pm.status === 'completed').length;
    const pmCompliance = pmTotal > 0 ? Math.round((pmCompleted / pmTotal) * 100) : 0;

    // Monthly revenue for last 6 months
    const now = new Date();
    const monthlyRevenue: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const monthName = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const rev = monthlyRevenueRaw
        .filter((inv) => {
          const paid = new Date(inv.paidAt!);
          return paid >= d && paid <= end;
        })
        .reduce((sum, inv) => sum + inv.total, 0);
      monthlyRevenue.push({ month: monthName, revenue: Math.round(rev * 100) / 100 });
    }

    // Format recent complaints
    const formattedComplaints = recentComplaints.map((c) => ({
      id: c.id,
      tenantId: c.tenantId,
      customerId: c.customerId,
      customerName: c.customer.name,
      equipmentId: c.equipmentId,
      equipmentName: c.equipment?.name,
      title: c.title,
      description: c.description,
      priority: c.priority,
      status: c.status,
      category: c.category,
      assignedToId: c.assignedToId,
      assignedToName: c.assignedTo?.name,
      supervisorId: c.supervisorId,
      supervisorName: c.supervisor?.name,
      resolvedAt: c.resolvedAt?.toISOString(),
      closedAt: c.closedAt?.toISOString(),
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    // Format recent work orders
    const formattedWorkOrders = recentWorkOrders.map((wo) => ({
      id: wo.id,
      tenantId: wo.tenantId,
      complaintId: wo.complaintId,
      equipmentId: wo.equipmentId,
      equipmentName: wo.equipment?.name,
      title: wo.title,
      description: wo.description,
      status: wo.status,
      priority: wo.priority,
      type: wo.type,
      assignedToId: wo.assignedToId,
      assignedToName: wo.assignedTo?.name,
      scheduledDate: wo.scheduledDate?.toISOString(),
      completedAt: wo.completedAt?.toISOString(),
      totalCost: wo.totalCost,
      createdAt: wo.createdAt.toISOString(),
      updatedAt: wo.updatedAt.toISOString(),
    }));

    // Format upcoming PM
    const formattedPm = (upcomingPm as any[]).map((pm) => ({
      id: pm.id,
      tenantId: pm.tenantId,
      equipmentId: pm.equipmentId,
      equipmentName: pm.equipment?.name,
      title: pm.title,
      description: pm.description,
      frequency: pm.frequency,
      lastExecuted: pm.lastExecuted?.toISOString(),
      nextDueDate: pm.nextDueDate?.toISOString(),
      assignedToId: pm.assignedToId,
      assignedToName: pm.assignedTo?.name,
      status: pm.status,
      createdAt: pm.createdAt?.toISOString(),
      updatedAt: pm.updatedAt?.toISOString(),
    }));

    // Format complaints by category
    const complaintsByCategory = complaintsByCategoryRaw.map((c) => ({
      category: c.category || 'Unknown',
      count: c._count.id,
    }));

    // Format complaints by status (reuse complaintStatusCounts)
    const complaintsByStatus = complaintStatusCounts.map((c) => ({
      status: c.status,
      count: c._count.id,
    }));

    return NextResponse.json({
      totalEquipment,
      activeEquipment,
      openComplaints,
      inProgressComplaints,
      totalWorkOrders,
      pendingWorkOrders,
      completedWorkOrders,
      totalRevenue: paidInvoiceRevenue._sum.total || 0,
      pendingInvoices: pendingInvoicesCount,
      overdueInvoices: overdueInvoicesCount,
      pmCompliance,
      totalCustomers,
      totalEmployees,
      lowStockItems: lowStockItemsRaw.filter((i: any) => i.quantity <= i.minStock).length,
      monthlyRevenue,
      complaintsByCategory,
      complaintsByStatus,
      recentComplaints: formattedComplaints,
      recentWorkOrders: formattedWorkOrders,
      upcomingPm: formattedPm,
      accessLevel,
    });
  } catch (error) {
    console.error('Dashboard DB error:', error);
    return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500, headers: getErrorHeaders(error) });
  }
}