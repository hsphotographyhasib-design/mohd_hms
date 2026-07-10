import { NextRequest, NextResponse } from 'next/server';
import { db, getDbFriendlyMessage, getErrorHeaders } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
import { buildDashboardScope } from '@/modules/dashboard/services/dashboard-scope';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;
const PROXY_TIMEOUT_MS = 12_000;

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  let payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = payload.tenantId as string;
  const role = (payload.role as string).toLowerCase();
  const logPrefix = `[Dashboard/Charts/${role}]`;

  // ── Try proxy to external backend first ─────────────────────────────────
  if (BACKEND_URL) {
    console.log(`${logPrefix} GET /api/dashboard/charts userId=${payload.userId}`);
    try {
      const searchParams = request.nextUrl.searchParams.toString();
      const url = searchParams
        ? `${BACKEND_URL}/api/dashboard/charts?${searchParams}`
        : `${BACKEND_URL}/api/dashboard/charts`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

      const res = await fetch(url, {
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        console.log(`${logPrefix} Proxy 200 in ${Date.now() - startTime}ms`);
        return NextResponse.json(data);
      }
      // Non-2xx from backend → fall through to local Prisma
      console.warn(`${logPrefix} Backend returned ${res.status}, falling back to local DB`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`${logPrefix} Proxy failed (${msg}), falling back to local DB`);
    }
  }

  // ── Local Prisma/SQLite (primary or fallback) ───────────────────────────
  try {
    const scope = await buildDashboardScope({
      userId: payload.userId as string,
      tenantId,
      role,
      email: payload.email as string | undefined,
    });
    if (!scope) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Monthly revenue (last 6 months)
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

    // PM compliance
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

    console.log(`${logPrefix} ${BACKEND_URL ? 'Fallback' : 'Local'} 200 in ${Date.now() - startTime}ms`);

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
    console.error(`${logPrefix} 500 in ${Date.now() - startTime}ms:`, error);
    return NextResponse.json(
      { error: getDbFriendlyMessage(error) },
      { status: 500, headers: getErrorHeaders(error) },
    );
  }
}