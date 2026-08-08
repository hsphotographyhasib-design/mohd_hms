import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = verifyRouteAuth(request, { feature: 'irms' });
  if (auth.error) return auth.error;
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Monthly trend (last 6 months)
    const monthlyReports = await db.irmReport.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true, status: true, completionPct: true, inspectorId: true, workCategory: true, priority: true, labourHours: true },
    });

    const monthlyTrend: { month: string; total: number; approved: number; avgCompletion: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthLabel = monthStart.toLocaleString('default', { month: 'short', year: 'numeric' });
      const monthReports = monthlyReports.filter(r => r.createdAt >= monthStart && r.createdAt < monthEnd);
      const approved = monthReports.filter(r => r.status === 'approved').length;
      const avgComp = monthReports.length > 0
        ? monthReports.reduce((s, r) => s + r.completionPct, 0) / monthReports.length
        : 0;
      monthlyTrend.push({
        month: monthLabel,
        total: monthReports.length,
        approved,
        avgCompletion: Math.round(avgComp),
      });
    }

    // Status breakdown
    const statusBreakdown = await db.irmReport.groupBy({
      by: ['status'],
      _count: true,
    });

    // Priority breakdown
    const priorityBreakdown = await db.irmReport.groupBy({
      by: ['priority'],
      _count: true,
    });

    // Work category breakdown
    const workCategoryBreakdown = await db.irmReport.groupBy({
      by: ['workCategory'],
      _count: true,
      where: { workCategory: { not: null } },
    });

    // Technician performance
    const technicians = await db.irmUser.findMany({
      where: { role: 'Inspector' },
      include: {
        inspectorReports: {
          select: { id: true, status: true, completionPct: true, labourHours: true, createdAt: true },
        },
      },
    });

    const technicianPerformance = technicians.map(t => {
      const reports = t.inspectorReports;
      const total = reports.length;
      const approved = reports.filter(r => r.status === 'approved').length;
      const avgCompletion = total > 0 ? reports.reduce((s, r) => s + r.completionPct, 0) / total : 0;
      const totalHours = reports.reduce((s, r) => s + (r.labourHours || 0), 0);
      const thisMonth = reports.filter(r => {
        const d = r.createdAt;
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;

      return {
        id: t.id,
        name: t.name,
        role: t.role,
        totalReports: total,
        approvedReports: approved,
        approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
        avgCompletion: Math.round(avgCompletion),
        totalLabourHours: Math.round(totalHours * 10) / 10,
        thisMonthReports: thisMonth,
      };
    });

    // Labour hours by month
    const labourByMonth: { month: string; hours: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthLabel = monthStart.toLocaleString('default', { month: 'short', year: 'numeric' });
      const hours = monthlyReports
        .filter(r => r.createdAt >= monthStart && r.createdAt < monthEnd)
        .reduce((s, r) => s + (r.labourHours || 0), 0);
      labourByMonth.push({ month: monthLabel, hours: Math.round(hours * 10) / 10 });
    }

    return NextResponse.json({
      monthlyTrend,
      statusBreakdown,
      priorityBreakdown,
      workCategoryBreakdown,
      technicianPerformance,
      labourByMonth,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Analytics data failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}