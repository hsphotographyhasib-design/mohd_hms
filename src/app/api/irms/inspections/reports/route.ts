import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
import { buildAuthContext } from '@/core/permissions/rbac';
import { canPerformAction } from '@/core/permissions/rbac/permissions-matrix';
import type { UserRole } from '@/core/permissions/rbac/types';

export const dynamic = 'force-dynamic';

const VALID_REPORT_TYPES = [
  'inspection_report',
  'monthly_summary',
  'compliance_report',
  'equipment_history',
  'inspector_performance',
];

// ─── GET: List reports or generate a new report ──────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ctx = await buildAuthContext(payload, { resolveCustomer: true });
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { role, tenantId } = ctx;

    if (role === 'customer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!canPerformAction(role as UserRole, 'inspection', 'export')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sp = request.nextUrl.searchParams;
    const generate = sp.get('generate') || '';
    const fromDateStr = sp.get('fromDate') || '';
    const toDateStr = sp.get('toDate') || '';
    const format = sp.get('format') || 'pdf';

    // If no generate param, return empty list (no persisted reports yet)
    if (!generate) {
      return NextResponse.json({ items: [], total: 0 });
    }

    // Validate report type
    if (!VALID_REPORT_TYPES.includes(generate)) {
      return NextResponse.json(
        { error: `Invalid report type. Must be one of: ${VALID_REPORT_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    // Build date range
    let dateFilter: Record<string, unknown> | undefined;
    if (fromDateStr || toDateStr) {
      dateFilter = {};
      if (fromDateStr) (dateFilter as Record<string, unknown>).gte = new Date(fromDateStr);
      if (toDateStr) (dateFilter as Record<string, unknown>).lte = new Date(toDateStr);
    }

    const baseWhere: Record<string, unknown> = { tenantId };
    if (dateFilter) baseWhere.createdAt = dateFilter;

    let reportData: Record<string, unknown>;

    switch (generate) {
      case 'inspection_report': {
        const inspections = await db.inspection.findMany({
          where: baseWhere,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            inspectionType: true,
            status: true,
            priority: true,
            result: true,
            equipmentName: true,
            assignedToName: true,
            scheduledDate: true,
            completedAt: true,
            score: true,
            passRate: true,
            createdAt: true,
          },
        });

        const completed = inspections.filter(
          (i: Record<string, unknown>) => i.status === 'completed',
        );
        const passed = completed.filter(
          (i: Record<string, unknown>) => i.result === 'pass',
        );

        reportData = {
          reportType: 'inspection_report',
          generatedAt: new Date().toISOString(),
          format,
          summary: {
            totalInspections: inspections.length,
            completedInspections: completed.length,
            passRate: completed.length > 0
              ? Math.round((passed.length / completed.length) * 100)
              : 0,
          },
          inspections: inspections.map((i: Record<string, unknown>) => ({
            ...i,
            scheduledDate: (i.scheduledDate as Date | null)?.toISOString?.() ?? null,
            completedAt: (i.completedAt as Date | null)?.toISOString?.() ?? null,
            createdAt: (i.createdAt as Date).toISOString(),
          })),
        };
        break;
      }

      case 'monthly_summary': {
        const inspections = await db.inspection.findMany({
          where: baseWhere,
          select: {
            status: true,
            result: true,
            createdAt: true,
            inspectionType: true,
          },
        });

        // Group by month
        const monthlyMap: Record<string, { total: number; completed: number; pass: number; fail: number }> = {};
        for (const insp of inspections) {
          const d = insp.createdAt as Date;
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (!monthlyMap[key]) monthlyMap[key] = { total: 0, completed: 0, pass: 0, fail: 0 };
          monthlyMap[key].total++;
          if (insp.status === 'completed') monthlyMap[key].completed++;
          if (insp.result === 'pass') monthlyMap[key].pass++;
          if (insp.result === 'fail') monthlyMap[key].fail++;
        }

        reportData = {
          reportType: 'monthly_summary',
          generatedAt: new Date().toISOString(),
          format,
          months: Object.entries(monthlyMap)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([month, counts]) => ({
              month,
              ...counts,
              passRate: counts.completed > 0
                ? Math.round((counts.pass / counts.completed) * 100)
                : 0,
            })),
        };
        break;
      }

      case 'compliance_report': {
        const failedInspections = await db.inspection.findMany({
          where: {
            ...baseWhere,
            status: 'completed',
            result: { in: ['fail', 'conditional'] },
          },
          orderBy: { completedAt: 'desc' },
          select: {
            id: true,
            title: true,
            result: true,
            equipmentName: true,
            assignedToName: true,
            completedAt: true,
            findings: true,
            correctiveActions: true,
            recommendation: true,
          },
        });

        const conditionalInspections = await db.inspection.count({
          where: { ...baseWhere, status: 'completed', result: 'conditional' },
        });
        const failInspections = await db.inspection.count({
          where: { ...baseWhere, status: 'completed', result: 'fail' },
        });
        const totalCompleted = await db.inspection.count({
          where: { ...baseWhere, status: 'completed' },
        });

        reportData = {
          reportType: 'compliance_report',
          generatedAt: new Date().toISOString(),
          format,
          summary: {
            totalCompleted,
            failed: failInspections,
            conditional: conditionalInspections,
            complianceRate: totalCompleted > 0
              ? Math.round(((totalCompleted - failInspections - conditionalInspections) / totalCompleted) * 100)
              : 0,
          },
          nonCompliantInspections: failedInspections.map((i: Record<string, unknown>) => ({
            ...i,
            completedAt: (i.completedAt as Date | null)?.toISOString?.() ?? null,
          })),
        };
        break;
      }

      case 'equipment_history': {
        const equipmentInspections = await db.inspection.findMany({
          where: {
            ...baseWhere,
            equipmentName: { not: null },
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            equipmentName: true,
            equipmentId: true,
            status: true,
            result: true,
            priority: true,
            assignedToName: true,
            scheduledDate: true,
            completedAt: true,
            score: true,
            createdAt: true,
          },
        });

        // Group by equipment
        const equipMap: Record<string, typeof equipmentInspections> = {};
        for (const insp of equipmentInspections) {
          const name = insp.equipmentName as string;
          if (!equipMap[name]) equipMap[name] = [];
          equipMap[name].push(insp);
        }

        reportData = {
          reportType: 'equipment_history',
          generatedAt: new Date().toISOString(),
          format,
          equipment: Object.entries(equipMap).map(([name, inspections]) => {
            const completed = inspections.filter((i) => i.status === 'completed');
            const passed = completed.filter((i) => i.result === 'pass');
            return {
              equipmentName: name,
              totalInspections: inspections.length,
              completedInspections: completed.length,
              passRate: completed.length > 0
                ? Math.round((passed.length / completed.length) * 100)
                : 0,
              avgScore: completed.length > 0
                ? Math.round(
                    completed.reduce((s, i) => s + ((i.score as number) || 0), 0) / completed.length,
                  )
                : 0,
              inspections: inspections.map((i) => ({
                id: i.id,
                title: i.title,
                status: i.status,
                result: i.result,
                priority: i.priority,
                assignedToName: i.assignedToName,
                scheduledDate: i.scheduledDate?.toISOString?.() ?? null,
                completedAt: i.completedAt?.toISOString?.() ?? null,
                score: i.score,
                date: i.createdAt.toISOString(),
              })),
            };
          }),
        };
        break;
      }

      case 'inspector_performance': {
        const inspectorData = await db.inspection.groupBy({
          by: ['assignedToId', 'assignedToName'],
          where: {
            ...baseWhere,
            assignedToId: { not: null },
          },
          _count: { id: true },
          _avg: { score: true },
        });

        const inspectorDetails = await Promise.all(
          inspectorData.map(async (item: Record<string, unknown>) => {
            const inspectorWhere = {
              ...baseWhere,
              assignedToId: item.assignedToId,
            };

            const [completed, passed, failed] = await Promise.all([
              db.inspection.count({ where: { ...inspectorWhere, status: 'completed' } }),
              db.inspection.count({ where: { ...inspectorWhere, status: 'completed', result: 'pass' } }),
              db.inspection.count({ where: { ...inspectorWhere, status: 'completed', result: 'fail' } }),
            ]);

            return {
              inspectorId: item.assignedToId,
              inspectorName: item.assignedToName,
              totalAssigned: (item._count as Record<string, number>).id,
              completed,
              passRate: completed > 0 ? Math.round((passed / completed) * 100) : 0,
              avgScore: item._avg ? Math.round((item._avg as Record<string, number | null>).score || 0) : 0,
              failed,
            };
          }),
        );

        reportData = {
          reportType: 'inspector_performance',
          generatedAt: new Date().toISOString(),
          format,
          inspectors: inspectorDetails.sort((a, b) => b.totalAssigned - a.totalAssigned),
        };
        break;
      }

      default:
        reportData = { error: 'Unknown report type' };
    }

    return NextResponse.json(reportData);
  } catch (error) {
    console.error('Inspection reports error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}