import { NextRequest, NextResponse } from 'next/server';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

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
    const auth = verifyRouteAuth(request, { feature: 'notifications' });
    if (auth.error) return auth.error;

    const { db } = await import('@/core/database/db');
    const count = await db.notification.count({
      where: { tenantId: auth.tenantId, userId: auth.userId, isRead: false },
    });
    return NextResponse.json({ count });
  } catch (error) {
    return NextResponse.json({ count: 0 });
  }
}