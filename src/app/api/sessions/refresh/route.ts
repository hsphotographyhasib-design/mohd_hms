import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry, getDbFriendlyMessage, getErrorHeaders } from '@/lib/db';
import { verifyAuth, generateSessionToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

// POST: Refresh the JWT token for the current session
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, tenantId, role, email, jti } = auth.user;
    if (!userId || !tenantId || !jti) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
    }

    const sessionId = jti as string;

    // Verify session exists, is not revoked, and not expired
    const session = await withRetry(
      () =>
        db.loginSession.findUnique({
          where: { sessionId },
          select: {
            id: true,
            sessionId: true,
            userId: true,
            tenantId: true,
            isRevoked: true,
            expiresAt: true,
            rememberMe: true,
          },
        }),
      { label: 'sessions-refresh-findSession' }
    );

    if (!session) {
      // Log failed refresh
      withRetry(
        () =>
          db.authAuditLog.create({
            data: {
              tenantId: tenantId as string,
              userId: userId as string,
              event: 'failed_refresh',
              success: false,
              ipAddress: getClientIp(request),
              userAgent: request.headers.get('user-agent') || 'unknown',
              metadata: JSON.stringify({ reason: 'session_not_found', sessionId }),
            },
          }),
        { label: 'sessions-refresh-auditFailed' }
      ).catch(() => {});

      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.isRevoked) {
      withRetry(
        () =>
          db.authAuditLog.create({
            data: {
              tenantId: tenantId as string,
              userId: userId as string,
              event: 'failed_refresh',
              success: false,
              ipAddress: getClientIp(request),
              userAgent: request.headers.get('user-agent') || 'unknown',
              metadata: JSON.stringify({ reason: 'session_revoked', sessionId }),
            },
          }),
        { label: 'sessions-refresh-auditRevoked' }
      ).catch(() => {});

      return NextResponse.json({ error: 'Session has been revoked' }, { status: 401 });
    }

    if (session.expiresAt <= new Date()) {
      // Mark as expired
      withRetry(
        () =>
          db.loginSession.update({
            where: { sessionId },
            data: { isRevoked: true },
          }),
        { label: 'sessions-refresh-markExpired' }
      ).catch(() => {});

      withRetry(
        () =>
          db.authAuditLog.create({
            data: {
              tenantId: tenantId as string,
              userId: userId as string,
              event: 'session_expired',
              success: false,
              ipAddress: getClientIp(request),
              userAgent: request.headers.get('user-agent') || 'unknown',
              metadata: JSON.stringify({ reason: 'session_expired', sessionId }),
            },
          }),
        { label: 'sessions-refresh-auditExpired' }
      ).catch(() => {});

      return NextResponse.json({ error: 'Session has expired' }, { status: 401 });
    }

    // Ownership check
    if (session.userId !== userId) {
      return NextResponse.json({ error: 'Session does not belong to this user' }, { status: 403 });
    }

    // Update last activity
    await withRetry(
      () =>
        db.loginSession.update({
          where: { sessionId },
          data: { lastActivity: new Date() },
        }),
      { label: 'sessions-refresh-updateActivity' }
    );

    // Generate new JWT with new expiry but same sessionId/jti
    const jwtExpiresIn = session.rememberMe ? '30d' : '7d';
    const normalizedRole = (role as string).toLowerCase();
    const newToken = generateSessionToken(
      {
        userId,
        tenantId,
        role: normalizedRole,
        email,
        jti: sessionId,
      },
      jwtExpiresIn
    );

    // Calculate when the new JWT will expire
    const now = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;
    const days = session.rememberMe ? 30 : 7;
    const newExpiresAt = new Date(now + days * msPerDay);

    // Audit log
    withRetry(
      () =>
        db.authAuditLog.create({
          data: {
            tenantId: tenantId as string,
            userId: userId as string,
            event: 'token_refreshed',
            success: true,
            ipAddress: getClientIp(request),
            userAgent: request.headers.get('user-agent') || 'unknown',
            metadata: JSON.stringify({ sessionId }),
          },
        }),
      { label: 'sessions-refresh-audit' }
    ).catch(() => {});

    return NextResponse.json({
      token: newToken,
      expiresAt: newExpiresAt.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: getDbFriendlyMessage(error) },
      { status: 500, headers: getErrorHeaders(error) }
    );
  }
}