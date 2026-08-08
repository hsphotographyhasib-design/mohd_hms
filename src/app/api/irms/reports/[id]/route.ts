import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = verifyRouteAuth(request, { feature: 'irms' });
  if (auth.error) return auth.error;
  try {
    const { id } = await params;

    const report = await db.irmReport.findUnique({
      where: { id },
      include: {
        project: true,
        inspector: true,
        assessedBy: true,
        photos: { orderBy: { sortOrder: 'asc' } },
        revisions: { orderBy: { version: 'desc' } },
        approvals: { orderBy: { createdAt: 'desc' } },
        activities: { orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, name: true, role: true } } } },
      },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch report';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = verifyRouteAuth(request, { feature: 'irms' });
  if (auth.error) return auth.error;
  try {
    const { id } = await params;
    const body = await request.json();
    const { status: newStatus, ...updateData } = body;

    // If status is changing, create revision and approval
    if (newStatus) {
      const existing = await db.irmReport.findUnique({ where: { id }, select: { status: true } });
      if (existing && existing.status !== newStatus) {
        // Save revision before status change
        const reportBefore = await db.irmReport.findUnique({ where: { id } });
        const versionCount = await db.irmRevision.count({ where: { reportId: id } });
        if (reportBefore) {
          await db.irmRevision.create({
            data: {
              reportId: id,
              version: versionCount + 1,
              snapshot: JSON.stringify(reportBefore),
              note: `Status changed from ${existing.status} to ${newStatus}`,
              userId: updateData.assessedById || reportBefore.inspectorId,
            },
          });
        }

        // Create approval record
        const stepMap: Record<string, string> = {
          submitted: 'supervisor_review',
          supervisor_review: 'supervisor_review',
          manager_approval: 'manager_approval',
          approved: 'manager_approval',
          draft: 'draft',
        };
        const step = stepMap[newStatus] || newStatus;
        await db.irmApproval.create({
          data: {
            reportId: id,
            step,
            status: newStatus === 'approved' ? 'approved' : newStatus === 'draft' ? 'rejected' : 'pending',
            userId: updateData.assessedById || (await db.irmReport.findUnique({ where: { id }, select: { inspectorId: true } }))?.inspectorId || '',
            comment: updateData.statusComment || `Status changed to ${newStatus}`,
          },
        });
      }
      updateData.status = newStatus;
    }

    const report = await db.irmReport.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(report);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update report';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = verifyRouteAuth(request, { feature: 'irms' });
  if (auth.error) return auth.error;
  try {
    const { id } = await params;

    await db.irmReport.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete report';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}