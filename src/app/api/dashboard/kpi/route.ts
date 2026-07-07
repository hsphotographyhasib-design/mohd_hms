import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request: NextRequest) {
  // ── Production: proxy to Render backend ────────────────────────────────
  if (BACKEND_URL) {
    try {
      const authHeader = request.headers.get('authorization') || '';
      const res = await fetch(`${BACKEND_URL}/api/dashboard/kpi`, {
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } catch (error) {
      console.error('Dashboard KPI proxy error:', error);
      return NextResponse.json({ error: 'Backend service unavailable' }, { status: 502 });
    }
  }

  // ── Local dev: use Prisma/SQLite ───────────────────────────────────────
  try {
    const { db, getDbFriendlyMessage, getErrorHeaders } = await import('@/lib/db');
    const { verifyToken } = await import('@/lib/auth');
    const { buildAuthContext, buildComplaintWhereClause } = await import('@/lib/rbac');

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const role = (payload.role as string).toLowerCase();

    const ctx = await buildAuthContext(payload, { resolveCustomer: true });
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { where: complaintRbacWhere } = await buildComplaintWhereClause(ctx);

    let workOrderWhere: Record<string, unknown> = { tenantId };
    if (role === 'technician') {
      workOrderWhere = { tenantId, assignedToId: ctx.userId };
    } else if (role === 'customer') {
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
      db.complaint.groupBy({ by: ['status'], where: complaintRbacWhere, _count: { id: true } }),
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
    complaintStatusCounts.forEach((c: any) => { statusMap[c.status] = c._count.id; });
    const openComplaints = statusMap['OPEN'] || statusMap['NEW'] || 0;
    const inProgressComplaints = statusMap['IN_PROGRESS'] || statusMap['ACCEPTED'] || 0;

    const woStatusMap: Record<string, number> = {};
    workOrderStatusCounts.forEach((c: any) => { woStatusMap[c.status] = c._count.id; });
    const totalWorkOrders = workOrderStatusCounts.reduce((sum, c) => sum + c._count.id, 0);
    const pendingWorkOrders = woStatusMap['PENDING'] || 0;
    const completedWorkOrders = woStatusMap['COMPLETED'] || 0;

    const lowStockItems = (lowStockItemsRaw as any[]).filter((i: any) => i.quantity <= i.minStock).length;

    const pmTotal = pmAll.length;
    const pmCompleted = pmAll.filter((pm: any) => pm.status === 'completed').length;
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
    });
  } catch (error) {
    console.error('Dashboard KPI error:', error);
    const { getDbFriendlyMessage: gfm, getErrorHeaders: geh } = await import('@/lib/db');
    return NextResponse.json({ error: gfm(error) }, { status: 500, headers: geh(error) });
  }
}