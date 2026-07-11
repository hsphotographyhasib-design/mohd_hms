import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const auth = verifyRouteAuth(req, { feature: 'whatsapp' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const intent = searchParams.get('intent') || '';
    const language = searchParams.get('language') || '';
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 20));

    const where: Record<string, any> = {
      tenantId,
      aiIntent: { not: null },
    };

    if (search) {
      where.OR = [
        { phoneNumber: { contains: search } },
        { customer: { name: { contains: search } } },
      ];
    }
    if (intent && intent !== 'all') {
      where.aiIntent = intent;
    }
    if (language && language !== 'all') {
      where.aiDetectedLanguage = language;
    }

    const [sessions, total] = await Promise.all([
      db.whatsAppSession.findMany({
        where,
        orderBy: { lastMessageAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          phoneNumber: true,
          customer: { select: { name: true } },
          aiDetectedLanguage: true,
          aiIntent: true,
          aiConfidence: true,
          isActive: true,
          lastMessageAt: true,
          createdAt: true,
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { content: true, createdAt: true },
          },
          _count: { select: { messages: true } },
        },
      }),
      db.whatsAppSession.count({ where }),
    ]);

    const data = sessions.map((s) => ({
      id: s.id,
      sessionId: s.id,
      phoneNumber: s.phoneNumber,
      customerName: s.customer?.name,
      lastMessage: s.messages[0]?.content || '',
      language: s.aiDetectedLanguage || undefined,
      intent: s.aiIntent || undefined,
      confidence: s.aiConfidence || undefined,
      status: s.isActive ? 'active' : 'inactive',
      lastMessageAt: s.lastMessageAt.toISOString(),
      messageCount: s._count.messages,
    }));

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('[AI Conversations List]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}