import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = verifyRouteAuth(request, { feature: 'irms' });
  if (auth.error) return auth.error;
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 86400000);

    // Today's inspections
    const todayInspections = await db.irmReport.count({
      where: {
        inspectionDate: { gte: today, lt: tomorrow },
      },
    });

    // Completed reports
    const completedReports = await db.irmReport.count({
      where: { status: 'approved' },
    });

    // Pending reports
    const pendingReports = await db.irmReport.count({
      where: {
        status: { in: ['draft', 'submitted', 'supervisor_review', 'manager_approval'] },
      },
    });

    // Overdue reports (past inspection date and not approved)
    const overdueReports = await db.irmReport.count({
      where: {
        inspectionDate: { lt: today },
        status: { not: 'approved' },
      },
    });

    // Active projects
    const activeProjects = await db.irmProject.count({
      where: { status: 'active' },
    });

    // Active work orders
    const activeWorkOrders = await db.irmReport.count({
      where: { workOrderNumber: { not: null } },
    });

    // Total photos
    const photosUploaded = await db.irmPhoto.count();

    // Average completion
    const avgResult = await db.irmReport.aggregate({
      _avg: { completionPct: true },
    });
    const avgCompletion = avgResult._avg.completionPct || 0;

    // Recent 5 reports
    const recentReports = await db.irmReport.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { id: true, name: true, number: true } },
        inspector: { select: { id: true, name: true, role: true } },
      },
    });

    // Upcoming inspections (next 5)
    const upcomingInspections = await db.irmReport.findMany({
      where: { inspectionDate: { gte: today } },
      take: 5,
      orderBy: { inspectionDate: 'asc' },
      include: {
        project: { select: { id: true, name: true, number: true } },
        inspector: { select: { id: true, name: true, role: true } },
      },
    });

    // Inspection trend: last 14 days
    const fourteenDaysAgo = new Date(today.getTime() - 13 * 86400000);
    const trendReports = await db.irmReport.findMany({
      where: { inspectionDate: { gte: fourteenDaysAgo, lt: tomorrow } },
      select: { inspectionDate: true },
    });
    const inspectionTrend: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const day = new Date(today.getTime() - i * 86400000);
      const dayStr = day.toISOString().split('T')[0];
      const count = trendReports.filter(r => r.inspectionDate.toISOString().split('T')[0] === dayStr).length;
      inspectionTrend.push({ date: dayStr, count });
    }

    // Category breakdown
    const categoryBreakdown = await db.irmReport.groupBy({
      by: ['workCategory'],
      _count: true,
      where: { workCategory: { not: null } },
    });

    // Project progress
    const allProjects = await db.irmProject.findMany({
      where: { status: 'active' },
      include: {
        reports: { select: { completionPct: true } },
      },
    });
    const projectProgress = allProjects.map(p => {
      const reports = p.reports;
      const avgPct = reports.length > 0
        ? reports.reduce((sum: number, r: { completionPct: number }) => sum + r.completionPct, 0) / reports.length
        : 0;
      return {
        id: p.id,
        name: p.name,
        number: p.number,
        reportCount: reports.length,
        avgCompletionPct: Math.round(avgPct),
      };
    });

    // Recent 10 activities
    const recentActivities = await db.irmActivity.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, role: true, avatar: true } },
        report: { select: { id: true, number: true } },
        project: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      todayInspections,
      completedReports,
      pendingReports,
      overdueReports,
      activeProjects,
      activeWorkOrders,
      photosUploaded,
      avgCompletion: Math.round(avgCompletion),
      recentReports,
      upcomingInspections,
      inspectionTrend,
      categoryBreakdown,
      projectProgress,
      recentActivities,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Dashboard data failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}