import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import type { Prisma } from '@prisma/client';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const { id } = await params;

    const thread = await db.conversationThread.findFirst({
      where: { id, tenantId },
      include: {
        session: {
          select: {
            id: true,
            phoneNumber: true,
            state: true,
            customer: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
        assignedTo: { select: { id: true, name: true, avatar: true, role: true } },
        customer: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // Get messages for this thread
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(req.nextUrl.searchParams.get('pageSize') || '50');
    const skip = (page - 1) * pageSize;

    const [messages, messageTotal] = await Promise.all([
      db.whatsAppMessage.findMany({
        where: { threadId: id, tenantId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'asc' },
      }),
      db.whatsAppMessage.count({ where: { threadId: id, tenantId } }),
    ]);

    return NextResponse.json({
      thread: {
        id: thread.id,
        tenantId: thread.tenantId,
        sessionId: thread.sessionId,
        customerId: thread.customerId,
        subject: thread.subject,
        status: thread.status,
        assignedToId: thread.assignedToId,
        assignedToName: thread.assignedTo?.name || null,
        assignedToAvatar: thread.assignedTo?.avatar || null,
        lastMessageAt: thread.lastMessageAt.toISOString(),
        messageCount: thread.messageCount,
        createdAt: thread.createdAt.toISOString(),
        updatedAt: thread.updatedAt.toISOString(),
      },
      session: thread.session ? {
        id: thread.session.id,
        phoneNumber: thread.session.phoneNumber,
        state: thread.session.state,
        customerName: thread.session.customer?.name || null,
        customerPhone: thread.session.customer?.phone || null,
      } : null,
      customer: thread.customer ? {
        id: thread.customer.id,
        name: thread.customer.name,
        phone: thread.customer.phone,
        email: thread.customer.email,
      } : null,
      messages: messages.map((m) => ({
        id: m.id,
        direction: m.direction,
        messageType: m.messageType,
        content: m.content,
        mediaUrl: m.mediaUrl,
        mediaType: m.mediaType,
        caption: m.caption,
        status: m.status,
        isFromBot: m.isFromBot,
        isTemplate: m.isTemplate,
        createdAt: m.createdAt.toISOString(),
      })),
      pagination: {
        total: messageTotal,
        page,
        pageSize,
        totalPages: Math.ceil(messageTotal / pageSize),
      },
    });
  } catch (error) {
    console.error('WhatsApp thread detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const { id } = await params;
    const body = await req.json();

    const thread = await db.conversationThread.findFirst({ where: { id, tenantId } });
    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.status !== undefined) {
      const validStatuses = ['active', 'resolved', 'archived'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status. Use: active, resolved, archived' }, { status: 400 });
      }
      data.status = body.status;
    }
    if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId || null;
    if (body.subject !== undefined) data.subject = body.subject;

    const updated = await db.conversationThread.update({
      where: { id },
      data,
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    return NextResponse.json({
      id: updated.id,
      tenantId: updated.tenantId,
      sessionId: updated.sessionId,
      customerId: updated.customerId,
      subject: updated.subject,
      status: updated.status,
      assignedToId: updated.assignedToId,
      assignedToName: updated.assignedTo?.name || null,
      lastMessageAt: updated.lastMessageAt.toISOString(),
      messageCount: updated.messageCount,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('WhatsApp thread update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}