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
    const { id: reportId } = await params;

    const revisions = await db.irmRevision.findMany({
      where: { reportId },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
      orderBy: { version: 'desc' },
    });

    return NextResponse.json(revisions);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch revisions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = verifyRouteAuth(request, { feature: 'irms' });
  if (auth.error) return auth.error;
  try {
    const { id: reportId } = await params;
    const { version } = await request.json() as { version: number };

    const revision = await db.irmRevision.findFirst({
      where: { reportId, version },
    });

    if (!revision) {
      return NextResponse.json({ error: 'Revision not found' }, { status: 404 });
    }

    // Parse snapshot and update report fields
    const snapshot = JSON.parse(revision.snapshot);
    /* eslint-disable no-unused-vars */
    const {
      id: _id, number: _number, project: _project, inspector: _inspector,
      assessedBy: _assessedBy, photos: _photos, revisions: _revisions,
      approvals: _approvals, activities: _activities, createdAt: _createdAt, updatedAt: _updatedAt,
      ...restorableFields
    } = snapshot;
    /* eslint-enable no-unused-vars */

    const updated = await db.irmReport.update({
      where: { id: reportId },
      data: restorableFields,
    });

    // Create activity
    await db.irmActivity.create({
      data: {
        type: 'revision_rollback',
        description: `Rolled back report to version ${version}`,
        reportId,
        projectId: updated.projectId,
        userId: revision.userId,
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Rollback failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}