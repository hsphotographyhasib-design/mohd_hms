import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token is required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = verifyToken(token);

    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const userId = payload.userId as string;
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Revoke all login sessions for the user
    const { count } = await db.loginSession.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
      },
    });

    // Update user online status
    await db.user.update({
      where: { id: userId },
      data: { isOnline: false },
    });

    // Get user's tenantId for audit log
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { tenantId: true },
    });

    // Create audit log
    if (user) {
      try {
        await db.auditLog.create({
          data: {
            tenantId: user.tenantId,
            userId,
            action: 'logout',
            entity: 'LoginSession',
            details: JSON.stringify({ sessionsRevoked: count }),
            ipAddress,
            userAgent,
            device: 'api',
          },
        });
      } catch {
        // Non-critical
      }
    }

    return NextResponse.json({ success: true, sessionsRevoked: count });
  } catch (error) {
    console.error('Logout error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}