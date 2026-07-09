import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry, getDbFriendlyMessage, getErrorHeaders } from '@/core/database/db';
import { verifyAuth } from '@/core/auth/auth-lib';

export const dynamic = 'force-dynamic';

// POST: Update lastActivity for the current session (light-weight heartbeat)
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return new NextResponse(null, { status: 200 });
    }

    const { jti, tenantId, userId } = auth.user;

    // If no jti (legacy token without session), silently succeed.
    // This is a best-effort ping — must never cause a logout.
    if (!jti || !tenantId || !userId) {
      return new NextResponse(null, { status: 200 });
    }

    // Fire-and-forget update — non-blocking
    withRetry(
      () =>
        db.loginSession.updateMany({
          where: {
            sessionId: jti as string,
            userId: userId as string,
            tenantId: tenantId as string,
            isRevoked: false,
          },
          data: { lastActivity: new Date() },
        }),
      { label: 'sessions-activity-update' }
    ).catch(() => {});

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    // Even on server error, return 200 — this is a background ping
    // and must never trigger a logout via the fetch interceptor.
    return new NextResponse(null, { status: 200 });
  }
}