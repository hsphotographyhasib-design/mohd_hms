import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;

    // Run all queries in parallel
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
      complaintsByStatusRaw,
      recentComplaints,
      recentWorkOrders,
      upcomingPm,
    ] = await Promise.all([
      // Total equipment
      db.equipment.count({ where: { tenantId } }),
      // Active equipment
      db.equipment.count({ where: { tenantId, status: 'active' } }),
      // Complaints by status
      db.complaint.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { id: true },
      }),
      // Work orders by status
      db.workOrder.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { id: true },
      }),
      // Paid invoice revenue
      db.invoice.aggregate({
        where: { tenantId, status: 'PAID' },
        _sum: { total: true },
      }),
      // Pending invoices
      db.invoice.count({ where: { tenantId, status: 'PENDING' } }),
      // Overdue invoices
      db.invoice.count({ where: { tenantId, status: 'OVERDUE' } }),
      // Total customers
      db.customer.count({ where: { tenantId, isActive: true } }),
      // Total employees
      db.user.count({ where: { tenantId, isActive: true } }),
      // Low stock items - fetch and filter in JS (SQLite limitation)
      db.inventoryItem.findMany({ where: { tenantId, isActive: true }, select: { id: true, quantity: true, minStock: true } }),
      // PM compliance
      db.pmSchedule.findMany({ where: { tenantId } }),
      // Monthly revenue - last 6 months
      db.invoice.findMany({
        where: { tenantId, status: 'PAID', paidAt: { not: null } },
        select: { total: true, paidAt: true },
      }),
      // Complaints by category
      db.complaint.groupBy({
        by: ['category'],
        where: { tenantId, category: { not: null } },
        _count: { id: true },
      }),
      // Complaints by status (already have this but re-query for consistency)
      db.complaint.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { id: true },
      }),
      // Recent 5 complaints
      db.complaint.findMany({
        where: { tenantId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true } },
          assignedTo: { select: { name: true } },
          supervisor: { select: { name: true } },
          equipment: { select: { name: true } },
        },
      }),
      // Recent 5 work orders
      db.workOrder.findMany({
        where: { tenantId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          assignedTo: { select: { name: true } },
          equipment: { select: { name: true } },
        },
      }),
      // Upcoming 5 PM schedules
      db.pmSchedule.findMany({
        where: { tenantId, status: 'active', nextDueDate: { gte: new Date() } },
        take: 5,
        orderBy: { nextDueDate: 'asc' },
        include: {
          equipment: { select: { name: true } },
          assignedTo: { select: { name: true } },
        },
      }),
    ]);

    // Calculate complaint status counts
    const statusMap: Record<string, number> = {};
    complaintStatusCounts.forEach((c) => { statusMap[c.status] = c._count.id; });
    const openComplaints = statusMap['OPEN'] || 0;
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
    const formattedPm = upcomingPm.map((pm) => ({
      id: pm.id,
      tenantId: pm.tenantId,
      equipmentId: pm.equipmentId,
      equipmentName: pm.equipment.name,
      title: pm.title,
      description: pm.description,
      frequency: pm.frequency,
      lastExecuted: pm.lastExecuted?.toISOString(),
      nextDueDate: pm.nextDueDate.toISOString(),
      assignedToId: pm.assignedToId,
      assignedToName: pm.assignedTo?.name,
      status: pm.status,
      createdAt: pm.createdAt.toISOString(),
      updatedAt: pm.updatedAt.toISOString(),
    }));

    // Format complaints by category
    const complaintsByCategory = complaintsByCategoryRaw.map((c) => ({
      category: c.category || 'Unknown',
      count: c._count.id,
    }));

    // Format complaints by status
    const complaintsByStatus = complaintsByStatusRaw.map((c) => ({
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
      lowStockItems: lowStockItemsRaw.filter(i => i.quantity <= i.minStock).length,
      monthlyRevenue,
      complaintsByCategory,
      complaintsByStatus,
      recentComplaints: formattedComplaints,
      recentWorkOrders: formattedWorkOrders,
      upcomingPm: formattedPm,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
