import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q') || '';
    const status = req.nextUrl.searchParams.get('status') || '';
    const priority = req.nextUrl.searchParams.get('priority') || '';
    const category = req.nextUrl.searchParams.get('category') || '';
    const projectId = req.nextUrl.searchParams.get('projectId') || '';

    const where: Record<string, unknown> = {};
    if (q) {
      where.OR = [
        { number: { contains: q } },
        { taskDescription: { contains: q } },
        { observation: { contains: q } },
        { building: { contains: q } },
        { room: { contains: q } },
      ];
    }
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (projectId) where.projectId = projectId;
    if (category) {
      where.photos = { some: { type: category } };
    }

    const reports = await db.irmReport.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, number: true } },
        inspector: { select: { id: true, name: true, role: true } },
        _count: { select: { photos: true } },
      },
      orderBy: { inspectionDate: 'desc' },
    });

    return NextResponse.json(reports);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch reports';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Auto-generate report number
    const count = await db.irmReport.count();
    const number = `IR-2024-${String(count + 1).padStart(4, '0')}`;

    const report = await db.irmReport.create({
      data: {
        ...body,
        number,
      },
    });

    // Create activity
    await db.irmActivity.create({
      data: {
        type: 'report_created',
        description: `Created inspection report ${number}`,
        userId: body.inspectorId,
        reportId: report.id,
        projectId: body.projectId,
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create report';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}