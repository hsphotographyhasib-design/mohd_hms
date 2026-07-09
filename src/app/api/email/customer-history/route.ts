import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyAuth } from '@/core/auth/auth-lib';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['super_admin', 'admin', 'supervisor', 'manager'] as const;

/**
 * GET /api/email/customer-history?customerId=...&page=1&limit=20
 * Get paginated email history for a specific customer.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { user } = auth;
    const tenantId = user.tenantId as string;
    const userRole = user.role as string;

    // RBAC check
    if (!ALLOWED_ROLES.includes(userRole as (typeof ALLOWED_ROLES)[number])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId')?.trim();
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10) || 20, 1), 100);

    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }

    const where = {
      tenantId,
      customerId,
    };

    const [logs, total] = await Promise.all([
      db.emailLog.findMany({
        where,
        select: {
          id: true,
          subject: true,
          sender: true,
          senderName: true,
          recipient: true,
          recipientName: true,
          cc: true,
          bcc: true,
          bodyHtml: true,
          bodyText: true,
          status: true,
          module: true,
          createdAt: true,
          sentAt: true,
          openedAt: true,
          deliveredAt: true,
          attachmentCount: true,
          priority: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.emailLog.count({ where }),
    ]);

    return NextResponse.json({
      logs: logs.map((l) => ({
        id: l.id,
        subject: l.subject,
        sender: l.sender,
        senderName: l.senderName,
        recipient: l.recipient,
        recipientName: l.recipientName,
        cc: l.cc,
        bcc: l.bcc,
        bodyHtml: l.bodyHtml,
        bodyText: l.bodyText,
        status: l.status,
        module: l.module,
        createdAt: l.createdAt.toISOString(),
        sentAt: l.sentAt?.toISOString() || null,
        openedAt: l.openedAt?.toISOString() || null,
        deliveredAt: l.deliveredAt?.toISOString() || null,
        attachmentCount: l.attachmentCount,
        priority: l.priority,
      })),
      total,
    });
  } catch (err) {
    console.error('[Email Customer History] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch customer email history' }, { status: 500 });
  }
}