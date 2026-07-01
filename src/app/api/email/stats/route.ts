import { NextRequest, NextResponse } from 'next/server';
import { getEmailStats, getQueueStatus } from '@/lib/email-service';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/email/stats
 * Returns email statistics for the admin dashboard.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = process.env.DEFAULT_TENANT_ID || 'default';
    const [stats, queue] = await Promise.all([
      getEmailStats(tenantId),
      Promise.resolve(getQueueStatus()),
    ]);

    return NextResponse.json({ stats, queue, brevoConfigured: !!process.env.BREVO_API_KEY });
  } catch (err) {
    console.error('Email stats error:', err);
    return NextResponse.json({ error: 'Failed to fetch email stats' }, { status: 500 });
  }
}