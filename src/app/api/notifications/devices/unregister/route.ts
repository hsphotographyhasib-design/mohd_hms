import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/core/database/db';
import { verifyRouteAuth } from '@/core/middleware/api-auth';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * POST /api/notifications/devices/unregister
 *
 * Unregisters an FCM device token (on logout).
 * - Production: proxies to Render backend
 * - Local dev: deactivates directly in local Prisma DB
 */
export async function POST(request: NextRequest) {
  // If backend URL is configured, proxy to it
  if (BACKEND_URL) {
    try {
      const authHeader = request.headers.get('authorization') || '';
      const body = await request.json();
      const res = await fetch(`${BACKEND_URL}/api/notifications/devices/unregister`, {
        method: 'POST',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } catch {
      return NextResponse.json({ success: true });
    }
  }

  // ── Local dev: deactivate directly in Prisma ──
  try {
    const auth = verifyRouteAuth(request, { feature: 'notifications' });
    if (auth.error) {
      return NextResponse.json({ success: true }); // Don't fail logout
    }

    const body = await request.json();
    const { token: fcmToken } = body;

    if (fcmToken) {
      await db.deviceToken.updateMany({
        where: { token: fcmToken },
        data: { isActive: false },
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}