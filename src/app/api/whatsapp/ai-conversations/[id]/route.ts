import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = verifyRouteAuth(req, { feature: 'whatsapp' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;
    const { id: sessionId } = await params;

    // Get session with customer
    const session = await db.whatsAppSession.findUnique({
      where: { id: sessionId, tenantId },
      select: {
        id: true,
        phoneNumber: true,
        customerId: true,
        aiDetectedLanguage: true,
        aiIntent: true,
        aiConfidence: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastMessageAt: true,
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            companyName: true,
            _count: {
              select: {
                equipment: true,
                complaints: {
                  where: {
                    status: { notIn: ['CLOSED', 'REWORK_REQUIRED'] },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get all messages for this session
    const messages = await db.whatsAppMessage.findMany({
      where: { sessionId, tenantId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        direction: true,
        messageType: true,
        content: true,
        mediaUrl: true,
        isFromBot: true,
        createdAt: true,
      },
    });

    // Get AI logs for this session (matched by createdAt proximity)
    const aiLogs = await db.aiConversationLog.findMany({
      where: { sessionId, tenantId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        userMessage: true,
        aiResponse: true,
        detectedIntent: true,
        detectedLanguage: true,
        confidence: true,
        responseTimeMs: true,
        createdAt: true,
      },
    });

    // Merge AI metadata into messages by pairing inbound message timestamps
    // Simple heuristic: pair each AI log with the closest preceding outbound message
    const messageWithMeta = messages.map((msg) => {
      const meta: {
        detectedIntent?: string;
        detectedLanguage?: string;
        confidence?: number;
        responseTimeMs?: number;
      } = {};

      if (msg.isFromBot && msg.direction === 'outbound') {
        // Find the closest AI log by createdAt
        const msgTime = msg.createdAt.getTime();
        let closestLog: typeof aiLogs[0] | null = null;
        let minDiff = Infinity;
        for (const log of aiLogs) {
          const diff = Math.abs(log.createdAt.getTime() - msgTime);
          if (diff < minDiff && diff < 10000) { // within 10 seconds
            minDiff = diff;
            closestLog = log;
          }
        }
        if (closestLog) {
          meta.detectedIntent = closestLog.detectedIntent || undefined;
          meta.detectedLanguage = closestLog.detectedLanguage || undefined;
          meta.confidence = closestLog.confidence || undefined;
          meta.responseTimeMs = closestLog.responseTimeMs || undefined;
        }
      }

      return {
        ...msg,
        ...meta,
      };
    });

    return NextResponse.json({
      session: {
        id: session.id,
        phoneNumber: session.phoneNumber,
        customerName: session.customer?.name,
        language: session.aiDetectedLanguage || undefined,
        intent: session.aiIntent || undefined,
        isActive: session.isActive,
        createdAt: session.createdAt.toISOString(),
      },
      customer: session.customer
        ? {
            id: session.customer.id,
            name: session.customer.name,
            phone: session.customer.phone,
            companyName: session.customer.companyName || undefined,
            equipmentCount: session.customer._count.equipment,
            openComplaints: session.customer._count.complaints,
          }
        : null,
      messages: messageWithMeta.map((m) => ({
        id: m.id,
        direction: m.direction,
        messageType: m.messageType,
        content: m.content,
        mediaUrl: m.mediaUrl,
        isFromBot: m.isFromBot,
        createdAt: m.createdAt.toISOString(),
        detectedIntent: m.detectedIntent,
        detectedLanguage: m.detectedLanguage,
        confidence: m.confidence,
        responseTimeMs: m.responseTimeMs,
      })),
    });
  } catch (error) {
    console.error('[AI Conversation Detail]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}