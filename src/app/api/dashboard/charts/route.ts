import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request: NextRequest) {
  // ── Production: proxy to Render backend ────────────────────────────────
  if (BACKEND_URL) {
    try {
      const authHeader = request.headers.get('authorization') || '';
      const res = await fetch(`${BACKEND_URL}/api/dashboard/charts`, {
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } catch (error) {
      console.error('Dashboard charts proxy error:', error);
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

    const [
      complaintsByCategoryRaw, complaintsByStatusRaw, monthlyRevenueRaw, pmAll,
    ] = await Promise.all([
      db.complaint.groupBy({
        by: ['category'],
        where: { ...complaintRbacWhere, category: { not: null } },
        _count: { id: true },
      }),
      db.complaint.groupBy({ by: ['status'], where: complaintRbacWhere, _count: { id: true } }),
      (['super_admin', 'admin', 'manager', 'finance'].includes(role))
        ? db.invoice.findMany({
            where: { tenantId, status: 'PAID', paidAt: { not: null } },
            select: { total: true, paidAt: true },
          })
        : Promise.resolve([]),
      (['super_admin', 'admin', 'manager', 'supervisor'].includes(role))
        ? db.pmSchedule.findMany({ where: { tenantId }, select: { status: true } })
        : Promise.resolve([]),
    ]);

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
        .reduce((sum: number, inv: any) => sum + inv.total, 0);
      monthlyRevenue.push({ month: monthName, revenue: Math.round(rev * 100) / 100 });
    }

    const upcomingPmCounts = {
      completed: pmAll.filter((pm: any) => pm.status === 'completed').length,
      overdue: pmAll.filter((pm: any) => pm.status === 'overdue').length,
      scheduled: pmAll.filter((pm: any) => pm.status === 'scheduled' || pm.status === 'active').length,
    };
    const pmTotal = pmAll.length;
    const pmCompleted = upcomingPmCounts.completed;
    const pmCompliance = pmTotal > 0 ? Math.round((pmCompleted / pmTotal) * 100) : 0;

    return NextResponse.json({
      monthlyRevenue,
      complaintsByCategory: complaintsByCategoryRaw.map((c: any) => ({
        category: c.category || 'Unknown',
        count: c._count.id,
      })),
      complaintsByStatus: complaintsByStatusRaw.map((c: any) => ({
        status: c.status,
        count: c._count.id,
      })),
      pmCompliance,
      upcomingPmCounts,
    });
  } catch (error) {
    console.error('Dashboard charts error:', error);
    const { getDbFriendlyMessage: gfm, getErrorHeaders: geh } = await import('@/lib/db');
    return NextResponse.json({ error: gfm(error) }, { status: 500, headers: geh(error) });
  }
}