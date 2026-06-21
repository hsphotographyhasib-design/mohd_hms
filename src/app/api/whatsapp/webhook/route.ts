import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { processIncomingMessage } from '@/lib/whatsapp/conversation-engine';

// POST — Receive incoming WhatsApp message (no auth — external callback)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // === OpenWA format ===
    if (body.event === 'message' || body.type === 'message') {
      const msg = body.data || body;
      const from = msg.from || msg.chatId || '';
      const phoneNumber = from.replace(/@s\.whatsapp\.net/, '').replace(/@g\.us/, '').replace(/[^0-9+]/g, '');
      const content = msg.body || msg.text || '';
      const messageType = msg.type || 'text';
      const mediaUrl = msg.mediaUrl || msg.fileUrl || null;
      const mediaType = msg.mimetype || null;
      const caption = msg.caption || null;
      const providerMessageId = msg.id || msg.messageId || null;

      if (!phoneNumber || !content) {
        return NextResponse.json({ error: 'Missing from or content' }, { status: 400 });
      }

      await handleIncoming(phoneNumber, content, messageType, mediaUrl, mediaType, caption, providerMessageId, 'openwa');
      return NextResponse.json({ success: true });
    }

    // === Meta Cloud API format ===
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      if (!entry) return NextResponse.json({ success: true });

      const change = entry.changes?.[0];
      if (!change) return NextResponse.json({ success: true });

      const value = change.value;

      // Status updates
      if (value.statuses) {
        for (const status of value.statuses) {
          await handleDeliveryStatus(
            status.id,
            status.status, // sent, delivered, read, failed
            status.errors?.[0]?.message
          );
        }
        return NextResponse.json({ success: true });
      }

      // Incoming messages
      if (value.messages) {
        const phoneNumId = value.metadata?.phone_number_id || '';
        const msg = value.messages[0];
        if (!msg) return NextResponse.json({ success: true });

        const from = msg.from || '';
        const content = msg.text?.body || '';
        const msgType = msg.type || 'text';
        const media = msg[msgType];
        const mediaUrl = media?.url || null;
        const mediaType = media?.mime_type || null;
        const caption = media?.caption || null;
        const providerMessageId = msg.id || null;

        if (!from) {
          return NextResponse.json({ success: true });
        }

        // Handle media-only messages
        const textContent = content || caption || `[${msgType} message]`;

        await handleIncoming(from, textContent, msgType, mediaUrl, mediaType, caption, providerMessageId, 'meta');
        return NextResponse.json({ success: true });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('WhatsApp webhook POST error:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}

// GET — Meta webhook verification (no auth — external verification)
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode');
  const token = req.nextUrl.searchParams.get('hub.verify_token');
  const challenge = req.nextUrl.searchParams.get('hub.challenge');

  // Find tenant with matching verify token
  if (mode === 'subscribe' && token) {
    const config = await db.whatsAppConfig.findFirst({
      where: { metaVerifyToken: token },
    });

    if (config) {
      return new NextResponse(challenge || '', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

// === Internal helpers ===

async function handleIncoming(
  phoneNumber: string,
  content: string,
  messageType: string,
  mediaUrl: string | null,
  mediaType: string | null,
  caption: string | null,
  providerMessageId: string | null,
  provider: string
) {
  // Find or create WhatsApp config (use the first active one)
  // For multi-tenant, try to match phone to a config
  let config = await db.whatsAppConfig.findFirst({
    where: { isEnabled: true },
  });

  // If no config, try to get any config
  if (!config) {
    config = await db.whatsAppConfig.findFirst();
  }

  if (!config) {
    console.error('No WhatsApp config found — cannot process incoming message');
    return;
  }

  const tenantId = config.tenantId;

  // Normalize phone number
  const normalizedPhone = phoneNumber.replace(/[^0-9]/g, '');

  // Find or create session
  let session = await db.whatsAppSession.findFirst({
    where: { tenantId, phoneNumber: normalizedPhone },
  });

  if (!session) {
    // Auto-create customer by phone
    let customer = await db.customer.findFirst({
      where: { tenantId, phone: normalizedPhone },
    });

    if (!customer) {
      try {
        customer = await db.customer.create({
          data: {
            tenantId,
            name: `WhatsApp User ${normalizedPhone.slice(-4)}`,
            phone: normalizedPhone,
            customerNumber: `CUST-${Math.random().toString(36).toUpperCase().slice(2, 8)}`,
            isActive: true,
          },
        });
      } catch {
        // Race condition — try find again
        customer = await db.customer.findFirst({ where: { tenantId, phone: normalizedPhone } });
      }
    }

    session = await db.whatsAppSession.create({
      data: {
        tenantId,
        configId: config.id,
        phoneNumber: normalizedPhone,
        customerId: customer?.id || null,
        state: 'menu',
      },
    });
  }

  if (session.isBlocked) {
    return; // Don't process blocked sessions
  }

  // Save inbound message
  const savedMessage = await db.whatsAppMessage.create({
    data: {
      tenantId,
      sessionId: session.id,
      direction: 'inbound',
      messageType: messageType || 'text',
      content: content || null,
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || null,
      caption: caption || null,
      fromNumber: normalizedPhone,
      toNumber: config.phoneNumber || null,
      providerMessageId: providerMessageId || null,
      status: 'delivered',
      isFromBot: false,
      isTemplate: false,
    },
  });

  // Update session
  await db.whatsAppSession.update({
    where: { id: session.id },
    data: {
      lastMessageAt: new Date(),
      messageCount: { increment: 1 },
    },
  });

  // Process through conversation engine if auto-reply enabled
  if (config.autoReplyEnabled) {
    try {
      const responses = await processIncomingMessage(session, content, tenantId, providerMessageId);
      for (const response of responses) {
        await db.whatsAppMessage.create({
          data: {
            tenantId,
            sessionId: session.id,
            direction: 'outbound',
            messageType: response.messageType || 'text',
            content: response.content,
            isFromBot: true,
            isTemplate: response.isTemplate || false,
            fromNumber: config.phoneNumber || null,
            toNumber: normalizedPhone,
            status: 'sent',
          },
        });

        await db.whatsAppSession.update({
          where: { id: session.id },
          data: { messageCount: { increment: 1 } },
        });
      }
    } catch (engineError) {
      console.error('Conversation engine error:', engineError);
    }
  }
}

async function handleDeliveryStatus(
  providerMessageId: string,
  status: string,
  errorMessage?: string
) {
  if (!providerMessageId) return;

  const statusMap: Record<string, string> = {
    sent: 'sent',
    delivered: 'delivered',
    read: 'read',
    failed: 'failed',
  };

  const mappedStatus = statusMap[status] || 'sent';

  await db.whatsAppMessage.updateMany({
    where: { providerMessageId },
    data: {
      status: mappedStatus,
      errorMessage: errorMessage || null,
    },
  });
}