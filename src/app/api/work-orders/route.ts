import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20');
    const search = request.nextUrl.searchParams.get('search') || '';
    const status = request.nextUrl.searchParams.get('status') || '';
    const type = request.nextUrl.searchParams.get('type') || '';
    const skip = (page - 1) * pageSize;

    const where: Prisma.WorkOrderWhereInput = { tenantId };
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (status) where.status = status;
    if (type) where.type = type;

    const [items, total] = await Promise.all([
      db.workOrder.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          assignedTo: { select: { name: true } },
          equipment: { select: { name: true } },
          creator: { select: { name: true } },
          materials: {
            include: { inventoryItem: { select: { name: true } } },
          },
        },
      }),
      db.workOrder.count({ where }),
    ]);

    const data = items.map((wo) => ({
      id: wo.id,
      tenantId: wo.tenantId,
      complaintId: wo.complaintId,
      equipmentId: wo.equipmentId,
      equipmentName: wo.equipment?.name,
      title: wo.title,
      description: wo.description,
      status: wo.status,
      priority: wo.priority,
      type: wo.type,
      assignedToId: wo.assignedToId,
      assignedToName: wo.assignedTo?.name,
      createdBy: wo.createdBy,
      creatorName: wo.creator?.name,
      scheduledDate: wo.scheduledDate?.toISOString(),
      startedAt: wo.startedAt?.toISOString(),
      completedAt: wo.completedAt?.toISOString(),
      laborHours: wo.laborHours,
      laborCost: wo.laborCost,
      materialCost: wo.materialCost,
      totalCost: wo.totalCost,
      notes: wo.notes,
      photos: wo.photos,
      checklistData: wo.checklistData,
      technicianSignature: wo.technicianSignature,
      customerSignature: wo.customerSignature,
      createdAt: wo.createdAt.toISOString(),
      updatedAt: wo.updatedAt.toISOString(),
      materials: wo.materials.map((m) => ({
        id: m.id,
        workOrderId: m.workOrderId,
        inventoryItemId: m.inventoryItemId,
        itemName: m.inventoryItem.name,
        quantity: m.quantity,
        unitCost: m.unitCost,
        totalCost: m.totalCost,
      })),
    }));

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Work orders list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const userId = payload.userId as string;
    const body = await request.json();
    const { complaintId, equipmentId, title, description, priority, type, assignedToId, scheduledDate, notes } = body;

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    const workOrder = await db.workOrder.create({
      data: {
        tenantId,
        complaintId: complaintId || null,
        equipmentId: equipmentId || null,
        title,
        description,
        status: 'PENDING',
        priority: priority || 'medium',
        type: type || 'corrective',
        assignedToId: assignedToId || null,
        createdBy: userId,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        notes: notes || null,
      },
      include: {
        assignedTo: { select: { name: true } },
        equipment: { select: { name: true } },
        creator: { select: { name: true } },
      },
    });

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
      createdAt: workOrder.createdAt.toISOString(),
      updatedAt: workOrder.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Work order create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
