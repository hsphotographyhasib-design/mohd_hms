import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { ensureTableSync } from '@/lib/db-sync';
import type { Prisma } from '@prisma/client';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Auto-sync schema columns so Prisma queries don't fail on missing columns
    await ensureTableSync('Complaint');

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
      customerName: c.customer?.name,
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
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Failed to load complaints', details: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Auto-sync schema columns before creating
    await ensureTableSync('Complaint');

    const tenantId = payload.tenantId as string;
    const body = await request.json();
    const { customerId, equipmentId, title, description, priority, category, photos, gpsLocation, assignedToId, supervisorId, source, customerSnapshot, locationInfo } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!description?.trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }
    if (!customerId) {
      return NextResponse.json({ error: 'Customer is required' }, { status: 400 });
    }

    // ─── Security: Customer-role users can only create complaints for themselves ───
    if (payload.role === 'customer') {
      const user = await db.user.findUnique({
        where: { id: payload.userId as string },
        select: { id: true, email: true, phone: true },
      });
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });

      const linkedCustomer = await db.customer.findFirst({
        where: {
          tenantId,
          id: customerId,
          OR: [
            ...(user.email ? [{ email: user.email }] : []),
            ...(user.phone ? [{ phone: user.phone }] : []),
          ],
        },
        select: { id: true },
      });
      if (!linkedCustomer) {
        return NextResponse.json({ error: 'You can only create complaints for your own account' }, { status: 403 });
      }
    }

    // Generate complaint number: CMP/YYYY/NNNNNN
    const now = new Date();
    const year = now.getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);

    const countThisYear = await db.complaint.count({
      where: {
        tenantId,
        createdAt: { gte: yearStart, lt: yearEnd },
      },
    });
    const complaintNumber = `CMP/${year}/${String(countThisYear + 1).padStart(6, '0')}`;

    // Build creation data
    const createData: Record<string, unknown> = {
      tenantId,
      customerId,
      equipmentId: equipmentId || null,
      title: title.trim(),
      description: description.trim(),
      priority: priority || 'medium',
      status: 'NEW',
      source: source || 'admin',
      category: category || null,
      photos: photos ? JSON.stringify(photos) : null,
      gpsLocation: gpsLocation ? JSON.stringify(gpsLocation) : null,
      assignedToId: assignedToId || null,
      supervisorId: supervisorId || null,
    };

    // Store customer snapshot for historical accuracy
    if (customerSnapshot) {
      createData.customerSnapshot = JSON.stringify(customerSnapshot);
    }
    // Store location info (building, floor, unit, room, etc.)
    if (locationInfo) {
      createData.locationInfo = JSON.stringify(locationInfo);
    }

    const complaint = await db.complaint.create({
      data: createData,
      include: {
        customer: { select: { name: true } },
        equipment: { select: { name: true } },
        assignedTo: { select: { name: true } },
        supervisor: { select: { name: true } },
      },
    });

    return NextResponse.json({
      id: complaint.id,
      complaintNumber,
      tenantId: complaint.tenantId,
      customerId: complaint.customerId,
      customerName: complaint.customer?.name,
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
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Failed to create complaint', details: msg }, { status: 500 });
  }
}