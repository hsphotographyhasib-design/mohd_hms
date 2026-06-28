import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Find the login session by refresh token
    const session = await db.loginSession.findUnique({
      where: { refreshToken },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            tenantId: true,
            isActive: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    // Check if session is revoked
    if (session.isRevoked) {
      return NextResponse.json(
        { error: 'Refresh token has been revoked' },
        { status: 401 }
      );
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Refresh token has expired' },
        { status: 401 }
      );
    }

    // Check if user is still active
    if (!session.user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 403 }
      );
    }

    // Update session last activity
    await db.loginSession.update({
      where: { id: session.id },
      data: { lastActivity: new Date() },
    });

    // Generate new access token
    const accessToken = generateToken({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      role: session.user.role,
      email: session.user.email,
    });

    // Audit log
    try {
      await db.auditLog.create({
        data: {
          tenantId: session.tenantId,
          userId: session.userId,
          action: 'token_refresh',
          entity: 'LoginSession',
          entityId: session.id,
          ipAddress,
          userAgent,
          device: 'api',
        },
      });
    } catch {
      // Non-critical
    }

    return NextResponse.json({ accessToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}