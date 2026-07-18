import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
import { buildAuthContext } from '@/core/permissions/rbac';
import { canPerformAction } from '@/core/permissions/rbac/permissions-matrix';
import type { UserRole } from '@/core/permissions/rbac/types';

export const dynamic = 'force-dynamic';

// ─── GET: Dashboard KPI data ─────────────────────────────────────────────────
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

    if (!canPerformAction(role as UserRole, 'inspection', 'view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const baseWhere: Record<string, unknown> = { tenantId };

    // Technicians only see their own data
    if (role === 'technician') {
      baseWhere.assignedToId = userId;
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Run all counts in parallel
    const [
      totalInspections,
      scheduledTodayCount,
      pendingCount,
      completedCount,
      failedCount,
      overdueCount,
      completedWithPass,
    ] = await Promise.all([
      db.inspection.count({ where: baseWhere }),

      db.inspection.count({
        where: {
          ...baseWhere,
          scheduledDate: { gte: todayStart, lte: todayEnd },
          status: 'scheduled',
        },
      }),

      db.inspection.count({
        where: {
          ...baseWhere,
          status: { in: ['scheduled', 'in_progress'] },
        },
      }),

      db.inspection.count({
        where: {
          ...baseWhere,
          status: 'completed',
        },
      }),

      db.inspection.count({
        where: {
          ...baseWhere,
          status: 'failed',
        },
      }),

      db.inspection.count({
        where: {
          ...baseWhere,
          scheduledDate: { lt: now },
          status: { notIn: ['completed', 'cancelled'] },
        },
      }),

      db.inspection.count({
        where: {
          ...baseWhere,
          status: 'completed',
          result: 'pass',
        },
      }),
    ]);

    const passRate = completedCount > 0
      ? Math.round((completedWithPass / completedCount) * 100)
      : 0;

    return NextResponse.json({
      totalInspections,
      scheduledToday: scheduledTodayCount,
      pending: pendingCount,
      completed: completedCount,
      overdue: overdueCount,
      failed: failedCount,
      passRate,
    });
  } catch (error) {
    console.error('Inspection dashboard stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}