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

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [
      totalSessions,
      activeSessions,
      totalMessages,
      messagesToday,
      inboundToday,
      outboundToday,
      unresolvedThreads,
      config,
      recentSessions,
      recentMessages,
    ] = await Promise.all([
      db.whatsAppSession.count({ where: { tenantId } }),
      db.whatsAppSession.count({ where: { tenantId, isActive: true, isBlocked: false } }),
      db.whatsAppMessage.count({ where: { tenantId } }),
      db.whatsAppMessage.count({ where: { tenantId, createdAt: { gte: todayStart } } }),
      db.whatsAppMessage.count({ where: { tenantId, direction: 'inbound', createdAt: { gte: todayStart } } }),
      db.whatsAppMessage.count({ where: { tenantId, direction: 'outbound', createdAt: { gte: todayStart } } }),
      db.conversationThread.count({ where: { tenantId, status: 'active' } }),
      db.whatsAppConfig.findUnique({ where: { tenantId } }),
      db.whatsAppSession.findMany({
        where: { tenantId },
        orderBy: { lastMessageAt: 'desc' },
        take: 5,
        include: { customer: { select: { name: true, phone: true } } },
      }),
      db.whatsAppMessage.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { session: { select: { phoneNumber: true, customer: { select: { name: true } } } } },
      }),
    ]);

    // Complaints created today via WhatsApp (check by source in description or title)
    const complaintsToday = await db.complaint.count({
      where: {
        tenantId,
        createdAt: { gte: todayStart },
        description: { contains: 'WhatsApp' },
      },
    });

    // Message trend for last 7 days
    const messageTrend = await db.whatsAppMessage.groupBy({
      by: ['createdAt', 'direction'],
      where: {
        tenantId,
        createdAt: { gte: sevenDaysAgo },
      },
      _count: { id: true },
    });

    const trendMap: Record<string, { date: string; inbound: number; outbound: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      trendMap[key] = { date: key, inbound: 0, outbound: 0 };
    }
    for (const msg of messageTrend) {
      const dateKey = msg.createdAt.toISOString().split('T')[0];
      if (trendMap[dateKey]) {
        if (msg.direction === 'inbound') trendMap[dateKey].inbound += msg._count.id;
        else trendMap[dateKey].outbound += msg._count.id;
      }
    }

    const trend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

    // Average response time (time between inbound and next outbound in same session, last 7 days)
    const recentMsgs = await db.whatsAppMessage.findMany({
      where: { tenantId, createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: 'asc' },
      select: { sessionId: true, direction: true, createdAt: true },
    });
    let avgResponseTime = 0;
    let responseCount = 0;
    let lastInboundTime: Date | null = null;
    for (const m of recentMsgs) {
      if (m.direction === 'inbound') {
        lastInboundTime = m.createdAt;
      } else if (m.direction === 'outbound' && lastInboundTime) {
        const diff = m.createdAt.getTime() - lastInboundTime.getTime();
        if (diff > 0 && diff < 3600000) { // Only count if < 1 hour
          avgResponseTime += diff;
          responseCount++;
        }
        lastInboundTime = null;
      }
    }
    avgResponseTime = responseCount > 0 ? Math.round(avgResponseTime / responseCount / 60000) : 0; // minutes

    const recentSessionsData = recentSessions.map((s) => ({
      id: s.id,
      tenantId: s.tenantId,
      configId: s.configId,
      phoneNumber: s.phoneNumber,
      customerId: s.customerId,
      customerName: s.customer?.name,
      state: s.state,
      lastMessageAt: s.lastMessageAt.toISOString(),
      messageCount: s.messageCount,
      isActive: s.isActive,
      isBlocked: s.isBlocked,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    const recentMessagesData = recentMessages.map((m) => ({
      id: m.id,
      tenantId: m.tenantId,
      sessionId: m.sessionId,
      direction: m.direction,
      messageType: m.messageType,
      content: m.content,
      status: m.status,
      isFromBot: m.isFromBot,
      createdAt: m.createdAt.toISOString(),
      customerName: m.session?.customer?.name,
      customerPhone: m.session?.phoneNumber,
    }));

    return NextResponse.json({
      totalSessions,
      activeSessions,
      totalMessages,
      messagesToday,
      inboundToday,
      outboundToday,
      complaintsViaWhatsapp: complaintsToday,
      avgResponseTime,
      unresolvedThreads,
      connectionStatus: config?.openwaStatus || 'disconnected',
      provider: config?.provider || 'openwa',
      recentSessions: recentSessionsData,
      recentMessages: recentMessagesData,
      messageTrend: trend,
    });
  } catch (error) {
    console.error('WhatsApp dashboard stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}