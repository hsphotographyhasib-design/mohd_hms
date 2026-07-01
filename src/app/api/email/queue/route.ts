import { NextRequest, NextResponse } from 'next/server';
import { retryFailedEmail, getQueueStatus } from '@/lib/email-service';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/email/queue — Queue status
 * POST /api/email/queue — Retry a failed email
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const status = getQueueStatus();
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch queue status' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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