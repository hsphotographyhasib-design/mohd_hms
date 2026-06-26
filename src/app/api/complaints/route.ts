import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import type { Prisma } from '@prisma/client';
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
    const priority = request.nextUrl.searchParams.get('priority') || '';
    const skip = (page - 1) * pageSize;

    const where: Prisma.ComplaintWhereInput = { tenantId };
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const [items, total] = await Promise.all([
      db.complaint.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true } },
          equipment: { select: { name: true } },
          assignedTo: { select: { name: true } },
          supervisor: { select: { name: true } },
        },
      }),
      db.complaint.count({ where }),
    ]);

    const data = items.map((c) => ({
      id: c.id,
      tenantId: c.tenantId,
      customerId: c.customerId,
      customerName: c.customer.name,
      equipmentId: c.equipmentId,
      equipmentName: c.equipment?.name,
      title: c.title,
      description: c.description,
      priority: c.priority,
      status: c.status,
      category: c.category,
      photos: c.photos,
      assignedToId: c.assignedToId,
      assignedToName: c.assignedTo?.name,
      supervisorId: c.supervisorId,
      supervisorName: c.supervisor?.name,
      resolutionNotes: c.resolutionNotes,
      customerRating: c.customerRating,
      customerFeedback: c.customerFeedback,
      resolvedAt: c.resolvedAt?.toISOString(),
      closedAt: c.closedAt?.toISOString(),
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Complaints list error:', error);
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
    const { customerId, equipmentId, title, description, priority, category, photos, gpsLocation, assignedToId, supervisorId } = body;

    if (!customerId || !title || !description) {
      return NextResponse.json({ error: 'Customer, title, and description are required' }, { status: 400 });
    }

    const complaint = await db.complaint.create({
      data: {
        tenantId,
        customerId,
        equipmentId: equipmentId || null,
        title,
        description,
        priority: priority || 'medium',
        status: 'NEW',
        category: category || null,
        photos: photos || null,
        gpsLocation: gpsLocation || null,
        assignedToId: assignedToId || null,
        supervisorId: supervisorId || null,
      },
      include: {
        customer: { select: { name: true } },
        equipment: { select: { name: true } },
        assignedTo: { select: { name: true } },
        supervisor: { select: { name: true } },
      },
    });

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
      assignedToId: complaint.assignedToId,
      assignedToName: complaint.assignedTo?.name,
      supervisorId: complaint.supervisorId,
      supervisorName: complaint.supervisor?.name,
      createdAt: complaint.createdAt.toISOString(),
      updatedAt: complaint.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Complaint create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
