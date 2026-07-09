import { NextRequest, NextResponse } from 'next/server';
import { db, getDbFriendlyMessage, getErrorHeaders } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
import { buildDashboardScope } from '@/modules/dashboard/services/dashboard-scope';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request: NextRequest) {
  // ── Production: proxy to Render backend ────────────────────────────────
  if (BACKEND_URL) {
    try {
      const authHeader = request.headers.get('authorization') || '';
      const searchParams = request.nextUrl.searchParams.toString();
      const url = searchParams
        ? `${BACKEND_URL}/api/dashboard/charts?${searchParams}`
        : `${BACKEND_URL}/api/dashboard/charts`;

      const token = authHeader.replace('Bearer ', '');
      const payload = verifyToken(token);
      if (payload) {
        console.log(`[Dashboard/${payload.role}] GET /api/dashboard/charts userId=${payload.userId}`);
      }

      const res = await fetch(url, {
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
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const role = (payload.role as string).toLowerCase();

    const scope = await buildDashboardScope({
      userId: payload.userId as string,
      tenantId,
      role,
      email: payload.email as string | undefined,
    });
    if (!scope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    console.log(`[Dashboard/${role}] GET /api/dashboard/charts userId=${payload.userId}`);

    // ── Determine which data sets to fetch ───────────────────────────────
    const fetchComplaints = role !== 'finance' && role !== 'hr';
    const fetchRevenue = scope.canSeeRevenue;
    const fetchPm = scope.canSeePm;

    const [
      complaintsByCategoryRaw,
      complaintsByStatusRaw,
      monthlyRevenueRaw,
      pmAll,
    ] = await Promise.all([
      fetchComplaints
        ? db.complaint.groupBy({
            by: ['category'],
            where: { ...scope.complaintWhere, category: { not: null } },
            _count: { id: true },
          })
        : Promise.resolve([]),
      fetchComplaints
        ? db.complaint.groupBy({
            by: ['status'],
            where: scope.complaintWhere,
            _count: { id: true },
          })
        : Promise.resolve([]),
      fetchRevenue
        ? db.invoice.findMany({
            where: { ...scope.invoiceWhere, status: 'PAID', paidAt: { not: null } },
            select: { total: true, paidAt: true },
          })
        : Promise.resolve([]),
      fetchPm
        ? db.pmSchedule.findMany({ where: { tenantId }, select: { status: true } })
        : Promise.resolve([]),
    ]);

    // ── Monthly revenue (last 6 months) ──────────────────────────────────
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

    // ── PM compliance ────────────────────────────────────────────────────
    const upcomingPmCounts = {
      completed: pmAll.filter((pm: any) => pm.status === 'completed').length,
      overdue: pmAll.filter((pm: any) => pm.status === 'overdue').length,
      scheduled:
        pmAll.filter(
          (pm: any) => pm.status === 'scheduled' || pm.status === 'active',
        ).length,
    };
    const pmTotal = pmAll.length;
    const pmCompleted = upcomingPmCounts.completed;
    const pmCompliance = pmTotal > 0 ? Math.round((pmCompleted / pmTotal) * 100) : 0;

    return NextResponse.json({
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
    return NextResponse.json(
      { error: getDbFriendlyMessage(error) },
      { status: 500, headers: getErrorHeaders(error) },
    );
  }
}