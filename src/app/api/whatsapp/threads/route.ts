import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import type { Prisma } from '@prisma/client';
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
    const assigned = req.nextUrl.searchParams.get('assigned') || '';
    const sessionId = req.nextUrl.searchParams.get('sessionId') || '';
    const skip = (page - 1) * pageSize;

    const where: Prisma.ConversationThreadWhereInput = { tenantId };
    if (status) where.status = status;
    if (assigned === 'me') where.assignedToId = payload.userId as string;
    else if (assigned === 'unassigned') where.assignedToId = null;
    else if (assigned) where.assignedToId = assigned;
    if (sessionId) where.sessionId = sessionId;

    const [items, total] = await Promise.all([
      db.conversationThread.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { lastMessageAt: 'desc' },
        include: {
          session: {
            select: {
              phoneNumber: true,
              customer: { select: { name: true, phone: true } },
            },
          },
          assignedTo: { select: { id: true, name: true, avatar: true } },
          customer: { select: { id: true, name: true, phone: true } },
        },
      }),
      db.conversationThread.count({ where }),
    ]);

    const data = items.map((t) => ({
      id: t.id,
      tenantId: t.tenantId,
      sessionId: t.sessionId,
      customerId: t.customerId,
      subject: t.subject,
      status: t.status,
      assignedToId: t.assignedToId,
      assignedToName: t.assignedTo?.name || null,
      assignedToAvatar: t.assignedTo?.avatar || null,
      lastMessageAt: t.lastMessageAt.toISOString(),
      messageCount: t.messageCount,
      customerName: t.customer?.name || t.session?.customer?.name || null,
      customerPhone: t.customer?.phone || t.session?.phoneNumber || null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('WhatsApp threads list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const body = await req.json();
    const { sessionId, subject, assignedToId, customerId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Verify session belongs to tenant
    const session = await db.whatsAppSession.findFirst({ where: { id: sessionId, tenantId } });
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const thread = await db.conversationThread.create({
      data: {
        tenantId,
        sessionId,
        customerId: customerId || session.customerId || null,
        subject: subject || null,
        status: 'active',
        assignedToId: assignedToId || null,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      id: thread.id,
      tenantId: thread.tenantId,
      sessionId: thread.sessionId,
      customerId: thread.customerId,
      subject: thread.subject,
      status: thread.status,
      assignedToId: thread.assignedToId,
      assignedToName: thread.assignedTo?.name || null,
      lastMessageAt: thread.lastMessageAt.toISOString(),
      messageCount: thread.messageCount,
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('WhatsApp thread create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}