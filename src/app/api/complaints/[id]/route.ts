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

    const complaint = await db.complaint.findFirst({
      where: { id, tenantId },
      include: {
        customer: { select: { name: true } },
        equipment: { select: { name: true } },
        assignedTo: { select: { name: true } },
        supervisor: { select: { name: true } },
        workOrders: {
          include: {
            assignedTo: { select: { name: true } },
            equipment: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!complaint) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: complaint.id,
      tenantId: complaint.tenantId,
      customerId: complaint.customerId,
      customerName: complaint.customer.name,
      equipmentId: complaint.equipmentId,
      equipmentName: complaint.equipment?.name,
      title: complaint.title,
      description: complaint.description,
      priority: complaint.priority,
      status: complaint.status,
      category: complaint.category,
      photos: complaint.photos,
      gpsLocation: complaint.gpsLocation,
      assignedToId: complaint.assignedToId,
      assignedToName: complaint.assignedTo?.name,
      supervisorId: complaint.supervisorId,
      supervisorName: complaint.supervisor?.name,
      resolutionNotes: complaint.resolutionNotes,
      customerRating: complaint.customerRating,
      customerFeedback: complaint.customerFeedback,
      resolvedAt: complaint.resolvedAt?.toISOString(),
      closedAt: complaint.closedAt?.toISOString(),
      createdAt: complaint.createdAt.toISOString(),
      updatedAt: complaint.updatedAt.toISOString(),
      workOrders: complaint.workOrders.map((wo) => ({
        id: wo.id,
        tenantId: wo.tenantId,
        title: wo.title,
        description: wo.description,
        status: wo.status,
        priority: wo.priority,
        type: wo.type,
        assignedToId: wo.assignedToId,
        assignedToName: wo.assignedTo?.name,
        equipmentName: wo.equipment?.name,
        totalCost: wo.totalCost,
        createdAt: wo.createdAt.toISOString(),
        updatedAt: wo.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Complaint get error:', error);
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

    const existing = await db.complaint.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });

    // Build update data with timestamp logic
    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.category !== undefined) updateData.category = body.category || null;
    if (body.photos !== undefined) updateData.photos = body.photos || null;
    if (body.gpsLocation !== undefined) updateData.gpsLocation = body.gpsLocation || null;
    if (body.resolutionNotes !== undefined) updateData.resolutionNotes = body.resolutionNotes || null;
    if (body.customerRating !== undefined) updateData.customerRating = body.customerRating || null;
    if (body.customerFeedback !== undefined) updateData.customerFeedback = body.customerFeedback || null;

    // Handle status transitions
    if (body.status) {
      updateData.status = body.status;
      if (body.status === 'RESOLVED') updateData.resolvedAt = new Date();
      if (body.status === 'CLOSED') updateData.closedAt = new Date();
      if (body.status === 'ASSIGNED') updateData.assignedToId = body.assignedToId || null;
      if (body.status === 'IN_PROGRESS') {
        if (body.assignedToId) updateData.assignedToId = body.assignedToId;
      }
    }
    if (body.assignedToId !== undefined && !body.status) updateData.assignedToId = body.assignedToId || null;
    if (body.supervisorId !== undefined) updateData.supervisorId = body.supervisorId || null;

    const updated = await db.complaint.update({
      where: { id },
      data: updateData,
      include: {
        customer: { select: { name: true } },
        equipment: { select: { name: true } },
        assignedTo: { select: { name: true } },
        supervisor: { select: { name: true } },
      },
    });

    return NextResponse.json({
      id: updated.id,
      tenantId: updated.tenantId,
      customerId: updated.customerId,
      customerName: updated.customer.name,
      equipmentId: updated.equipmentId,
      equipmentName: updated.equipment?.name,
      title: updated.title,
      description: updated.description,
      priority: updated.priority,
      status: updated.status,
      category: updated.category,
      assignedToId: updated.assignedToId,
      assignedToName: updated.assignedTo?.name,
      supervisorId: updated.supervisorId,
      supervisorName: updated.supervisor?.name,
      resolutionNotes: updated.resolutionNotes,
      customerRating: updated.customerRating,
      resolvedAt: updated.resolvedAt?.toISOString(),
      closedAt: updated.closedAt?.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Complaint update error:', error);
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

    const existing = await db.complaint.findFirst({ where: { id, tenantId } });
    if (!existing) return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });

    await db.complaint.delete({ where: { id } });
    return NextResponse.json({ message: 'Complaint deleted successfully' });
  } catch (error) {
    console.error('Complaint delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
