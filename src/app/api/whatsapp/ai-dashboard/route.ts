import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;

    // Today's date range
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    // 1. Messages Today — count AI conversation logs today
    const messagesToday = await db.aiConversationLog.count({
      where: { tenantId, createdAt: { gte: todayStart } },
    });

    // Messages Yesterday
    const messagesYesterday = await db.aiConversationLog.count({
      where: {
        tenantId,
        createdAt: { gte: yesterdayStart, lt: todayStart },
      },
    });

    // 2. Complaints Created Today via AI
    const complaintsCreated = await db.aiConversationLog.count({
      where: {
        tenantId,
        actionTaken: 'complaint_created',
        createdAt: { gte: todayStart },
      },
    });

    // 3. Quotations Generated Today via AI
    const quotationsGenerated = await db.aiConversationLog.count({
      where: {
        tenantId,
        actionTaken: { in: ['quotation_initiated', 'quotation_created'] },
        createdAt: { gte: todayStart },
      },
    });

    // 4. Average Response Time
    const avgResult = await db.aiConversationLog.aggregate({
      where: {
        tenantId,
        responseTimeMs: { not: null },
        createdAt: { gte: todayStart },
      },
      _avg: { responseTimeMs: true },
    });
    const avgResponseTime = avgResult._avg.responseTimeMs || 0;

    // 5. Language Distribution
    const langRaw = await db.aiConversationLog.groupBy({
      by: ['detectedLanguage'],
      where: {
        tenantId,
        detectedLanguage: { not: null },
        createdAt: { gte: todayStart },
      },
      _count: { detectedLanguage: true },
    });

    const totalLang = langRaw.reduce((sum, item) => sum + item._count.detectedLanguage, 0);
    const languageDistribution = langRaw
      .filter((item) => item.detectedLanguage)
      .map((item) => ({
        language: item.detectedLanguage!,
        count: item._count.detectedLanguage,
        percentage: totalLang > 0 ? Math.round((item._count.detectedLanguage / totalLang) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // 6. AI Enabled status
    const config = await db.whatsAppConfig.findUnique({ where: { tenantId } });

    // 7. Recent Conversations — sessions with AI activity
    const recentSessions = await db.whatsAppSession.findMany({
      where: {
        tenantId,
        isActive: true,
        aiIntent: { not: null },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 10,
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
      },
    });

    // Get latest AI log response time for each session
    const sessionIds = recentSessions.map((s) => s.id);
    const latestLogs = sessionIds.length > 0
      ? await db.aiConversationLog.findMany({
          where: { tenantId, sessionId: { in: sessionIds } },
          orderBy: { createdAt: 'desc' },
          distinct: 'sessionId',
          select: {
            sessionId: true,
            responseTimeMs: true,
          },
        })
      : [];

    const logMap = new Map(latestLogs.map((l) => [l.sessionId, l.responseTimeMs]));

    const recentConversations = recentSessions.map((s) => ({
      id: s.id,
      sessionId: s.id,
      phoneNumber: s.phoneNumber,
      customerName: s.customer?.name,
      language: s.aiDetectedLanguage || undefined,
      intent: s.aiIntent || undefined,
      confidence: s.aiConfidence || undefined,
      responseTimeMs: logMap.get(s.id) || undefined,
      status: s.isActive ? 'active' : 'inactive',
      lastMessageAt: s.lastMessageAt.toISOString(),
    }));

    return NextResponse.json({
      messagesToday,
      messagesYesterday,
      complaintsCreated,
      quotationsGenerated,
      avgResponseTime,
      languageDistribution,
      aiEnabled: config?.aiEnabled ?? true,
      recentConversations,
    });
  } catch (error) {
    console.error('[AI Dashboard]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}