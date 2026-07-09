import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry, getDbFriendlyMessage, getErrorHeaders } from '@/core/database/db';
import { verifyAuth } from '@/core/auth/auth-lib';

export const dynamic = 'force-dynamic';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

// DELETE: Revoke a specific session by its DB id or sessionId (UUID)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, tenantId, role } = auth.user;
    const { id } = await params;

    // Find the session — match by id (cuid) or sessionId (UUID)
    const session = await withRetry(
      () =>
        db.loginSession.findFirst({
          where: {
            tenantId: tenantId as string,
            OR: [
              { id },
              { sessionId: id },
            ],
          },
          select: {
            id: true,
            sessionId: true,
            userId: true,
            deviceName: true,
            browser: true,
            os: true,
          },
        }),
      { label: 'sessions-delete-findSession' }
    );

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Authorization: same user OR admin/super_admin
    const userRole = (role as string).toLowerCase();
    if (session.userId !== userId && !['admin', 'super_admin'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Revoke
    await withRetry(
      () =>
        db.loginSession.update({
          where: { id: session.id },
          data: { isRevoked: true },
        }),
      { label: 'sessions-delete-revoke' }
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
            event: 'session_revoked',
            success: true,
            ipAddress,
            userAgent,
            device: session.deviceName || undefined,
            browser: session.browser || undefined,
            metadata: JSON.stringify({
              revokedSessionId: session.sessionId,
              targetUserId: session.userId,
            }),
          },
        }),
      { label: 'sessions-delete-audit' }
    ).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: getDbFriendlyMessage(error) },
      { status: 500, headers: getErrorHeaders(error) }
    );
  }
}