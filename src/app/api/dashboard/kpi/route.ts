import { NextRequest, NextResponse } from 'next/server';
import { db, getDbFriendlyMessage, getErrorHeaders } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
import { buildDashboardScope } from '@/modules/dashboard/services/dashboard-scope';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;
const PROXY_TIMEOUT_MS = 12_000;

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // ── Production: proxy to Render backend ────────────────────────────────
  if (BACKEND_URL) {
    const authHeader = request.headers.get('authorization') || '';
    const searchParams = request.nextUrl.searchParams.toString();
    const url = searchParams
      ? `${BACKEND_URL}/api/dashboard/kpi?${searchParams}`
      : `${BACKEND_URL}/api/dashboard/kpi`;

    // Audit log
    const token = authHeader.replace('Bearer ', '');
    const payload = verifyToken(token);
    if (payload) {
      console.log(`[Dashboard/${payload.role}] GET /api/dashboard/kpi userId=${payload.userId}`);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

      const res = await fetch(url, {
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await res.json();
      console.log(`[Dashboard/KPI] Proxy ${res.status} in ${Date.now() - startTime}ms`);
      return NextResponse.json(data, { status: res.status });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const isTimeout = error instanceof DOMException && error.name === 'AbortError';
      console.error(`[Dashboard/KPI] Proxy error (${isTimeout ? 'timeout' : 'network'}): ${msg}`);
      return NextResponse.json(
        { error: isTimeout ? 'Backend request timed out' : 'Backend service unavailable' },
        { status: 502 },
      );
    }
  }

  // ── Local dev: use Prisma/SQLite ───────────────────────────────────────
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) {
      console.log('[Dashboard/KPI] 401 — invalid or missing token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = payload.tenantId as string;
    const role = (payload.role as string).toLowerCase();

    const scope = await buildDashboardScope({
      userId: payload.userId as string,
      tenantId,
      role,
      email: payload.email as string | undefined,
    });
    if (!scope) {
      console.log(`[Dashboard/KPI] 401 — buildDashboardScope returned null for userId=${payload.userId} role=${role}`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[Dashboard/${role}] GET /api/dashboard/kpi userId=${payload.userId}`);

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
      db.complaint.groupBy({
        by: ['status'],
        where: scope.complaintWhere,
        _count: { id: true },
      }),
      db.workOrder.groupBy({
        by: ['status'],
        where: scope.workOrderWhere,
        _count: { id: true },
      }),
      scope.canSeeRevenue
        ? db.invoice.aggregate({
            where: { ...scope.invoiceWhere, status: 'PAID' },
            _sum: { total: true },
          })
        : Promise.resolve({ _sum: { total: 0 } }),
      scope.canSeeRevenue
        ? db.invoice.count({ where: { ...scope.invoiceWhere, status: 'PENDING' } })
        : Promise.resolve(0),
      scope.canSeeRevenue
        ? db.invoice.count({ where: { ...scope.invoiceWhere, status: 'OVERDUE' } })
        : Promise.resolve(0),
      scope.canSeeCustomers
        ? (role === 'customer'
            ? Promise.resolve(1)
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
        ? db.pmSchedule.findMany({ where: { tenantId }, select: { status: true } })
        : Promise.resolve([]),
    ]);

    // ── Complaint status breakdown ───────────────────────────────────────
    const statusMap: Record<string, number> = {};
    complaintStatusCounts.forEach((c: any) => {
      statusMap[c.status] = c._count.id;
    });
    const openComplaints = statusMap['OPEN'] || statusMap['NEW'] || 0;
    const inProgressComplaints = statusMap['IN_PROGRESS'] || statusMap['ACCEPTED'] || 0;

    // ── Work-order status breakdown ──────────────────────────────────────
    const woStatusMap: Record<string, number> = {};
    workOrderStatusCounts.forEach((c: any) => {
      woStatusMap[c.status] = c._count.id;
    });
    const totalWorkOrders = workOrderStatusCounts.reduce(
      (sum: number, c: any) => sum + c._count.id,
      0,
    );
    const pendingWorkOrders = woStatusMap['PENDING'] || 0;
    const completedWorkOrders = woStatusMap['COMPLETED'] || 0;

    // ── Low stock ────────────────────────────────────────────────────────
    const lowStockItems = (lowStockItemsRaw as any[]).filter(
      (i: any) => i.quantity <= i.minStock,
    ).length;

    // ── PM compliance ────────────────────────────────────────────────────
    const pmTotal = pmAll.length;
    const pmCompleted = pmAll.filter((pm: any) => pm.status === 'completed').length;
    const pmCompliance = pmTotal > 0 ? Math.round((pmCompleted / pmTotal) * 100) : 0;

    console.log(`[Dashboard/KPI] 200 in ${Date.now() - startTime}ms`);

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
      accessLevel: role,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Dashboard/KPI] 500 in ${duration}ms:`, error);
    return NextResponse.json(
      { error: getDbFriendlyMessage(error) },
      { status: 500, headers: getErrorHeaders(error) },
    );
  }
}