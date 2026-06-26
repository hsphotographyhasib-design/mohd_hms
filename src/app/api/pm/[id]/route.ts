import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const { id } = await params;

    const pm = await db.pmSchedule.findFirst({
      where: { id, tenantId },
      include: {
        equipment: { select: { name: true, category: true } },
        assignedTo: { select: { name: true } },
      },
    });

    if (!pm) {
      return NextResponse.json({ error: 'PM schedule not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: pm.id,
      tenantId: pm.tenantId,
      equipmentId: pm.equipmentId,
      equipmentName: pm.equipment.name,
      title: pm.title,
      description: pm.description,
      frequency: pm.frequency,
      customDays: pm.customDays,
      lastExecuted: pm.lastExecuted?.toISOString(),
      nextDueDate: pm.nextDueDate.toISOString(),
      assignedToId: pm.assignedToId,
      assignedToName: pm.assignedTo?.name,
      status: pm.status,
      checklistTemplateId: pm.checklistTemplateId,
      createdAt: pm.createdAt.toISOString(),
      updatedAt: pm.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('PM get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const { id } = await params;
    const body = await request.json();

    const existing = await db.pmSchedule.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'PM schedule not found' }, { status: 404 });

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.frequency !== undefined) updateData.frequency = body.frequency;
    if (body.customDays !== undefined) updateData.customDays = body.customDays || null;
    if (body.lastExecuted !== undefined) updateData.lastExecuted = body.lastExecuted ? new Date(body.lastExecuted) : null;
    if (body.nextDueDate !== undefined) updateData.nextDueDate = new Date(body.nextDueDate);
    if (body.assignedToId !== undefined) updateData.assignedToId = body.assignedToId || null;
    if (body.checklistTemplateId !== undefined) updateData.checklistTemplateId = body.checklistTemplateId || null;
    if (body.status) updateData.status = body.status;

    const updated = await db.pmSchedule.update({
      where: { id },
      data: updateData,
      include: {
        equipment: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
    });

    return NextResponse.json({
      id: updated.id,
      tenantId: updated.tenantId,
      equipmentId: updated.equipmentId,
      equipmentName: updated.equipment.name,
      title: updated.title,
      description: updated.description,
      frequency: updated.frequency,
      customDays: updated.customDays,
      lastExecuted: updated.lastExecuted?.toISOString(),
      nextDueDate: updated.nextDueDate.toISOString(),
      assignedToId: updated.assignedToId,
      assignedToName: updated.assignedTo?.name,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('PM update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const { id } = await params;

    const existing = await db.pmSchedule.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'PM schedule not found' }, { status: 404 });

    await db.pmSchedule.delete({ where: { id } });
    return NextResponse.json({ message: 'PM schedule deleted successfully' });
  } catch (error) {
    console.error('PM delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
