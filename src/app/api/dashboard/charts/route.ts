import { NextRequest, NextResponse } from 'next/server';
import { db, getDbFriendlyMessage, getErrorHeaders } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { buildAuthContext, buildComplaintWhereClause } from '@/lib/rbac';
import type { Prisma } from '@prisma/client';
export const dynamic = 'force-dynamic';

/**
 * Charts endpoint — returns data for Recharts visualizations.
 * Cached for 2 minutes on the client.
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

  const { where: complaintRbacWhere } = await buildComplaintWhereClause(ctx);

  try {
    const [
      complaintsByCategoryRaw,
      complaintsByStatusRaw,
      monthlyRevenueRaw,
      pmAll,
    ] = await Promise.all([
      // Category distribution
      db.complaint.groupBy({
        by: ['category'],
        where: { ...complaintRbacWhere, category: { not: null } } as Prisma.ComplaintWhereInput,
        _count: { id: true },
      }),
      // Status distribution
      db.complaint.groupBy({
        by: ['status'],
        where: complaintRbacWhere,
        _count: { id: true },
      }),
      // Monthly revenue (finance/admin only) — select only needed fields
      (['super_admin', 'admin', 'manager', 'finance'].includes(role))
        ? db.invoice.findMany({
            where: { tenantId, status: 'PAID', paidAt: { not: null } },
            select: { total: true, paidAt: true },
          })
        : Promise.resolve([]),
      // PM compliance breakdown
      (['super_admin', 'admin', 'manager', 'supervisor'].includes(role))
        ? db.pmSchedule.findMany({
            where: { tenantId },
            select: { status: true },
          })
        : Promise.resolve([]),
    ]);

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

    // PM compliance counts
    const upcomingPmCounts = {
      completed: pmAll.filter((pm) => pm.status === 'completed').length,
      overdue: pmAll.filter((pm) => pm.status === 'overdue').length,
      scheduled: pmAll.filter((pm) => pm.status === 'scheduled' || pm.status === 'active').length,
    };
    const pmTotal = pmAll.length;
    const pmCompleted = upcomingPmCounts.completed;
    const pmCompliance = pmTotal > 0 ? Math.round((pmCompleted / pmTotal) * 100) : 0;

    return NextResponse.json({
      monthlyRevenue,
      complaintsByCategory: complaintsByCategoryRaw.map((c) => ({
        category: c.category || 'Unknown',
        count: c._count.id,
      })),
      complaintsByStatus: complaintsByStatusRaw.map((c) => ({
        status: c.status,
        count: c._count.id,
      })),
      pmCompliance,
      upcomingPmCounts,
    });
  } catch (error) {
    console.error('Dashboard charts error:', error);
    return NextResponse.json({ error: getDbFriendlyMessage(error) }, { status: 500, headers: getErrorHeaders(error) });
  }
}