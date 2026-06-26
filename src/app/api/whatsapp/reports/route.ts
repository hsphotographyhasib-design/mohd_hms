import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(req.nextUrl.searchParams.get('pageSize') || '20');
    const status = req.nextUrl.searchParams.get('status') || '';
    const type = req.nextUrl.searchParams.get('type') || '';
    const priority = req.nextUrl.searchParams.get('priority') || '';
    const skip = (page - 1) * pageSize;

    const where: Prisma.CustomerReportWhereInput = { tenantId };
    if (status) where.status = status;
    if (type) where.type = type;
    if (priority) where.priority = priority;

    const [items, total] = await Promise.all([
      db.customerReport.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, phone: true, companyName: true } },
          resolvedBy: { select: { id: true, name: true } },
        },
      }),
      db.customerReport.count({ where }),
    ]);

    const data = items.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      customerId: r.customerId,
      customerName: r.customer?.name || null,
      customerPhone: r.customer?.phone || null,
      customerCompany: r.customer?.companyName || null,
      sessionId: r.sessionId,
      type: r.type,
      subject: r.subject,
      description: r.description,
      priority: r.priority,
      status: r.status,
      resolvedById: r.resolvedById,
      resolvedByName: r.resolvedBy?.name || null,
      resolvedAt: r.resolvedAt?.toISOString() || null,
      resolutionNotes: r.resolutionNotes,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('WhatsApp reports list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const userId = payload.userId as string;
    const body = await req.json();
    const { id, status, resolutionNotes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 });
    }

    const report = await db.customerReport.findFirst({ where: { id, tenantId } });
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (status) {
      const valid = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'];
      if (!valid.includes(status)) {
        return NextResponse.json({ error: `Invalid status. Use: ${valid.join(', ')}` }, { status: 400 });
      }
      data.status = status;
      if (status === 'RESOLVED' || status === 'DISMISSED') {
        data.resolvedById = userId;
        data.resolvedAt = new Date();
      }
    }
    if (resolutionNotes !== undefined) data.resolutionNotes = resolutionNotes;

    const updated = await db.customerReport.update({
      where: { id },
      data,
      include: {
        customer: { select: { name: true, phone: true } },
        resolvedBy: { select: { name: true } },
      },
    });

    return NextResponse.json({
      id: updated.id,
      tenantId: updated.tenantId,
      customerId: updated.customerId,
      customerName: updated.customer?.name || null,
      sessionId: updated.sessionId,
      type: updated.type,
      subject: updated.subject,
      description: updated.description,
      priority: updated.priority,
      status: updated.status,
      resolvedById: updated.resolvedById,
      resolvedByName: updated.resolvedBy?.name || null,
      resolvedAt: updated.resolvedAt?.toISOString() || null,
      resolutionNotes: updated.resolutionNotes,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('WhatsApp report resolve error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}