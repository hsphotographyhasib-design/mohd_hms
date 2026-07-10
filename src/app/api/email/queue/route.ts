import { NextRequest, NextResponse } from 'next/server';
import { retryFailedEmail, getQueueStatus } from '@/core/email/service';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/email/queue — Queue status
 * POST /api/email/queue — Retry a failed email
 */
export async function GET(request: NextRequest) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'email' });
    if (auth.error) return auth.error;
    const { userId, tenantId, role } = auth;

    const status = getQueueStatus();
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch queue status' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = verifyRouteAuth(req, { feature: 'email' });
    if (auth.error) return auth.error;

    const { logId } = await req.json();
    if (!logId) {
      return NextResponse.json({ error: 'logId is required' }, { status: 400 });
    }

    const tenantId = process.env.DEFAULT_TENANT_ID || 'default';
    const ok = await retryFailedEmail(tenantId, logId);
    if (!ok) {
      return NextResponse.json({ error: 'Email log not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, message: 'Email queued for retry' });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to retry email' }, { status: 500 });
  }
}