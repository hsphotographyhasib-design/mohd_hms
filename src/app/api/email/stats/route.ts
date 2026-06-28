import { NextResponse } from 'next/server';
import { getEmailStats, getQueueStatus } from '@/lib/email-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/email/stats
 * Returns email statistics for the admin dashboard.
 */
export async function GET() {
  try {
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