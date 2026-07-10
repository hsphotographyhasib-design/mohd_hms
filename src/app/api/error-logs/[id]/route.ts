import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyToken } from '@/core/auth/auth-lib';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const payload = verifyToken(token || '');
    if (!payload)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = (payload.role as string)?.toLowerCase();
    if (role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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