import { NextRequest, NextResponse } from 'next/server';
import { updateEmailStatus } from '@/lib/email-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/email/tracking
 * Webhook endpoint for Brevo delivery tracking.
 * Brevo sends events: delivered, opened, click, bounce, spam, etc.
 */
export async function POST(req: NextRequest) {
  try {
    const events = await req.json();

    // Brevo sends events as an array
    const eventList = Array.isArray(events) ? events : [events];

    for (const event of eventList) {
      const messageId = event.message_id || event.id;
      const eventType = event.event;

      if (!messageId || !eventType) continue;

      await updateEmailStatus(messageId, eventType, {
        email: event.email,
        ip: event.ip,
        useragent: event.user_agent,
        link: event.link,
        reason: event.reason,
      });
    }

    return NextResponse.json({ received: eventList.length });
  } catch (err) {
    console.error('Email tracking error:', err);
    return NextResponse.json({ error: 'Tracking webhook error' }, { status: 500 });
  }
}