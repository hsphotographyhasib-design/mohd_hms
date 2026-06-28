import { NextRequest, NextResponse } from 'next/server';
import { getEmailLogs } from '@/lib/email-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/email/logs?module=&status=&recipient=&templateName=&dateFrom=&dateTo=&page=&limit=
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = process.env.DEFAULT_TENANT_ID || 'default';

    const result = await getEmailLogs(tenantId, {
      module: searchParams.get('module') || undefined,
      status: searchParams.get('status') || undefined,
      recipient: searchParams.get('recipient') || undefined,
      templateName: searchParams.get('templateName') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '20', 10),
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('Email logs error:', err);
    return NextResponse.json({ error: 'Failed to fetch email logs' }, { status: 500 });
  }
}