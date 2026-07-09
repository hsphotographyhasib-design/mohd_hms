import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * GET /api/notifications/unread-count
 * Proxy to Render backend.
 */
export async function GET(request: NextRequest) {
  if (BACKEND_URL) {
    try {
      const authHeader = request.headers.get('authorization') || '';
      const res = await fetch(`${BACKEND_URL}/api/notifications/unread-count`, {
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } catch (error) {
      console.error('Unread count proxy error:', error);
      return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
    }
  }

  // Local dev fallback
  try {
    const { db } = await import('@/core/database/db');
    const { verifyToken } = await import('@/core/auth/auth-lib');
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const count = await db.notification.count({
      where: { tenantId: payload.tenantId, userId: payload.userId, isRead: false },
    });
    return NextResponse.json({ count });
  } catch (error) {
    return NextResponse.json({ count: 0 });
  }
}