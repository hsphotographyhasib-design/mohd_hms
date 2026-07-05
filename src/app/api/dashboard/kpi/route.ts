import { NextRequest, NextResponse } from 'next/server';
import { db, getDbFriendlyMessage, getErrorHeaders } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { buildAuthContext, buildComplaintWhereClause } from '@/lib/rbac';
import type { Prisma } from '@prisma/client';
export const dynamic = 'force-dynamic';

/**
 * Fast KPI endpoint — returns only aggregate counts.
 * Designed to respond in < 100ms for instant KPI card rendering.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  const payload = verifyToken(token || '');
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = payload.tenantId as string;
  const role = (payload.role as string).toLowerCase();

  const ctx = await buildAuthContext(payload, { resolveCustomer: true });
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { where: complaintRbacWhere, accessLevel } = await buildComplaintWhereClause(ctx);

  try {
    // Build work order WHERE
    let workOrderWhere: Prisma.WorkOrderWhereInput = { tenantId };
    if (role === 'technician') {
      workOrderWhere = { tenantId, assignedToId: ctx.userId };
    } else if (role === 'customer') {
      workOrderWhere = { tenantId, id: '__NEVER_MATCH__' };
    }

    const isFinance = ['super_admin', 'admin', 'manager', 'finance'].includes(role);
    const isInventory = ['super_admin', 'admin', 'manager'].includes(role);
    const isPm = ['super_admin', 'admin', 'manager', 'supervisor'].includes(role);

    const [
      complaintStatusCounts,
      workOrderStatusCounts,
      paidInvoiceRevenue,
      pendingInvoicesCount,
      overdueInvoicesCount,
      totalCustomers,
      totalEmployees,
      totalEquipment,
      activeEquipment,
      lowStockItemsRaw,
      pmAll,
    ] = await Promise.all([
      // Single groupBy for ALL complaint statuses (1 query instead of N)
      db.complaint.groupBy({
        by: ['status'],
        where: complaintRbacWhere,
        _count: { id: true },
      }),
      // Single groupBy for ALL work order statuses (1 query instead of N)
      db.workOrder.groupBy({
        by: ['status'],
        where: workOrderWhere,
        _count: { id: true },
      }),
      // Revenue — only for finance/admin roles
      isFinance
        ? db.invoice.aggregate({ where: { tenantId, status: 'PAID' }, _sum: { total: true } })
        : Promise.resolve({ _sum: { total: 0 } }),
      // Pending invoices
      isFinance
        ? db.invoice.count({ where: { tenantId, status: 'PENDING' } })
        : Promise.resolve(0),
      // Overdue invoices
      isFinance
        ? db.invoice.count({ where: { tenantId, status: 'OVERDUE' } })
        : Promise.resolve(0),
      // Customers
      role === 'customer'
        ? Promise.resolve(1)
        : db.customer.count({ where: { tenantId, isActive: true } }),
      // Employees
      role === 'customer'
        ? Promise.resolve(0)
        : db.user.count({ where: { tenantId, isActive: true } }),
      // Total equipment count
      db.equipment.count({ where: { tenantId } }),
      // Active equipment count
      db.equipment.count({ where: { tenantId, status: 'active' } }),
      // Low stock — select only id, quantity, minStock
      isInventory
        ? db.inventoryItem.findMany({
            where: { tenantId, isActive: true },
            select: { quantity: true, minStock: true },
          })
        : Promise.resolve([]),
      // PM data — select only status for compliance calc
      isPm
        ? db.pmSchedule.findMany({
            where: { tenantId },
            select: { status: true },
          })
        : Promise.resolve([]),
    ]);

    // Calculate from aggregated data — no extra queries needed
    const statusMap: Record<string, number> = {};
    complaintStatusCounts.forEach((c) => { statusMap[c.status] = c._count.id; });
    const openComplaints = statusMap['OPEN'] || statusMap['NEW'] || 0;
    const inProgressComplaints = statusMap['IN_PROGRESS'] || statusMap['ACCEPTED'] || 0;

    const woStatusMap: Record<string, number> = {};
    workOrderStatusCounts.forEach((c) => { woStatusMap[c.status] = c._count.id; });
    const totalWorkOrders = workOrderStatusCounts.reduce((sum, c) => sum + c._count.id, 0);
    const pendingWorkOrders = woStatusMap['PENDING'] || 0;
    const completedWorkOrders = woStatusMap['COMPLETED'] || 0;

    // Low stock — computed in-memory from minimal select
    const lowStockItems = (lowStockItemsRaw as any[]).filter((i) => i.quantity <= i.minStock).length;

    // PM compliance
    const pmTotal = pmAll.length;
    const pmCompleted = pmAll.filter((pm) => pm.status === 'completed').length;
    const pmCompliance = pmTotal > 0 ? Math.round((pmCompleted / pmTotal) * 100) : 0;

    return NextResponse.json({
      totalEquipment,
      activeEquipment,
      openComplaints,
      inProgressComplaints,
      totalWorkOrders,
      pendingWorkOrders,
      completedWorkOrders,
      totalRevenue: (paidInvoiceRevenue as any)._sum?.total || 0,
      pendingInvoices: pendingInvoicesCount as number,
      overdueInvoices: overdueInvoicesCount as number,
      pmCompliance,
      totalCustomers: totalCustomers as number,
      totalEmployees: totalEmployees as number,
      lowStockItems,
      accessLevel,
    });
  } catch (error) {
    console.error('Dashboard KPI error:', error);
    return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500, headers: getErrorHeaders(error) });
  }
}