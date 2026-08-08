import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

const STATUS_FLOW = [
  'draft',
  'submitted',
  'supervisor_review',
  'manager_approval',
  'approved',
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = verifyRouteAuth(request, { feature: 'irms' });
  if (auth.error) return auth.error;
  try {
    const { id } = await params;
    const body = await request.json() as { action: 'advance' | 'reject'; comment?: string; userId?: string };

    const report = await db.irmReport.findUnique({ where: { id } });
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    if (body.action === 'advance') {
      const currentIdx = STATUS_FLOW.indexOf(report.status);
      if (currentIdx === -1 || currentIdx >= STATUS_FLOW.length - 1) {
        return NextResponse.json({ error: 'Cannot advance from current status' }, { status: 400 });
      }

      const nextStatus = STATUS_FLOW[currentIdx + 1];
      const versionCount = await db.irmRevision.count({ where: { reportId: id } });

      // Save revision snapshot before change
      await db.irmRevision.create({
        data: {
          reportId: id,
          version: versionCount + 1,
          snapshot: JSON.stringify(report),
          note: `Advanced from ${report.status} to ${nextStatus}`,
          userId: body.userId || report.inspectorId,
        },
      });

      // Create approval
      await db.irmApproval.create({
        data: {
          reportId: id,
          step: nextStatus === 'approved' ? 'manager_approval' : nextStatus,
          status: nextStatus === 'approved' ? 'approved' : 'pending',
          userId: body.userId || report.inspectorId,
          comment: body.comment || `Advanced to ${nextStatus}`,
        },
      });

      const updated = await db.irmReport.update({
        where: { id },
        data: { status: nextStatus },
      });

      // Create activity
      await db.irmActivity.create({
        data: {
          type: nextStatus === 'approved' ? 'report_approved' : 'status_changed',
          description: `Report ${report.number} status changed to ${nextStatus}`,
          reportId: id,
          projectId: report.projectId,
          userId: body.userId,
        },
      });

      return NextResponse.json(updated);
    }

    if (body.action === 'reject') {
      const versionCount = await db.irmRevision.count({ where: { reportId: id } });

      await db.irmRevision.create({
        data: {
          reportId: id,
          version: versionCount + 1,
          snapshot: JSON.stringify(report),
          note: `Rejected: ${body.comment || 'Returned to draft'}`,
          userId: body.userId || report.inspectorId,
        },
      });

      await db.irmApproval.create({
        data: {
          reportId: id,
          step: report.status,
          status: 'rejected',
          userId: body.userId || report.inspectorId,
          comment: body.comment || 'Rejected',
        },
      });

      const updated = await db.irmReport.update({
        where: { id },
        data: { status: 'draft' },
      });

      await db.irmActivity.create({
        data: {
          type: 'report_rejected',
          description: `Report ${report.number} was rejected and returned to draft`,
          reportId: id,
          projectId: report.projectId,
          userId: body.userId,
        },
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Invalid action. Use "advance" or "reject".' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Status update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}