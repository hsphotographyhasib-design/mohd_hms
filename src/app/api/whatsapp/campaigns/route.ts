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
    const skip = (page - 1) * pageSize;

    const where: Prisma.BroadcastLogWhereInput = { tenantId };
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      db.broadcastLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          template: { select: { id: true, name: true, category: true } },
        },
      }),
      db.broadcastLog.count({ where }),
    ]);

    const data = items.map((b) => ({
      id: b.id,
      tenantId: b.tenantId,
      title: b.title,
      content: b.content,
      templateId: b.templateId,
      templateName: b.template?.name || null,
      templateCategory: b.template?.category || null,
      recipientCount: b.recipientCount,
      sentCount: b.sentCount,
      deliveredCount: b.deliveredCount,
      failedCount: b.failedCount,
      readCount: b.readCount,
      status: b.status,
      scheduledAt: b.scheduledAt?.toISOString() || null,
      sentAt: b.sentAt?.toISOString() || null,
      completedAt: b.completedAt?.toISOString() || null,
      createdBy: b.createdBy,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('WhatsApp campaigns list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const userId = payload.userId as string;
    const body = await req.json();
    const { title, content, templateId, recipientCount, scheduledAt } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const broadcast = await db.broadcastLog.create({
      data: {
        tenantId,
        title,
        content,
        templateId: templateId || null,
        recipientCount: recipientCount || 0,
        status: scheduledAt ? 'scheduled' : 'draft',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        createdBy: userId,
      },
    });

    return NextResponse.json({
      id: broadcast.id,
      tenantId: broadcast.tenantId,
      title: broadcast.title,
      content: broadcast.content,
      templateId: broadcast.templateId,
      recipientCount: broadcast.recipientCount,
      sentCount: broadcast.sentCount,
      deliveredCount: broadcast.deliveredCount,
      failedCount: broadcast.failedCount,
      readCount: broadcast.readCount,
      status: broadcast.status,
      scheduledAt: broadcast.scheduledAt?.toISOString() || null,
      sentAt: broadcast.sentAt?.toISOString() || null,
      completedAt: broadcast.completedAt?.toISOString() || null,
      createdBy: broadcast.createdBy,
      createdAt: broadcast.createdAt.toISOString(),
      updatedAt: broadcast.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('WhatsApp campaign create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}