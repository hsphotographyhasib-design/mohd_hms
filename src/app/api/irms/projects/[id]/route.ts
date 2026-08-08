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

    const project = await db.irmProject.findUnique({
      where: { id },
      include: {
        reports: {
          select: {
            id: true,
            number: true,
            status: true,
            priority: true,
            inspectionDate: true,
            inspectorId: true,
            _count: { select: { photos: true } },
          },
          orderBy: { inspectionDate: 'desc' },
        },
        _count: { select: { reports: true } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch project';
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

    const project = await db.irmProject.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(project);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update project';
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

    await db.irmProject.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}