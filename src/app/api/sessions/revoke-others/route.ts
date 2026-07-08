import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry, getDbFriendlyMessage, getErrorHeaders } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

// POST: Revoke all OTHER active sessions for the current user (keep current one)
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, tenantId, jti } = auth.user;
    if (!userId || !tenantId) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
    }

    const currentSessionId = jti as string;

    // Revoke all active sessions except the current one
    const result = await withRetry(
      () =>
        db.loginSession.updateMany({
          where: {
            userId: userId as string,
            tenantId: tenantId as string,
            isRevoked: false,
            expiresAt: { gt: new Date() },
            sessionId: { not: currentSessionId },
          },
          data: { isRevoked: true },
        }),
      { label: 'sessions-revokeOthers' }
    );

    // Audit log
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    withRetry(
      () =>
        db.authAuditLog.create({
          data: {
            tenantId: tenantId as string,
            userId: userId as string,
            event: 'device_logged_out',
            success: true,
            ipAddress,
            userAgent,
            metadata: JSON.stringify({
              currentSessionId,
              revokedCount: result.count,
            }),
          },
        }),
      { label: 'sessions-revokeOthers-audit' }
    ).catch(() => {});

    return NextResponse.json({ success: true, revokedCount: result.count });
  } catch (error) {
    return NextResponse.json(
      { error: getDbFriendlyMessage(error) },
      { status: 500, headers: getErrorHeaders(error) }
    );
  }
}