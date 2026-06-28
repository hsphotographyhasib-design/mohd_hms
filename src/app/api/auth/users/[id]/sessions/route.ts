import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// DELETE: Revoke all active sessions for a user (force logout)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const payload = verifyToken(authHeader.replace('Bearer ', ''));
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userRole = payload.role as string;
    if (!['admin', 'super_admin'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Find the target user
    const targetUser = await db.user.findUnique({
      where: { id, tenantId: payload.tenantId as string },
      select: { id: true, name: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Revoke all active sessions
    const result = await db.loginSession.updateMany({
      where: { userId: id, isRevoked: false },
      data: { isRevoked: true },
    });

    // Audit log
    try {
      await db.auditLog.create({
        data: {
          tenantId: payload.tenantId as string,
          userId: payload.userId as string,
          action: 'force_logout_user',
          entity: 'User',
          entityId: id,
          oldValue: JSON.stringify({ sessionsRevoked: 0 }),
          newValue: JSON.stringify({ sessionsRevoked: result.count }),
          ipAddress,
          userAgent,
          device: 'api',
        },
      });
    } catch {
      // Non-critical
    }

    return NextResponse.json({
      message: `Revoked ${result.count} session(s) for ${targetUser.name}`,
      sessionsRevoked: result.count,
    });
  } catch (error) {
    console.error('Revoke sessions error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}