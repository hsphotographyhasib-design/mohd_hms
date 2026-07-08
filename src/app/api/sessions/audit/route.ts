import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry, getDbFriendlyMessage, getErrorHeaders } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Session-related events to filter by
const SESSION_EVENTS = [
  'session_created',
  'session_revoked',
  'session_expired',
  'session_extended',
  'token_refreshed',
  'failed_refresh',
  'device_logged_out',
  'auto_logout',
] as const;

// GET: Paginated session audit logs (admin/super_admin only)
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, tenantId, role } = auth.user;
    if (!tenantId) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
    }

    const userRole = (role as string).toLowerCase();
    if (!['admin', 'super_admin'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Only admins can view audit logs' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filterUserId = searchParams.get('userId') || undefined;
    const event = searchParams.get('event') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50));
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {
      tenantId,
      event: { in: [...SESSION_EVENTS] },
    };

    if (filterUserId) {
      where.userId = filterUserId;
    }
    if (event && SESSION_EVENTS.includes(event as typeof SESSION_EVENTS[number])) {
      where.event = event;
    }

    const [logs, total] = await Promise.all([
      withRetry(
        () =>
          db.authAuditLog.findMany({
            where,
            select: {
              id: true,
              userId: true,
              email: true,
              event: true,
              success: true,
              ipAddress: true,
              userAgent: true,
              device: true,
              browser: true,
              metadata: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
          }),
        { label: 'sessions-audit-logs' }
      ),
      withRetry(
        () => db.authAuditLog.count({ where }),
        { label: 'sessions-audit-count' }
      ),
    ]);

    return NextResponse.json({
      logs: logs.map((log) => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
        createdAt: log.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: getDbFriendlyMessage(error) },
      { status: 500, headers: getErrorHeaders(error) }
    );
  }
}