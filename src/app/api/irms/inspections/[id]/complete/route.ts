import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
import { buildAuthContext } from '@/core/permissions/rbac';
import { canPerformAction } from '@/core/permissions/rbac/permissions-matrix';
import type { UserRole } from '@/core/permissions/rbac/types';

export const dynamic = 'force-dynamic';

// ─── POST: Mark inspection as completed ──────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    if (!canPerformAction(role as UserRole, 'inspection', 'complete')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const inspection = await db.inspection.findUnique({
      where: { id },
      include: { results: true },
    });

    if (!inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
    }
    if (inspection.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Technicians can only complete their own inspections
    if (role === 'technician' && inspection.assignedToId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Only scheduled or in_progress inspections can be completed
    if (!['scheduled', 'in_progress'].includes(inspection.status)) {
      return NextResponse.json(
        { error: `Cannot complete inspection with status: ${inspection.status}` },
        { status: 400 },
      );
    }

    // Calculate result from checklist answers / results
    let result: string = 'pass';
    let calculatedScore: number | null = null;

    if (inspection.results && inspection.results.length > 0) {
      const totalItems = inspection.results.length;
      const passItems = inspection.results.filter(
        (r: Record<string, unknown>) =>
          r.answer === 'pass' || r.answer === 'yes' || r.answer === 'ok',
      ).length;
      const failItems = inspection.results.filter(
        (r: Record<string, unknown>) =>
          r.answer === 'fail' || r.answer === 'no' || r.answer === 'not_ok',
      ).length;

      const passRate = passItems / totalItems;

      if (failItems > 0 && passItems === 0) {
        result = 'fail';
      } else if (failItems > 0 && passRate < 0.7) {
        result = 'fail';
      } else if (failItems > 0 && passRate < 1) {
        result = 'conditional';
      } else {
        result = 'pass';
      }

      // Calculate score from individual result scores if available
      const scoredResults = inspection.results.filter(
        (r: Record<string, unknown>) => r.score !== null && r.score !== undefined,
      );
      if (scoredResults.length > 0) {
        const totalScore = scoredResults.reduce(
          (sum: number, r: Record<string, unknown>) => sum + (r.score as number),
          0,
        );
        calculatedScore = Math.round(totalScore / scoredResults.length);
      } else {
        calculatedScore = Math.round(passRate * (inspection.maxScore || 100));
      }
    } else if (inspection.checklistData) {
      // Fallback: parse JSON checklist data
      try {
        const checklist = JSON.parse(inspection.checklistData);
        if (Array.isArray(checklist) && checklist.length > 0) {
          const passCount = checklist.filter(
            (item: Record<string, unknown>) =>
              item.answer === 'pass' || item.answer === 'yes' || item.answer === 'ok',
          ).length;
          const failCount = checklist.filter(
            (item: Record<string, unknown>) =>
              item.answer === 'fail' || item.answer === 'no' || item.answer === 'not_ok',
          ).length;
          const rate = passCount / checklist.length;

          if (failCount > 0 && passCount === 0) {
            result = 'fail';
          } else if (failCount > 0 && rate < 0.7) {
            result = 'fail';
          } else if (failCount > 0 && rate < 1) {
            result = 'conditional';
          } else {
            result = 'pass';
          }

          calculatedScore = Math.round(rate * (inspection.maxScore || 100));
        }
      } catch {
        // Invalid JSON — skip calculation
      }
    }

    const updated = await db.inspection.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        result,
        passRate: result === 'pass' ? 100 : result === 'fail' ? 0 : null,
        score: calculatedScore,
      },
    });

    const serialized = {
      ...updated,
      scheduledDate: updated.scheduledDate?.toISOString() ?? null,
      startedAt: updated.startedAt?.toISOString() ?? null,
      completedAt: updated.completedAt?.toISOString() ?? null,
      dueDate: updated.dueDate?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };

    return NextResponse.json(serialized);
  } catch (error) {
    console.error('Inspection complete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}