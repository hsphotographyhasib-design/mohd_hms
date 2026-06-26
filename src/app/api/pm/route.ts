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
    const frequency = request.nextUrl.searchParams.get('frequency') || '';
    const skip = (page - 1) * pageSize;

    const where: Prisma.PmScheduleWhereInput = { tenantId };
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (status) where.status = status;
    if (frequency) where.frequency = frequency;

    const [items, total] = await Promise.all([
      db.pmSchedule.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { nextDueDate: 'asc' },
        include: {
          equipment: { select: { name: true } },
          assignedTo: { select: { name: true } },
        },
      }),
      db.pmSchedule.count({ where }),
    ]);

    const data = items.map((pm) => ({
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
    }));

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('PM list error:', error);
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
    const body = await request.json();
    const { equipmentId, title, description, frequency, customDays, lastExecuted, nextDueDate, assignedToId, checklistTemplateId } = body;

    if (!equipmentId || !title || !nextDueDate) {
      return NextResponse.json({ error: 'Equipment, title, and nextDueDate are required' }, { status: 400 });
    }

    const pmSchedule = await db.pmSchedule.create({
      data: {
        tenantId,
        equipmentId,
        title,
        description: description || null,
        frequency: frequency || 'monthly',
        customDays: customDays || null,
        lastExecuted: lastExecuted ? new Date(lastExecuted) : null,
        nextDueDate: new Date(nextDueDate),
        assignedToId: assignedToId || null,
        checklistTemplateId: checklistTemplateId || null,
        status: 'active',
      },
      include: {
        equipment: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
    });

    return NextResponse.json({
      id: pmSchedule.id,
      tenantId: pmSchedule.tenantId,
      equipmentId: pmSchedule.equipmentId,
      equipmentName: pmSchedule.equipment.name,
      title: pmSchedule.title,
      description: pmSchedule.description,
      frequency: pmSchedule.frequency,
      customDays: pmSchedule.customDays,
      lastExecuted: pmSchedule.lastExecuted?.toISOString(),
      nextDueDate: pmSchedule.nextDueDate.toISOString(),
      assignedToId: pmSchedule.assignedToId,
      assignedToName: pmSchedule.assignedTo?.name,
      status: pmSchedule.status,
      createdAt: pmSchedule.createdAt.toISOString(),
      updatedAt: pmSchedule.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('PM create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
