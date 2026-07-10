import { NextRequest, NextResponse } from 'next/server';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * PATCH /api/notifications/read-all
 * Proxy to Render backend.
 */
export async function PATCH(request: NextRequest) {
  if (BACKEND_URL) {
    try {
      const authHeader = request.headers.get('authorization') || '';
      const res = await fetch(`${BACKEND_URL}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } catch (error) {
      console.error('Read-all proxy error:', error);
      return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
    }
  }

  // Local dev fallback
  try {
    const auth = verifyRouteAuth(request, { feature: 'notifications' });
    if (auth.error) return auth.error;

    const { db } = await import('@/core/database/db');
    const result = await db.notification.updateMany({
      where: { tenantId: auth.tenantId, userId: auth.userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return NextResponse.json({ markedRead: result.count });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to mark all as read' }, { status: 500 });
  }
}