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

    const session = await db.whatsAppSession.findFirst({
      where: { id, tenantId },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true, companyName: true } },
        config: { select: { provider: true, isEnabled: true, openwaStatus: true } },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(req.nextUrl.searchParams.get('pageSize') || '50');
    const threadId = req.nextUrl.searchParams.get('threadId') || '';
    const skip = (page - 1) * pageSize;

    const msgWhere: Prisma.WhatsAppMessageWhereInput = { sessionId: id, tenantId };
    if (threadId) msgWhere.threadId = threadId;

    const [messages, messageTotal] = await Promise.all([
      db.whatsAppMessage.findMany({
        where: msgWhere,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'asc' },
      }),
      db.whatsAppMessage.count({ where: msgWhere }),
    ]);

    // Get threads for this session
    const threads = await db.conversationThread.findMany({
      where: { sessionId: id, tenantId },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      session: {
        id: session.id,
        tenantId: session.tenantId,
        configId: session.configId,
        phoneNumber: session.phoneNumber,
        customerId: session.customerId,
        customerName: session.customer?.name || null,
        customerPhone: session.customer?.phone || null,
        customerEmail: session.customer?.email || null,
        customerCompany: session.customer?.companyName || null,
        sessionId: session.sessionId,
        state: session.state,
        stateData: session.stateData,
        lastMessageAt: session.lastMessageAt.toISOString(),
        messageCount: session.messageCount,
        isActive: session.isActive,
        isBlocked: session.isBlocked,
        provider: session.config.provider,
        configEnabled: session.config.isEnabled,
        connectionStatus: session.config.openwaStatus,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      },
      messages: messages.map((m) => ({
        id: m.id,
        tenantId: m.tenantId,
        sessionId: m.sessionId,
        threadId: m.threadId,
        direction: m.direction,
        messageType: m.messageType,
        content: m.content,
        mediaUrl: m.mediaUrl,
        mediaType: m.mediaType,
        thumbnailUrl: m.thumbnailUrl,
        caption: m.caption,
        location: m.location,
        fromNumber: m.fromNumber,
        toNumber: m.toNumber,
        providerMessageId: m.providerMessageId,
        status: m.status,
        errorMessage: m.errorMessage,
        isFromBot: m.isFromBot,
        isTemplate: m.isTemplate,
        metadata: m.metadata,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      })),
      messagesPagination: {
        total: messageTotal,
        page,
        pageSize,
        totalPages: Math.ceil(messageTotal / pageSize),
      },
      threads: threads.map((t) => ({
        id: t.id,
        tenantId: t.tenantId,
        sessionId: t.sessionId,
        customerId: t.customerId,
        subject: t.subject,
        status: t.status,
        assignedToId: t.assignedToId,
        assignedToName: t.assignedTo?.name || null,
        lastMessageAt: t.lastMessageAt.toISOString(),
        messageCount: t.messageCount,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('WhatsApp session detail error:', error);
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

    const session = await db.whatsAppSession.findFirst({ where: { id, tenantId } });
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.isBlocked !== undefined) data.isBlocked = body.isBlocked;
    if (body.state !== undefined) data.state = body.state;
    if (body.stateData !== undefined) data.stateData = body.stateData;

    const updated = await db.whatsAppSession.update({
      where: { id },
      data,
      include: { customer: { select: { name: true } } },
    });

    return NextResponse.json({
      id: updated.id,
      tenantId: updated.tenantId,
      configId: updated.configId,
      phoneNumber: updated.phoneNumber,
      customerId: updated.customerId,
      customerName: updated.customer?.name || null,
      state: updated.state,
      lastMessageAt: updated.lastMessageAt.toISOString(),
      messageCount: updated.messageCount,
      isActive: updated.isActive,
      isBlocked: updated.isBlocked,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('WhatsApp session update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const { id } = await params;

    const session = await db.whatsAppSession.findFirst({ where: { id, tenantId } });
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    await db.whatsAppSession.update({
      where: { id },
      data: { isActive: false, state: 'menu', stateData: null },
    });

    return NextResponse.json({ success: true, message: 'Session ended' });
  } catch (error) {
    console.error('WhatsApp session delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}