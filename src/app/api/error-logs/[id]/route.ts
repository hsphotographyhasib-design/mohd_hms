import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = verifyRouteAuth(request, { feature: 'error-logs' });
    if (auth.error) return auth.error;

    const { id } = await params;
    const item = await db.errorLog.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Error log not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ...item,
      createdAt: item.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('[ErrorLogs] Detail error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch error log' },
      { status: 500 },
    );
  }
}