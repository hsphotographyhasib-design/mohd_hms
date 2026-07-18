import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
import { buildAuthContext } from '@/core/permissions/rbac';
import { canPerformAction } from '@/core/permissions/rbac/permissions-matrix';
import type { UserRole } from '@/core/permissions/rbac/types';

export const dynamic = 'force-dynamic';

// ─── GET: Analytics data ─────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ctx = await buildAuthContext(payload, { resolveCustomer: true });
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { role, userId, tenantId } = ctx;

    if (role === 'customer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!canPerformAction(role as UserRole, 'inspection', 'view_analytics')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const baseWhere: Record<string, unknown> = { tenantId };

    // Technicians only see their own data
    if (role === 'technician') {
      baseWhere.assignedToId = userId;
    }

    // ─── Monthly trend (last 12 months) ────────────────────────────────
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const monthlyInspections = await db.inspection.findMany({
      where: {
        ...baseWhere,
        createdAt: { gte: twelveMonthsAgo },
      },
      select: {
        status: true,
        result: true,
        createdAt: true,
      },
    });

    // Group by month
    const monthlyTrend: Array<{
      month: string;
      total: number;
      passed: number;
      failed: number;
      pending: number;
    }> = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      const monthLabel = d.toLocaleString('en-US', { year: 'numeric', month: 'short' });

      const monthItems = monthlyInspections.filter((item: Record<string, unknown>) => {
        const created = item.createdAt as Date;
        return created >= monthStart && created <= monthEnd;
      });

      monthlyTrend.push({
        month: monthLabel,
        total: monthItems.length,
        passed: monthItems.filter((m: Record<string, unknown>) => m.result === 'pass').length,
        failed: monthItems.filter((m: Record<string, unknown>) => m.result === 'fail').length,
        pending: monthItems.filter(
          (m: Record<string, unknown>) =>
            m.status === 'scheduled' || m.status === 'in_progress',
        ).length,
      });
    }

    // ─── Status breakdown ──────────────────────────────────────────────
    const allInspections = await db.inspection.findMany({
      where: baseWhere,
      select: { status: true },
    });

    const statusCounts: Record<string, number> = {};
    for (const insp of allInspections) {
      const s = (insp as Record<string, unknown>).status as string;
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    }

    const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));

    // ─── Priority breakdown ────────────────────────────────────────────
    const priorityInspections = await db.inspection.findMany({
      where: baseWhere,
      select: { priority: true },
    });

    const priorityCounts: Record<string, number> = {};
    for (const insp of priorityInspections) {
      const p = (insp as Record<string, unknown>).priority as string;
      priorityCounts[p] = (priorityCounts[p] || 0) + 1;
    }

    const priorityBreakdown = Object.entries(priorityCounts).map(([priority, count]) => ({
      priority,
      count,
    }));

    // ─── Top 5 inspectors by completed count ───────────────────────────
    const topInspectors = await db.inspection.groupBy({
      by: ['assignedToId', 'assignedToName'],
      where: {
        ...baseWhere,
        status: 'completed',
        assignedToId: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const inspectorBreakdown = topInspectors.map((item: Record<string, unknown>) => ({
      inspectorId: item.assignedToId,
      inspectorName: item.assignedToName,
      completedCount: (item._count as Record<string, number>).id,
    }));

    // ─── Pass/Fail by equipment category ───────────────────────────────
    const equipmentInspections = await db.inspection.findMany({
      where: {
        ...baseWhere,
        status: 'completed',
        result: { in: ['pass', 'fail'] },
        equipmentName: { not: null },
      },
      select: {
        equipmentName: true,
        result: true,
      },
    });

    const categoryMap: Record<string, { pass: number; fail: number }> = {};
    for (const insp of equipmentInspections) {
      const name = ((insp as Record<string, unknown>).equipmentName as string) || 'Unknown';
      const r = (insp as Record<string, unknown>).result as string;
      if (!categoryMap[name]) categoryMap[name] = { pass: 0, fail: 0 };
      if (r === 'pass') categoryMap[name].pass++;
      else if (r === 'fail') categoryMap[name].fail++;
    }

    const passFailByCategory = Object.entries(categoryMap).map(
      ([category, counts]) => ({
        category,
        pass: counts.pass,
        fail: counts.fail,
        total: counts.pass + counts.fail,
        passRate: counts.pass + counts.fail > 0
          ? Math.round((counts.pass / (counts.pass + counts.fail)) * 100)
          : 0,
      }),
    ).sort((a, b) => b.total - a.total);

    return NextResponse.json({
      monthlyTrend,
      statusBreakdown,
      priorityBreakdown,
      topInspectors: inspectorBreakdown,
      passFailByCategory,
    });
  } catch (error) {
    console.error('Inspection analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}