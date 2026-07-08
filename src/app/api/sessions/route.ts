import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry, getDbFriendlyMessage, getErrorHeaders } from '@/lib/db';
import { verifyAuth, generateSessionToken, generateRefreshToken } from '@/lib/auth';
import { randomUUID } from 'node:crypto';

export const dynamic = 'force-dynamic';

// ---- Helpers ----

function parseUserAgent(ua: string): { browser: string; os: string; deviceType: string } {
  // Device type
  let deviceType = 'desktop';
  if (/mobile|android(?!.*tablet)|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/tablet|ipad|android(?!.*mobile)|playbook|silk/i.test(ua)) {
    deviceType = 'tablet';
  }

  // Browser
  let browser = 'Unknown';
  const browserMatch =
    ua.match(/(firefox|seamonkey)\/([\d.]+)/i) ||
    ua.match(/(edg(?:e|a|ios)?)\/([\d.]+)/i) ||
    ua.match(/(opr|opera)\/([\d.]+)/i) ||
    ua.match(/(chrome|crios)\/([\d.]+)/i) ||
    ua.match(/(safari)\/([\d.]+)/i) ||
    ua.match(/(trident|msie)\/([\d.]+)/i);
  if (browserMatch) {
    const name = browserMatch[1].replace(/crios/i, 'Chrome').replace(/edg(?:e|a|ios)?/i, 'Edge');
    browser = `${name} ${browserMatch[2]}`;
  }

  // OS
  let os = 'Unknown';
  const osMatch =
    ua.match(/windows nt ([\d.]+)/i) ||
    ua.match(/mac os x ([\d_.]+)/i) ||
    ua.match(/android ([\d.]+)/i) ||
    ua.match(/iphone os ([\d_]+)/i) ||
    ua.match(/(linux|ubuntu|fedora|debian|centos)/i) ||
    ua.match(/(crOS)/i);
  if (osMatch) {
    os = osMatch[0].replace(/_/g, '.').replace(/windows nt 10.0/i, 'Windows 10').replace(/windows nt 6.3/i, 'Windows 8.1').replace(/windows nt 6.2/i, 'Windows 8').replace(/windows nt 6.1/i, 'Windows 7');
  }

  return { browser, os, deviceType };
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

// ---- POST: Create a new login session ----

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, tenantId, role, email } = auth.user;
    if (!userId || !tenantId) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      deviceName,
      deviceType: bodyDeviceType,
      browser: bodyBrowser,
      os: bodyOs,
      ipAddress: bodyIp,
      userAgent: bodyUA,
      authProvider = 'email',
      rememberMe = false,
    } = body;

    // Parse UA if not provided
    const rawUA = bodyUA || request.headers.get('user-agent') || '';
    const parsed = parseUserAgent(rawUA);

    const browser = bodyBrowser || parsed.browser;
    const os = bodyOs || parsed.os;
    const deviceType = bodyDeviceType || parsed.deviceType;
    const ipAddress = bodyIp || getClientIp(request);
    const userAgent = rawUA || 'unknown';

    // Generate session identifiers
    const sessionId = randomUUID();
    const refreshToken = generateRefreshToken();

    // Determine expiry
    const rememberDays = rememberMe ? 30 : 7;
    const expiresAt = new Date(Date.now() + rememberDays * 24 * 60 * 60 * 1000);
    const jwtExpiresIn = rememberMe ? '30d' : '7d';

    // Get session config for maxConcurrentSessions check
    const config = await withRetry(
      () =>
        db.sessionConfig.findUnique({
          where: { tenantId },
        }),
      { label: 'sessions-getConfig' }
    );

    const maxSessions = config?.maxConcurrentSessions ?? 5;

    if (maxSessions > 0) {
      // Count active sessions
      const activeCount = await withRetry(
        () =>
          db.loginSession.count({
            where: {
              userId,
              tenantId,
              isRevoked: false,
              expiresAt: { gt: new Date() },
            },
          }),
        { label: 'sessions-countActive' }
      );

      if (activeCount >= maxSessions) {
        // Revoke the oldest sessions
        const oldest = await withRetry(
          () =>
            db.loginSession.findMany({
              where: {
                userId,
                tenantId,
                isRevoked: false,
                expiresAt: { gt: new Date() },
              },
              select: { id: true, sessionId: true },
              orderBy: { createdAt: 'asc' },
              take: activeCount - maxSessions + 1,
            }),
          { label: 'sessions-findOldest' }
        );

        if (oldest.length > 0) {
          await withRetry(
            () =>
              db.loginSession.updateMany({
                where: { id: { in: oldest.map((s) => s.id) } },
                data: { isRevoked: true },
              }),
            { label: 'sessions-revokeOldest' }
          );
        }
      }
    }

    // Create the session record
    await withRetry(
      () =>
        db.loginSession.create({
          data: {
            tenantId,
            userId,
            sessionId,
            refreshToken,
            deviceName: deviceName || `${browser} on ${os}`,
            deviceType,
            browser,
            os,
            ipAddress,
            userAgent,
            authProvider,
            rememberMe,
            expiresAt,
          },
        }),
      { label: 'sessions-create' }
    );

    // Generate JWT with sessionId as jti
    const normalizedRole = (role as string).toLowerCase();
    const token = generateSessionToken(
      {
        userId,
        tenantId,
        role: normalizedRole,
        email,
        jti: sessionId,
      },
      jwtExpiresIn
    );

    // Audit log
    withRetry(
      () =>
        db.authAuditLog.create({
          data: {
            tenantId,
            userId,
            email: email as string,
            event: 'session_created',
            success: true,
            ipAddress,
            userAgent,
            device: deviceType,
            browser,
            metadata: JSON.stringify({
              sessionId,
              deviceType,
              browser,
              os,
              rememberMe,
              authProvider,
            }),
          },
        }),
      { label: 'sessions-auditLog' }
    ).catch(() => {});

    return NextResponse.json({
      token,
      sessionId,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: getDbFriendlyMessage(error) },
      { status: 500, headers: getErrorHeaders(error) }
    );
  }
}

// ---- GET: List active sessions for the authenticated user ----

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, tenantId, jti } = auth.user;
    if (!userId || !tenantId) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeRevoked = searchParams.get('includeRevoked') === 'true';

    const sessions = await withRetry(
      () =>
        db.loginSession.findMany({
          where: {
            userId,
            tenantId,
            ...(includeRevoked
              ? {}
              : { isRevoked: false, expiresAt: { gt: new Date() } }),
          },
          select: {
            id: true,
            sessionId: true,
            deviceName: true,
            deviceType: true,
            browser: true,
            os: true,
            ipAddress: true,
            authProvider: true,
            rememberMe: true,
            isRevoked: true,
            lastActivity: true,
            expiresAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
      { label: 'sessions-list' }
    );

    const result = sessions.map((s) => ({
      ...s,
      isCurrent: s.sessionId === jti,
      lastActivity: s.lastActivity.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
    }));

    return NextResponse.json({ sessions: result });
  } catch (error) {
    return NextResponse.json(
      { error: getDbFriendlyMessage(error) },
      { status: 500, headers: getErrorHeaders(error) }
    );
  }
}