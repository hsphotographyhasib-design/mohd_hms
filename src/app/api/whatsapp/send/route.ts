import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = payload.tenantId as string;
    const body = await req.json();

    const { phone, message, attachments, template, priority = 'normal' } = body as {
      phone: string;
      message: string;
      attachments?: Array<{ url: string; type: string; caption?: string }>;
      template?: string;
      priority?: 'low' | 'normal' | 'high';
    };

    if (!phone || !message) {
      return NextResponse.json({ error: 'phone and message are required' }, { status: 400 });
    }

    // Get config
    const config = await db.whatsAppConfig.findUnique({ where: { tenantId } });
    if (!config?.isEnabled) {
      return NextResponse.json({ error: 'WhatsApp is not enabled' }, { status: 400 });
    }

    const baseUrl = config.openwaBaseUrl || 'http://localhost:3001';
    const sessionName = config.openwaSession || 'default';

    // Normalize phone
    const normalizedPhone = phone.replace(/[^0-9]/g, '');
    const chatId = normalizedPhone.includes('@') ? normalizedPhone : `${normalizedPhone}@s.whatsapp.net`;

    // Find or create session
    let session = await db.whatsAppSession.findFirst({
      where: { tenantId, phoneNumber: normalizedPhone },
    });

    if (!session) {
      let customer = await db.customer.findFirst({
        where: { tenantId, phone: normalizedPhone },
      });
      if (!customer) {
        customer = await db.customer.create({
          data: {
            tenantId,
            name: `WhatsApp User ${normalizedPhone.slice(-4)}`,
            phone: normalizedPhone,
            customerNumber: `CUST-${Math.random().toString(36).toUpperCase().slice(2, 8)}`,
            isActive: true,
          },
        });
      }
      session = await db.whatsAppSession.create({
        data: {
          tenantId,
          configId: config.id,
          phoneNumber: normalizedPhone,
          customerId: customer?.id || null,
          state: 'chat',
        },
      });
    }

    // Save outbound message to DB
    const savedMessage = await db.whatsAppMessage.create({
      data: {
        tenantId,
        sessionId: session.id,
        direction: 'outbound',
        messageType: 'text',
        content: message,
        isFromBot: false,
        isTemplate: !!template,
        fromNumber: config.phoneNumber || null,
        toNumber: normalizedPhone,
        status: 'sent',
      },
    });

    // Send via OpenWA service
    let result: Record<string, unknown> = { success: false, error: 'Not attempted' };

    try {
      const res = await fetch(`${baseUrl}/api/sendTextMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: sessionName,
          chatId,
          text: message,
          options: { priority },
        }),
        signal: AbortSignal.timeout(30000),
      });
      result = await res.json() as Record<string, unknown>;
    } catch (err) {
      result = { success: false, error: err instanceof Error ? err.message : 'Service unreachable' };
    }

    // Update message status in DB
    const msgStatus = result.success ? 'sent' : 'failed';
    await db.whatsAppMessage.update({
      where: { id: savedMessage.id },
      data: {
        status: msgStatus,
        errorMessage: result.error as string || null,
        providerMessageId: result.id as string || null,
      },
    });

    // Update session
    await db.whatsAppSession.update({
      where: { id: session.id },
      data: { lastMessageAt: new Date(), messageCount: { increment: 1 } },
    });

    // Save delivery log
    await db.whatsAppDeliveryLog.create({
      data: {
        tenantId,
        messageId: savedMessage.id,
        sessionName,
        status: msgStatus,
        providerResponse: JSON.stringify(result),
        attempts: 1,
      },
    });

    return NextResponse.json({
      success: !!result.success,
      messageId: savedMessage.id,
      providerMessageId: result.id || null,
      error: result.error || null,
      status: msgStatus,
    });
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}