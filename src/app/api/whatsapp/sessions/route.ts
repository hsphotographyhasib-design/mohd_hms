import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(req.nextUrl.searchParams.get('pageSize') || '20');
    const search = req.nextUrl.searchParams.get('search') || '';
    const status = req.nextUrl.searchParams.get('status') || '';
    const state = req.nextUrl.searchParams.get('state') || '';
    const skip = (page - 1) * pageSize;

    const where: Prisma.WhatsAppSessionWhereInput = { tenantId };

    if (search) {
      where.OR = [
        { phoneNumber: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { phone: { contains: search } } },
      ];
    }

    if (status === 'active') {
      where.isActive = true;
      where.isBlocked = false;
    } else if (status === 'blocked') {
      where.isBlocked = true;
    }

    if (state) {
      where.state = state;
    }

    const [items, total] = await Promise.all([
      db.whatsAppSession.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { lastMessageAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, phone: true, companyName: true } },
        },
      }),
      db.whatsAppSession.count({ where }),
    ]);

    // Get last message preview for each session
    const sessionIds = items.map((s) => s.id);
    const lastMessages = sessionIds.length > 0
      ? await db.whatsAppMessage.findMany({
          where: { sessionId: { in: sessionIds } },
          distinct: ['sessionId'],
          orderBy: { createdAt: 'desc' },
          select: { sessionId: true, content: true, messageType: true, createdAt: true },
        })
      : [];

    const lastMessageMap = new Map(lastMessages.map((m) => [m.sessionId, m]));

    const data = items.map((s) => {
      const lastMsg = lastMessageMap.get(s.id);
      return {
        id: s.id,
        tenantId: s.tenantId,
        configId: s.configId,
        phoneNumber: s.phoneNumber,
        customerId: s.customerId,
        customerName: s.customer?.name || null,
        customerPhone: s.customer?.phone || null,
        customerCompany: s.customer?.companyName || null,
        state: s.state,
        lastMessageAt: s.lastMessageAt.toISOString(),
        messageCount: s.messageCount,
        isActive: s.isActive,
        isBlocked: s.isBlocked,
        lastMessagePreview: lastMsg?.content || null,
        lastMessageType: lastMsg?.messageType || null,
        lastMessageTime: lastMsg?.createdAt?.toISOString() || null,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('WhatsApp sessions list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}