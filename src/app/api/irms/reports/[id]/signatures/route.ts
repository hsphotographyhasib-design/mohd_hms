import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json() as {
      inspectorSign?: string;
      supervisorSign?: string;
      managerSign?: string;
      clientSign?: string;
    };

    const updateData: Record<string, unknown> = {};
    if (body.inspectorSign !== undefined) updateData.inspectorSign = body.inspectorSign;
    if (body.supervisorSign !== undefined) updateData.supervisorSign = body.supervisorSign;
    if (body.managerSign !== undefined) updateData.managerSign = body.managerSign;
    if (body.clientSign !== undefined) updateData.clientSign = body.clientSign;

    const report = await db.irmReport.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(report);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update signatures';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}