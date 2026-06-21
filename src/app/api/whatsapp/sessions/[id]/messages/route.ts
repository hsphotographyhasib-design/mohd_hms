import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';

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
      select: { id: true, tenantId: true },
    });
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(req.nextUrl.searchParams.get('pageSize') || '50');
    const threadId = req.nextUrl.searchParams.get('threadId') || '';
    const direction = req.nextUrl.searchParams.get('direction') || '';
    const skip = (page - 1) * pageSize;

    const where: Prisma.WhatsAppMessageWhereInput = { sessionId: id, tenantId };
    if (threadId) where.threadId = threadId;
    if (direction) where.direction = direction;

    const [messages, total] = await Promise.all([
      db.whatsAppMessage.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      db.whatsAppMessage.count({ where }),
    ]);

    const data = messages.map((m) => ({
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
    }));

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('WhatsApp messages list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const userId = payload.userId as string;
    const { id } = await params;
    const body = await req.json();
    const { content, messageType, threadId } = body;

    if (!content && messageType !== 'image' && messageType !== 'video') {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    const session = await db.whatsAppSession.findFirst({
      where: { id, tenantId },
      include: { config: { select: { provider: true, isEnabled: true, openwaBaseUrl: true, openwaApiKey: true, phoneNumber: true } } },
    });
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.isBlocked) {
      return NextResponse.json({ error: 'Session is blocked' }, { status: 403 });
    }

    // Save outbound message
    const message = await db.whatsAppMessage.create({
      data: {
        tenantId,
        sessionId: id,
        threadId: threadId || null,
        direction: 'outbound',
        messageType: messageType || 'text',
        content: content || null,
        fromNumber: session.config.phoneNumber || null,
        toNumber: session.phoneNumber,
        status: 'sent',
        isFromBot: false,
        isTemplate: false,
      },
    });

    // Update session
    await db.whatsAppSession.update({
      where: { id },
      data: {
        lastMessageAt: new Date(),
        messageCount: { increment: 1 },
      },
    });

    // Update thread message count if thread provided
    if (threadId) {
      await db.conversationThread.update({
        where: { id: threadId },
        data: { lastMessageAt: new Date(), messageCount: { increment: 1 } },
      });
    }

    // Attempt to send via provider (fire and forget)
    if (session.config.isEnabled) {
      try {
        const providerBase = session.config.openwaBaseUrl;
        const apiKey = session.config.openwaApiKey;
        if (providerBase && apiKey) {
          const formattedNumber = session.phoneNumber.replace(/[^0-9]/g, '');
          const recipient = formattedNumber.startsWith('+') ? formattedNumber : `${formattedNumber}@s.whatsapp.net`;
          // Best-effort send — don't block the response
          fetch(`${providerBase}/api/sendTextMessage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': apiKey,
            },
            body: JSON.stringify({
              session: session.config.openwaSession || 'default',
              chatId: recipient,
              text: content,
            }),
          }).catch(() => { /* provider send failed, message still saved */ });
        }
      } catch {
        // Provider send error is non-blocking
      }
    }

    return NextResponse.json({
      id: message.id,
      tenantId: message.tenantId,
      sessionId: message.sessionId,
      threadId: message.threadId,
      direction: message.direction,
      messageType: message.messageType,
      content: message.content,
      fromNumber: message.fromNumber,
      toNumber: message.toNumber,
      status: message.status,
      isFromBot: message.isFromBot,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('WhatsApp send message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}