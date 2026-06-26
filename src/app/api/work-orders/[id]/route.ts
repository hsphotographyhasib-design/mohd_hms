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

    const workOrder = await db.workOrder.findFirst({
      where: { id, tenantId },
      include: {
        assignedTo: { select: { name: true } },
        equipment: { select: { name: true } },
        creator: { select: { name: true } },
        materials: {
          include: { inventoryItem: { select: { name: true } } },
        },
      },
    });

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: workOrder.id,
      tenantId: workOrder.tenantId,
      complaintId: workOrder.complaintId,
      equipmentId: workOrder.equipmentId,
      equipmentName: workOrder.equipment?.name,
      title: workOrder.title,
      description: workOrder.description,
      status: workOrder.status,
      priority: workOrder.priority,
      type: workOrder.type,
      assignedToId: workOrder.assignedToId,
      assignedToName: workOrder.assignedTo?.name,
      createdBy: workOrder.createdBy,
      creatorName: workOrder.creator?.name,
      scheduledDate: workOrder.scheduledDate?.toISOString(),
      startedAt: workOrder.startedAt?.toISOString(),
      completedAt: workOrder.completedAt?.toISOString(),
      laborHours: workOrder.laborHours,
      laborCost: workOrder.laborCost,
      materialCost: workOrder.materialCost,
      totalCost: workOrder.totalCost,
      notes: workOrder.notes,
      photos: workOrder.photos,
      checklistData: workOrder.checklistData,
      technicianSignature: workOrder.technicianSignature,
      customerSignature: workOrder.customerSignature,
      checkInGps: workOrder.checkInGps,
      checkOutGps: workOrder.checkOutGps,
      createdAt: workOrder.createdAt.toISOString(),
      updatedAt: workOrder.updatedAt.toISOString(),
      materials: workOrder.materials.map((m) => ({
        id: m.id,
        workOrderId: m.workOrderId,
        inventoryItemId: m.inventoryItemId,
        itemName: m.inventoryItem.name,
        quantity: m.quantity,
        unitCost: m.unitCost,
        totalCost: m.totalCost,
      })),
    });
  } catch (error) {
    console.error('Work order get error:', error);
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

    const existing = await db.workOrder.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Work order not found' }, { status: 404 });

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.assignedToId !== undefined) updateData.assignedToId = body.assignedToId || null;
    if (body.equipmentId !== undefined) updateData.equipmentId = body.equipmentId || null;
    if (body.scheduledDate !== undefined) updateData.scheduledDate = body.scheduledDate ? new Date(body.scheduledDate) : null;
    if (body.notes !== undefined) updateData.notes = body.notes || null;
    if (body.photos !== undefined) updateData.photos = body.photos || null;
    if (body.checklistData !== undefined) updateData.checklistData = body.checklistData || null;
    if (body.technicianSignature !== undefined) updateData.technicianSignature = body.technicianSignature || null;
    if (body.customerSignature !== undefined) updateData.customerSignature = body.customerSignature || null;
    if (body.checkInGps !== undefined) updateData.checkInGps = body.checkInGps || null;
    if (body.checkOutGps !== undefined) updateData.checkOutGps = body.checkOutGps || null;
    if (body.laborHours !== undefined) updateData.laborHours = body.laborHours || null;
    if (body.laborCost !== undefined) updateData.laborCost = body.laborCost || null;
    if (body.materialCost !== undefined) updateData.materialCost = body.materialCost || null;
    if (body.totalCost !== undefined) updateData.totalCost = body.totalCost || null;

    if (body.status) {
      updateData.status = body.status;
      if (body.status === 'IN_PROGRESS') updateData.startedAt = new Date();
      if (body.status === 'COMPLETED') updateData.completedAt = new Date();
    }

    const updated = await db.workOrder.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: { select: { name: true } },
        equipment: { select: { name: true } },
        creator: { select: { name: true } },
      },
    });

    return NextResponse.json({
      id: updated.id,
      tenantId: updated.tenantId,
      complaintId: updated.complaintId,
      equipmentId: updated.equipmentId,
      equipmentName: updated.equipment?.name,
      title: updated.title,
      description: updated.description,
      status: updated.status,
      priority: updated.priority,
      type: updated.type,
      assignedToId: updated.assignedToId,
      assignedToName: updated.assignedTo?.name,
      createdBy: updated.createdBy,
      creatorName: updated.creator?.name,
      scheduledDate: updated.scheduledDate?.toISOString(),
      startedAt: updated.startedAt?.toISOString(),
      completedAt: updated.completedAt?.toISOString(),
      laborHours: updated.laborHours,
      laborCost: updated.laborCost,
      materialCost: updated.materialCost,
      totalCost: updated.totalCost,
      notes: updated.notes,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Work order update error:', error);
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

    const existing = await db.workOrder.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Work order not found' }, { status: 404 });

    await db.workOrder.delete({ where: { id } });
    return NextResponse.json({ message: 'Work order deleted successfully' });
  } catch (error) {
    console.error('Work order delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
